import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

@InputType()
export class AddReviewInput {
  @Field(() => ID)
  @Type(() => Number)
  @IsInt()
  bookId: number;

  @Field(() => ID)
  @Type(() => Number)
  @IsInt()
  readerId: number;

  @Field(() => Int, { description: 'De 1 a 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
