import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { Types } from 'mongoose';

export class BookDto {
  @ApiProperty({ type: String, description: 'ObjectId', required: false })
  @Type(() => Types.ObjectId)
  @Transform(({ value }) => value.toHexString(), { toPlainOnly: true })
  _id?: Types.ObjectId;

  @ApiProperty({ type: String, required: true })
  author: string;

  @ApiProperty({ type: String, required: true })
  title: string;

  @ApiProperty({ type: String, required: false })
  city?: string;

  @ApiProperty({ type: String, required: true })
  publisher: string;

  @ApiProperty({ type: Number, required: true })
  date: number;

  @ApiProperty({ type: String, required: false })
  isbn?: string;
}
