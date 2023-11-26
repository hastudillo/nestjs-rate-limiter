import { Global, Logger, MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, MongooseModuleFactoryOptions } from '@nestjs/mongoose';

import { envFilePath } from '../common/constants';
import { PrivateController } from '../private.controller';
import { BasicAuthMiddleware } from './basic-auth.middleware';
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
  exports: [ConfigService, Logger, RedisService],
})
export class CoreModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BasicAuthMiddleware).forRoutes(PrivateController);
  }
}
