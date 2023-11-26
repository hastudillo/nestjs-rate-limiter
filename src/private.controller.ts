import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';

import { BookDto } from './books/book.dto';
import { BookService } from './books/book.service';
import { ParseObjectIdPipe } from './common/pipes/parse-objectid.pipe';

@ApiBasicAuth()
@ApiTags('private')
@Controller('private')
export class PrivateController {
  constructor(private readonly bookService: BookService) {}

  @Get('books')
  @ApiResponse({
    status: HttpStatus.OK,
    type: [BookDto],
  })
  async getAll(): Promise<BookDto[]> {
    return this.bookService.getAll();
  }

  @Get('book/:bookId')
  @ApiParam({
    name: 'bookId',
    required: true,
  })
  @ApiQuery({
    name: 'bookId',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BookDto,
  })
  async getOne(
    @Param('bookId', ParseObjectIdPipe) bookId: Types.ObjectId,
  ): Promise<BookDto | undefined> {
    return this.bookService.getOne(bookId);
  }

  @Post('book')
  @ApiBody({ type: BookDto, required: true })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: BookDto,
  })
  async insertOne(@Body() newBook: BookDto): Promise<BookDto> {
    return this.bookService.createOne(newBook);
  }
}
