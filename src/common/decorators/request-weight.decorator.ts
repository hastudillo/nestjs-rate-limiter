import { ReflectableDecorator, Reflector } from '@nestjs/core';

export const RequestWeight: ReflectableDecorator<number, number> =
  Reflector.createDecorator<number>();
