import {
  Controller,
  Get,
  HttpStatus,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Types } from 'mongoose';

import { BookDto } from './books/book.dto';
import { BookService } from './books/book.service';
import { ParseObjectIdPipe } from './common/pipes/parse-objectid.pipe';
import { RateLimiterInterceptor } from './common/interceptors/rate-limiter.interceptor';

@UseInterceptors(RateLimiterInterceptor)
@Controller('public')
@ApiTags('public')
export class PublicController {
  constructor(private readonly bookService: BookService) {}

  @Get('books/:bookId')
  @ApiOperation({ summary: 'Request weight = 1' })
  @ApiParam({
    name: 'bookId',
    required: true,
  })
  @ApiQuery({
    name: 'bookId',
    required: true,
    description: 'bookId',
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
}
