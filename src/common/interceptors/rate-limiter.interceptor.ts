import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpExceptionBody,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { RedisService } from '../../core/redis.service';
import { RequestWeight } from '../decorators/request-weight.decorator';
import { ConfigService } from '@nestjs/config';
import { EnvEnum } from '../env.enum';
import { customUserProperty, xForwardedForHeader } from '../constants';

@Injectable()
export class RateLimiterInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Limits the rate of requests following a Fixed Window algorithm
   * If the client is authenticated (private routes) the rate limit is different than for public routes
   * The request weight of an endpoint (by default 1) is get thanks to the RequestWeight decorator (via metadata)
   * @param req express Request
   * @param res express Response (not used)
   * @param next express NextFunction
   * @returns an exception (429 if rate limit reached) that bubbles up (or executes next function)
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any> | undefined> {
    try {
      this.redisService.createClient(
        this.configService.get<string>(EnvEnum.REDIS_URL),
      );
      await this.redisService.checkConnection();
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        'An error occurred when creating a connection to Redis',
      );
    }

    let req: Request;
    let requestWeight: number;
    let rateLimit: number;
    let clientId: string;
    let windowSize: number;
    let numberOfRequestsAfterIncr: number;
    try {
      req = context.switchToHttp().getRequest();
      requestWeight =
        this.reflector.get(RequestWeight, context.getHandler()) ?? 1;
      rateLimit = parseInt(this.getRateLimit(req));
      clientId = this.getClientId(req);
      windowSize = parseInt(
        this.configService.get<string>(EnvEnum.WINDOW_SIZE_IN_SECONDS),
      );
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `An error occurred when checking request, conext, env variables: ${err}`,
      );
    }

    try {
      numberOfRequestsAfterIncr =
        await this.redisService.incrementKeyWithTimeout(clientId, windowSize);
      this.logger.log(
        `Client ${clientId} - current value: ${numberOfRequestsAfterIncr}`,
      );
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `An error occurred when incrementing the key: ${err}`,
      );
    }

    const exceedsTheLimit: boolean =
      numberOfRequestsAfterIncr > rateLimit / requestWeight;
    if (exceedsTheLimit) {
      await this.raiseTooManyRequestsException(
        numberOfRequestsAfterIncr,
        windowSize,
        clientId,
      );
    }

    return next.handle();
  }

  private getClientId(req: Request): string {
    if (!!req[customUserProperty]) {
      return req[customUserProperty];
    }
    const ips: string | string[] | undefined =
      req.headers[xForwardedForHeader] ?? req.socket.remoteAddress;
    let ip: string | undefined;
    if (Array.isArray(ips)) {
      ip = ips[0].split(',').shift();
    } else {
      ip = ips?.split(',').shift();
    }
    if (!ip) {
      throw 'IP cannot be retrieved';
    }
    return ip;
  }

  private getRateLimit(req: Request): string {
    if (!!req[customUserProperty]) {
      return this.configService.get<string>(EnvEnum.RATE_LIMIT_BY_TOKEN);
    }
    return this.configService.get<string>(EnvEnum.RATE_LIMIT_BY_IP);
  }

  private async raiseTooManyRequestsException(
    numberOfRequestsAfterIncr: number,
    windowSize: number,
    clientId: string,
  ): Promise<void> {
    let ttl: number;
    if (numberOfRequestsAfterIncr === 1) {
      ttl = windowSize;
    } else {
      ttl = await this.redisService.getTtl(clientId);
    }
    const date: Date = new Date();
    date.setSeconds(date.getSeconds() + ttl);
    const httpExceptionBody: HttpExceptionBody = HttpException.createBody(
      'Too many requests',
      `Too many requests. Try again after ${ttl} seconds: ${date}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
    throw new HttpException(httpExceptionBody, HttpStatus.TOO_MANY_REQUESTS);
  }
}
