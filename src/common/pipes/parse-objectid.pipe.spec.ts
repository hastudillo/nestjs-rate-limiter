import { Types } from 'mongoose';

import { ParseObjectIdPipe } from './parse-objectid.pipe';
import { BadRequestException, Paramtype } from '@nestjs/common';

const objectIdMock: Types.ObjectId = new Types.ObjectId(
  '000000000000000000000000',
);
const metadataMock = {
  metatype: Types.ObjectId,
  type: 'param' as Paramtype,
  data: 'bookId',
};

describe('ParseObjectIdPipe', () => {
  const pipe: ParseObjectIdPipe = new ParseObjectIdPipe();

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should transform a valid MongoDB object id', async () => {
      const result = await pipe.transform(
        objectIdMock.toHexString(),
        metadataMock,
      );
      expect(result).toEqual(objectIdMock);
    });

    it('should fail while transforming a non valid correct MongoDB object id', async () => {
      expect(() => pipe.transform('whatever', metadataMock)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
