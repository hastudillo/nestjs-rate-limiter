import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';

import { BookDto } from './books/book.dto';
import { BookService } from './books/book.service';
import { RequestWeight } from './common/decorators/request-weight.decorator';
import { RateLimiterInterceptor } from './common/interceptors/rate-limiter.interceptor';
import { ParseObjectIdPipe } from './common/pipes/parse-objectid.pipe';

@ApiBasicAuth()
@UseInterceptors(RateLimiterInterceptor)
@Controller('private')
@ApiTags('private')
export class PrivateController {
  constructor(private readonly bookService: BookService) {}

  @RequestWeight(5)
  @Get('books')
  @ApiOperation({ summary: 'Request weight = 5' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [BookDto],
  })
  async getAll(): Promise<BookDto[]> {
    return this.bookService.getAll();
  }

  @Get('books/:bookId')
  @ApiOperation({ summary: 'Request weight = 1' })
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

  @Post('books')
  @ApiOperation({ summary: 'Request weight = 1' })
  @ApiBody({ type: BookDto, required: true })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: BookDto,
  })
  async insertOne(@Body() newBook: BookDto): Promise<BookDto> {
    return this.bookService.createOne(newBook);
  }
}
