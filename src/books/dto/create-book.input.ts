import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class CreateBookInput {
  @Field()
  @IsString()
  @Length(1, 200)
  title: string;

  @Field({ description: 'ISBN-10 o ISBN-13, con o sin guiones' })
  @Matches(/^[0-9-]{10,17}X?$/, { message: 'isbn no tiene un formato válido' })
  isbn: string;

  @Field(() => Int)
  @IsInt()
  @Min(1400)
  @Max(new Date().getFullYear())
  publishedYear: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  pages: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsInt()
  @Min(1)
  @Max(50)
  totalCopies: number;

  @Field(() => ID)
  @Type(() => Number)
  @IsInt()
  authorId: number;

  @Field(() => [ID])
  @Type(() => Number)
  @IsInt({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  genreIds: number[];
}
