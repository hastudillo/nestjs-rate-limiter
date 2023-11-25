import {
  HttpException,
  HttpExceptionBody,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

import { customUserProperty, xForwardedForHeader } from '../common/constants';
import { EnvEnum } from '../common/env.enum';
import { RedisService } from './redis.service';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Limits the rate of requests following a Fixed Window algorithm
   * It has to be used after BasicAuthMiddleware
   * If the client is authenticated (private routes) the rate limit is different than for public routes
   * @param req express Request
   * @param res express Response (not used)
   * @param next express NextFunction
   * @returns an exception (429 if rate limit reached) that bubbles up (or executes next function)
   */
  async use(req: Request, _res: Response, next: NextFunction): Promise<any> {
    let rateLimit: number;
    let clientId: string;
    let windowSize: number;
    let numberOfRequestsAfterIncr: number;
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
    try {
      rateLimit = parseInt(this.getRateLimit(req));
      clientId = this.getClientId(req);
      windowSize = parseInt(
        this.configService.get<string>(EnvEnum.WINDOW_SIZE_IN_SECONDS),
      );
      numberOfRequestsAfterIncr =
        await this.redisService.incrementKeyWithTimeout(clientId, windowSize);
      this.logger.log(
        `Client ${clientId} - current value: ${numberOfRequestsAfterIncr}`,
      );
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `An error occurred when checking the request: ${err}`,
      );
    }
    if (numberOfRequestsAfterIncr > rateLimit) {
      let ttl: number;
      if (numberOfRequestsAfterIncr === 1) {
        ttl = windowSize;
      } else {
        ttl = await this.redisService.getTtl(clientId);
      }
      this.raiseTooManyRequestsException(ttl);
    }
    next();
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

  private raiseTooManyRequestsException(ttl: number): void {
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
