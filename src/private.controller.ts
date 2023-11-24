import { Controller, Get } from '@nestjs/common';
import { ApiBasicAuth, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiBasicAuth()
@ApiTags('private')
@Controller('private')
export class PrivateController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
