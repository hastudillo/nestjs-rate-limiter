import { Types } from 'mongoose';

import { BookDto } from './book.dto';

const objectIdMock: Types.ObjectId = new Types.ObjectId(
  '000000000000000000000000',
);

export const bookDtoMock: BookDto = {
  _id: objectIdMock,
  author: 'Melville, Herman',
  title: 'Moby-Dick; o La Ballena',
  city: 'Madrid',
  publisher: 'Akal',
  date: 2007,
  isbn: '978-84-460-2261-9',
};
