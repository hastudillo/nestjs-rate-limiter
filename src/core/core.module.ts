import { Global, Logger, MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { envFilePath } from '../common/constants';
import { PrivateController } from '../private.controller';
import { BasicAuthMiddleware } from './basic-auth.middleware';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
    }),
  ],
  providers: [ConfigService, Logger],
  exports: [ConfigService, Logger],
})
export class CoreModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BasicAuthMiddleware).forRoutes(PrivateController);
  }
}
