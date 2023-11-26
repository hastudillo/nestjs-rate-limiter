import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { bookDtoMock } from './books/book.dto.mock';
import { BookService } from './books/book.service';
import { PublicController } from './public.controller';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RedisService } from './core/redis.service';

const objectIdMock: Types.ObjectId = new Types.ObjectId(
  '000000000000000000000000',
);

describe('PublicController', () => {
  let controller: PublicController;
  let service: BookService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [
        {
          provide: BookService,
          useValue: {
            getOne: jest.fn(),
          },
        },
        ConfigService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            createClient: jest.fn(),
            checkConnection: jest.fn(),
            incrementKeyWithTimeout: jest.fn(),
            getTtl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = app.get<PublicController>(PublicController);
    service = app.get<BookService>(BookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getOne', () => {
    it('should return a book given its id', async () => {
      const spyOnGetOne = jest
        .spyOn(service, 'getOne')
        .mockResolvedValue(bookDtoMock);
      const result = await controller.getOne(objectIdMock);
      expect(result).toEqual(bookDtoMock);
      expect(spyOnGetOne).toHaveBeenCalledWith(objectIdMock);
    });
  });
});
