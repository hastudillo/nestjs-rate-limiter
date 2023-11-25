import { Test, TestingModule } from '@nestjs/testing';
import * as redis from 'redis';

import { RedisService } from './redis.service';

const urlMock: string = 'redis://localhost:6379';
const redisClientMock = {
  connect: jest.fn(),
  INCR: jest.fn(),
  EXPIRE: jest.fn(),
  TTL: jest.fn(),
};

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = app.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createClient', () => {
    it('should return a client', () => {
      const result = service.createClient(urlMock);
      const client: redis.RedisClientType = redis.createClient({
        url: urlMock,
      });
      expect(result).toEqual(client);
    });
  });

  describe('checkConnection', () => {
    it('should create a connection', async () => {
      service.redisClient = redisClientMock as unknown as redis.RedisClientType;
      const spyOnConnect = jest.spyOn(redisClientMock, 'connect');
      service.checkConnection();
      expect(spyOnConnect).toHaveBeenCalledWith();
    });
  });

  describe('incrementKeyWithTimeout', () => {
    const keyMock: string = 'keyMock';
    const windowSizeMock: number = 3600;

    it('should increment an existing key', async () => {
      service.redisClient = redisClientMock as unknown as redis.RedisClientType;
      const value: number = 2;
      const spyOnIncrement = jest
        .spyOn(redisClientMock, 'INCR')
        .mockResolvedValue(value);
      const result = await service.incrementKeyWithTimeout(
        keyMock,
        windowSizeMock,
      );
      expect(result).toBe(value);
      expect(spyOnIncrement).toHaveBeenCalledWith(keyMock);
    });

    it('should increment a new key (or with previous value = 0)', async () => {
      service.redisClient = redisClientMock as unknown as redis.RedisClientType;
      const value: number = 1;
      const spyOnIncrement = jest
        .spyOn(redisClientMock, 'INCR')
        .mockResolvedValue(value);
      const spyOnExpire = jest.spyOn(redisClientMock, 'EXPIRE');
      const result = await service.incrementKeyWithTimeout(
        keyMock,
        windowSizeMock,
      );
      expect(result).toBe(value);
      expect(spyOnIncrement).toHaveBeenCalledWith(keyMock);
      expect(spyOnExpire).toHaveBeenCalledWith(keyMock, windowSizeMock);
    });
  });

  describe('getTtl', () => {
    const keyMock: string = 'keyMock';
    it('should get the time until expiration', async () => {
      const ttlMock: number = 0;
      service.redisClient = redisClientMock as unknown as redis.RedisClientType;
      const spyOnTtl = jest
        .spyOn(redisClientMock, 'TTL')
        .mockResolvedValue(ttlMock);
      const result = await service.getTtl(keyMock);
      expect(result).toBe(ttlMock);
      expect(spyOnTtl).toHaveBeenCalledWith(keyMock);
    });
  });
});
