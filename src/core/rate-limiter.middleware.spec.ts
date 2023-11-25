import {
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';

import {
  customUserProperty,
  envFilePath,
  xForwardedForHeader,
} from '../common/constants';
import { RateLimiterMiddleware } from './rate-limiter.middleware';
import { RedisService } from './redis.service';

const nextFunctionMock = jest.fn();

describe('RateLimiterMiddleware', () => {
  let middleware: RateLimiterMiddleware;
  let logger: Logger;
  let configService: ConfigService;
  let redisService: RedisService;

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
          },
        },
        {
          provide: RedisService,
          useValue: {
            createClient: jest.fn(),
            checkConnection: jest.fn(),
            incrementKeyWithTimeout: jest.fn(),
            getTtl: jest.fn(),
          },
        },
      ],
    }).compile();

    configService = app.get<ConfigService>(ConfigService);
    logger = app.get<Logger>(Logger);
    redisService = app.get<RedisService>(RedisService);
    middleware = new RateLimiterMiddleware(configService, logger, redisService);
  });

  it('should be defined', () => {
    expect(configService).toBeDefined();
    expect(logger).toBeDefined();
    expect(redisService).toBeDefined();
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should identify client as authenticated user, open redis connection, increment key', async () => {
      const authUser: string = 'john@example.com';
      const requestMock = {
        [customUserProperty]: authUser,
        headers: {},
      };
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(1);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      middleware.use(
        requestMock as unknown as Request,
        {} as Response,
        nextFunctionMock as NextFunction,
      );

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalledWith();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        authUser,
        3600,
      );
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should identify client as authenticated user, open redis connection, increment key and fail because reached rate limit', async () => {
      const authUser: string = 'john@example.com';
      const requestMock = {
        [customUserProperty]: authUser,
        headers: {},
      };
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(201);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      expect(() =>
        middleware.use(
          requestMock as unknown as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).rejects.toThrow(HttpException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalledWith();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        authUser,
        3600,
      );
      await expect(spyOnGetTtl).toHaveBeenCalledWith(authUser);
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should identify client as IP, open redis connection, increment key', async () => {
      const ipMock: string = '0.0.0.0';
      const requestMock = {
        headers: {
          [xForwardedForHeader]: ipMock,
        },
      };
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(1);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      middleware.use(
        requestMock as unknown as Request,
        {} as Response,
        nextFunctionMock as NextFunction,
      );

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalledWith();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        ipMock,
        3600,
      );
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should identify client as IP, open redis connection, increment key and fail because reached rate limit', async () => {
      const ipMock: string = '0.0.0.0';
      const requestMock = {
        headers: {
          [xForwardedForHeader]: ipMock,
        },
      };
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(101);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      expect(() =>
        middleware.use(
          requestMock as unknown as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).rejects.toThrow(HttpException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalledWith();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        ipMock,
        3600,
      );
      await expect(spyOnGetTtl).toHaveBeenCalledWith(ipMock);
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should fail when creating redis client or connection', async () => {
      const requestMock = {
        headers: {},
      };
      const spyOnCreateClient = jest
        .spyOn(redisService, 'createClient')
        .mockImplementation(() => {
          throw new Error();
        });
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest.spyOn(
        redisService,
        'incrementKeyWithTimeout',
      );
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');
      expect(() =>
        middleware.use(
          requestMock as unknown as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).not.toHaveBeenCalled();
      await expect(spyOnIncrementKeyWithTimeout).not.toHaveBeenCalled();
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });

    it('should fail when incrementing key', async () => {
      const ipMock: string = '0.0.0.0';
      const requestMock = {
        headers: {
          [xForwardedForHeader]: ipMock,
        },
      };
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockImplementation(() => {
          throw new Error();
        });
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');
      expect(() =>
        middleware.use(
          requestMock as unknown as Request,
          {} as Response,
          nextFunctionMock as NextFunction,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalled();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        ipMock,
        3600,
      );
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
      expect(nextFunctionMock).toHaveBeenCalledWith();
    });
  });
});
