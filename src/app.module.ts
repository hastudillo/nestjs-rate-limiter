import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Book, BookSchema } from './books/book.schema';
import { BookService } from './books/book.service';
import { CoreModule } from './core/core.module';
import { PrivateController } from './private.controller';
import { PublicController } from './public.controller';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
  ],
  controllers: [PrivateController, PublicController],
  providers: [BookService],
})
export class AppModule {}
