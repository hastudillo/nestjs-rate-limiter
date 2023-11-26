import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { bookDtoMock } from './books/book.dto.mock';
import { BookService } from './books/book.service';
import { PrivateController } from './private.controller';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RedisService } from './core/redis.service';

const objectIdMock: Types.ObjectId = new Types.ObjectId(
  '000000000000000000000000',
);

describe('PrivateController', () => {
  let controller: PrivateController;
  let service: BookService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PrivateController],
      providers: [
        {
          provide: BookService,
          useValue: {
            getAll: jest.fn(),
            getOne: jest.fn(),
            createOne: jest.fn(),
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

    controller = app.get<PrivateController>(PrivateController);
    service = app.get<BookService>(BookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all books', async () => {
      const spyOnGetAll = jest
        .spyOn(service, 'getAll')
        .mockResolvedValue([bookDtoMock]);
      const result = await controller.getAll();
      expect(result).toEqual([bookDtoMock]);
      expect(spyOnGetAll).toHaveBeenCalledWith();
    });
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

  describe('insertOne', () => {
    it('should return a book once created', async () => {
      const spyOnCreateOne = jest
        .spyOn(service, 'createOne')
        .mockResolvedValue(bookDtoMock);
      const result = await controller.insertOne(bookDtoMock);
      expect(result).toEqual(bookDtoMock);
      expect(spyOnCreateOne).toHaveBeenCalledWith(bookDtoMock);
    });
  });
});
