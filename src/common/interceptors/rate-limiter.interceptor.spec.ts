import {
  ExecutionContext,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { of } from 'rxjs';
import { RateLimiterInterceptor } from './rate-limiter.interceptor';
import { bookDtoMock } from '../../books/book.dto.mock';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from '../../core/redis.service';
import { Reflector } from '@nestjs/core';
import {
  customUserProperty,
  envFilePath,
  xForwardedForHeader,
} from '../constants';
import { Test, TestingModule } from '@nestjs/testing';

const nextMock = {
  handle: () => of(bookDtoMock),
};

describe('RateLimiterInterceptor', () => {
  let reflector: Reflector;
  let logger: Logger;
  let configService: ConfigService;
  let redisService: RedisService;
  let interceptor: RateLimiterInterceptor;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath,
        }),
      ],
      providers: [
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
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

    reflector = app.get<Reflector>(Reflector);
    configService = app.get<ConfigService>(ConfigService);
    logger = app.get<Logger>(Logger);
    redisService = app.get<RedisService>(RedisService);
    interceptor = new RateLimiterInterceptor(
      reflector,
      configService,
      logger,
      redisService,
    );
  });

  it('should be defined', () => {
    expect(reflector).toBeDefined();
    expect(logger).toBeDefined();
    expect(configService).toBeDefined();
    expect(redisService).toBeDefined();
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should identify client as authenticated user and successfully return', async () => {
      const authUser: string = 'john@example.com';
      const contextMock = {
        switchToHttp: () => ({
          getRequest: () => ({
            [customUserProperty]: authUser,
            headers: {},
          }),
        }),
        getHandler: () => undefined,
      };
      const spyOnReflectorGet = jest.spyOn(reflector, 'get');
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(1);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      const result = await interceptor.intercept(
        contextMock as ExecutionContext,
        nextMock,
      );
      result.subscribe({
        next: async (value) => {
          expect(value).toEqual(bookDtoMock);
          expect(spyOnReflectorGet).toHaveBeenCalled();
          expect(spyOnCreateClient).toHaveBeenCalledWith(
            'redis://localhost:6379',
          );
          await expect(spyOnCheckConnection).toHaveBeenCalledWith();
          await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
            authUser,
            3600,
          );
          await expect(spyOnGetTtl).not.toHaveBeenCalled();
        },
        error: (error) => {
          throw error;
        },
        complete: () => {},
      });
    });

    it('should identify client as IP and successfully return', async () => {
      const ipMock: string = '0.0.0.0';
      const contextMock = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              [xForwardedForHeader]: ipMock,
            },
          }),
        }),
        getHandler: () => undefined,
      };
      const spyOnReflectorGet = jest.spyOn(reflector, 'get');
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(1);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      const result = await interceptor.intercept(
        contextMock as ExecutionContext,
        nextMock,
      );

      result.subscribe({
        next: async (value) => {
          expect(value).toEqual(bookDtoMock);
          expect(spyOnReflectorGet).toHaveBeenCalled();
          expect(spyOnCreateClient).toHaveBeenCalledWith(
            'redis://localhost:6379',
          );
          await expect(spyOnCheckConnection).toHaveBeenCalledWith();
          await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
            ipMock,
            3600,
          );
          await expect(spyOnGetTtl).not.toHaveBeenCalled();
        },
        error: (error) => {
          throw error;
        },
        complete: () => {},
      });
    });

    it('should identify client as IP and fail because reached rate limit', async () => {
      const ipMock: string = '0.0.0.0';
      const contextMock = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              [xForwardedForHeader]: ipMock,
            },
          }),
        }),
        getHandler: () => undefined,
      };
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest
        .spyOn(redisService, 'incrementKeyWithTimeout')
        .mockResolvedValue(101);
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      expect(() =>
        interceptor.intercept(contextMock as ExecutionContext, nextMock),
      ).rejects.toThrow(HttpException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalledWith();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        ipMock,
        3600,
      );
      await expect(spyOnGetTtl).toHaveBeenCalled();
    });

    it('should fail when creating redis client or connection', async () => {
      const contextMock = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
        getHandler: () => undefined,
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
        interceptor.intercept(contextMock as ExecutionContext, nextMock),
      ).rejects.toThrow(InternalServerErrorException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).not.toHaveBeenCalled();
      await expect(spyOnIncrementKeyWithTimeout).not.toHaveBeenCalled();
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
    });

    it('should fail when getting context', async () => {
      const spyOnCreateClient = jest.spyOn(redisService, 'createClient');
      const spyOnCheckConnection = jest.spyOn(redisService, 'checkConnection');
      const spyOnIncrementKeyWithTimeout = jest.spyOn(
        redisService,
        'incrementKeyWithTimeout',
      );
      const spyOnGetTtl = jest.spyOn(redisService, 'getTtl');

      expect(() =>
        interceptor.intercept({} as ExecutionContext, nextMock),
      ).rejects.toThrow(InternalServerErrorException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalled();
      await expect(spyOnIncrementKeyWithTimeout).not.toHaveBeenCalled();
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
    });

    it('should fail when incrementing key', async () => {
      const ipMock: string = '0.0.0.0';
      const contextMock = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              [xForwardedForHeader]: ipMock,
            },
          }),
        }),
        getHandler: () => undefined,
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
        interceptor.intercept(contextMock as ExecutionContext, nextMock),
      ).rejects.toThrow(InternalServerErrorException);

      expect(spyOnCreateClient).toHaveBeenCalledWith('redis://localhost:6379');
      await expect(spyOnCheckConnection).toHaveBeenCalled();
      await expect(spyOnIncrementKeyWithTimeout).toHaveBeenCalledWith(
        ipMock,
        3600,
      );
      await expect(spyOnGetTtl).not.toHaveBeenCalled();
    });
  });
});
