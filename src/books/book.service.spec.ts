import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { bookDtoMock } from './book.dto.mock';
import { Book } from './book.schema';
import { BookService } from './book.service';

const objectIdMock: Types.ObjectId = new Types.ObjectId(
  '000000000000000000000000',
);
const bookModelMock = {
  find: jest.fn(() => bookModelMock),
  findById: jest.fn(() => bookModelMock),
  create: jest.fn(() => bookModelMock),
  lean: jest.fn(() => bookModelMock),
};

describe('BookService', () => {
  let service: BookService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [
        BookService,
        {
          provide: getModelToken(Book.name),
          useValue: bookModelMock,
        },
      ],
    }).compile();

    service = app.get<BookService>(BookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all documents', async () => {
      const spyOnFind = jest.spyOn(bookModelMock, 'find');
      const spyOnLean = jest
        .spyOn(bookModelMock, 'lean')
        .mockImplementation(() => [bookDtoMock]);
      const result = await service.getOne(objectIdMock);
      expect(result).toEqual([bookDtoMock]);
      expect(spyOnFind).toHaveBeenCalledWith(objectIdMock);
      expect(spyOnLean).toHaveBeenCalledWith();
    });
  });

  describe('getOne', () => {
    it('should return a document found by id', async () => {
      const spyOnFindById = jest.spyOn(bookModelMock, 'findById');
      const spyOnLean = jest
        .spyOn(bookModelMock, 'lean')
        .mockImplementation(() => bookDtoMock);
      const result = await service.getOne(objectIdMock);
      expect(result).toEqual(bookDtoMock);
      expect(spyOnFindById).toHaveBeenCalledWith(objectIdMock);
      expect(spyOnLean).toHaveBeenCalledWith();
    });
  });

  describe('createOne', () => {
    it('should create a document and return it', async () => {
      const spyOnCreate = jest
        .spyOn(bookModelMock, 'create')
        .mockImplementation(() => bookDtoMock);
      const result = await service.createOne(bookDtoMock);
      expect(result._id).toEqual(bookDtoMock._id);
      expect(spyOnCreate).toHaveBeenCalledWith(bookDtoMock);
    });
  });
});
