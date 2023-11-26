import { Global, Logger, MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleFactoryOptions } from '@nestjs/mongoose';

import { envFilePath } from '../common/constants';
import { PrivateController } from '../private.controller';
import { PublicController } from '../public.controller';
import { BasicAuthMiddleware } from './basic-auth.middleware';
import { RateLimiterMiddleware } from './rate-limiter.middleware';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (): Promise<MongooseModuleFactoryOptions> => {
        return {
          uri: process.env.MONGO_URL,
          serverSelectionTimeoutMS: 5000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [ConfigService, Logger, RedisService],
  exports: [ConfigService, Logger],
})
export class CoreModule {
  configure(consumer: MiddlewareConsumer) {
    // mind the order: first we need to identify the user in order to apply the correct rate
    consumer
      .apply(BasicAuthMiddleware)
      .forRoutes(PrivateController)
      .apply(RateLimiterMiddleware)
      .forRoutes(PublicController, PrivateController);
  }
}
