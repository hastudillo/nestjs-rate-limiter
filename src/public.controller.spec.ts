import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';
import { PublicController } from './public.controller';

describe('PublicController', () => {
  let controller: PublicController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [AppService],
    }).compile();

    controller = app.get<PublicController>(PublicController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });
});
