import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { BookDto } from './book.dto';
import { Book, BookDocument } from './book.schema';

@Injectable()
export class BookService {
  constructor(@InjectModel(Book.name) private bookModel: Model<BookDocument>) {}

  async getOne(id: Types.ObjectId): Promise<BookDto | undefined> {
    return this.bookModel.findById(id).lean();
  }

  async getAll(): Promise<BookDto[]> {
    return this.bookModel.find().lean();
  }

  async createOne(book: BookDto): Promise<BookDto> {
    return this.bookModel.create(book);
  }
}
