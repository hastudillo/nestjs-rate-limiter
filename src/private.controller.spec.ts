import { Test, TestingModule } from '@nestjs/testing';

import { AppService } from './app.service';
import { PrivateController } from './private.controller';

describe('PrivateController', () => {
  let controller: PrivateController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PrivateController],
      providers: [AppService],
    }).compile();

    controller = app.get<PrivateController>(PrivateController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });
});
