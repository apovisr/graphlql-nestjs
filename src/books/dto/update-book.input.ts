import { InputType, PartialType } from '@nestjs/graphql';
import { CreateBookInput } from './create-book.input';

/** Mismos campos que CreateBookInput, todos opcionales (y con sus validaciones). */
@InputType()
export class UpdateBookInput extends PartialType(CreateBookInput) {}
