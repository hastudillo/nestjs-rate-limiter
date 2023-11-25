import { Injectable } from '@nestjs/common';
import * as redis from 'redis';

@Injectable()
export class RedisService {
  redisClient: redis.RedisClientType;

  createClient(url: string): redis.RedisClientType {
    this.redisClient = redis.createClient({
      url,
    });
    return this.redisClient;
  }

  async checkConnection(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  async incrementKeyWithTimeout(
    key: string,
    windowSize: number,
  ): Promise<number> {
    const numberOfRequestsAfterIncr: number = await this.redisClient.INCR(key);
    if (numberOfRequestsAfterIncr === 1) {
      await this.redisClient.EXPIRE(key, windowSize);
    }
    return numberOfRequestsAfterIncr;
  }

  async getTtl(key: string): Promise<number> {
    return this.redisClient.TTL(key);
  }
}
