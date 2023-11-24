import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';

import {
  authorizationHeader,
  base64Encoding,
  customUserProperty,
  envFilePath,
} from '../common/constants';
import { EnvEnum } from '../common/env.enum';
import { BasicAuthMiddleware } from './basic-auth.middleware';
import { Logger } from '@nestjs/common';

const nextFunctionMock = jest.fn();
const base64Encoded: string = 'am9obkBleGFtcGxlLmNvbTphYmMxMjM=';
const userIdentified: string = Buffer.from(base64Encoded, base64Encoding)
  .toString()
  .split(':')
  .shift();

describe('BasicAuthMiddleware', () => {
  let middleware: BasicAuthMiddleware;
  let logger: Logger;
  let configService: ConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath,
        }),
      ],
      providers: [
        ConfigService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    configService = app.get<ConfigService>(ConfigService);
    logger = app.get<Logger>(Logger);
    middleware = new BasicAuthMiddleware(configService, logger);
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
    expect(logger).toBeDefined();
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should identify user', () => {
      const base64Encoded: string = 'am9obkBleGFtcGxlLmNvbTphYmMxMjM=';
      const requestMock = {
        headers: {
          [authorizationHeader]: `Basic ${base64Encoded}`,
        },
      };
      const spyOnGet = jest
        .spyOn(configService, 'get')
        .mockReturnValue(base64Encoded);
      middleware.use(
        requestMock as Request,
        {} as Response,
        nextFunctionMock as NextFunction,
      );
      expect(spyOnGet).toHaveBeenCalledWith(EnvEnum.AUTH_TOKEN);
      expect(nextFunctionMock).toHaveBeenCalledWith();
      expect(requestMock[customUserProperty]).toBe(userIdentified);
    });

    it('should throw error because there is no authorization header', () => {
      const requestMock = {
        headers: {},
      };
      const spyOnGet = jest.spyOn(configService, 'get');
      expect(() =>
        middleware.use(
          requestMock as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).toThrow();
      expect(spyOnGet).not.toHaveBeenCalled();
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should throw error because it is not Basic Auth', () => {
      const requestMock = {
        headers: {
          [authorizationHeader]: `NotBasic ${base64Encoded}`,
        },
      };
      const spyOnGet = jest.spyOn(configService, 'get');
      expect(() =>
        middleware.use(
          requestMock as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).toThrow();
      expect(spyOnGet).not.toHaveBeenCalled();
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should throw error because Basic Auth key is wrong', () => {
      const requestMock = {
        headers: {
          [authorizationHeader]: `Basic wrong`,
        },
      };
      const spyOnGet = jest
        .spyOn(configService, 'get')
        .mockReturnValue(base64Encoded);
      expect(() =>
        middleware.use(
          requestMock as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).toThrow();
      expect(spyOnGet).toHaveBeenCalledWith(EnvEnum.AUTH_TOKEN);
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });
  });
});
