import { Module } from '@nestjs/common';

import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { PrivateController } from './private.controller';
import { PublicController } from './public.controller';

@Module({
  imports: [CoreModule],
  controllers: [PrivateController, PublicController],
  providers: [AppService],
})
export class AppModule {}
