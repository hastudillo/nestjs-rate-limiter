import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { PrivateController } from './private.controller';
import { PublicController } from './public.controller';

@Module({
  imports: [],
  controllers: [PrivateController, PublicController],
  providers: [AppService],
})
export class AppModule {}
