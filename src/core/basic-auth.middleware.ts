import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

import {
  authorizationHeader,
  base64Encoding,
  basicAuthPrefix,
  customUserProperty,
} from '../common/constants';
import { EnvEnum } from '../common/env.enum';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  /**
   * Determines whether a given request will be handled by the route handler or not
   * It accepts a Basic Auth in the authorization header of the request, checks the base64 string against the excepted one (env variable AUTH_TOKEN)
   * It decodes the base64 string in order to identify the user (saved as a property in the request)
   * ! TODO: why not a Guard?
   * @param req express Request
   * @param _res express Response (not used)
   * @param next express NextFunction
   * @throws an exception that bubbles up
   */
  use(req: Request, _res: Response, next: NextFunction): void {
    try {
      const authHeader: string = req.headers[authorizationHeader] ?? '';
      const [basic, b64auth]: string[] = authHeader.split(' ');
      if (
        basic !== basicAuthPrefix ||
        b64auth !== this.configService.get<string>(EnvEnum.AUTH_TOKEN)
      ) {
        throw new UnauthorizedException(
          'Unauthorized. Check your basic authentication',
        );
      }
      const [user]: string[] = Buffer.from(b64auth, base64Encoding)
        .toString()
        .split(':');
      req[customUserProperty] = user;
      this.logger.log(`User is authenticated as ${req[customUserProperty]}`);
    } catch (err: unknown) {
      this.logger.error(
        `An error occurred when checking the authentication of the request: ${err}`,
      );
      throw err;
    }
    next();
  }
}
