import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform {
  async transform(
    value: string,
    metadata: ArgumentMetadata,
  ): Promise<Types.ObjectId> {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Not a valid ObjectId: ${metadata.data}`);
    }
    return new Types.ObjectId(value);
  }
}
