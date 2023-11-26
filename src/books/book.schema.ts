import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookDocument = HydratedDocument<Book>;

@Schema()
export class Book {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true })
  author: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  city?: string;

  @Prop({ type: String, required: true })
  publisher: string;

  @Prop({ type: Number, required: true })
  date: number;

  @Prop({ type: String, required: false })
  isbn?: string;
}

export const BookSchema = SchemaFactory.createForClass(Book);
