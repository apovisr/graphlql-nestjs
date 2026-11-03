import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

@InputType({
  description: 'Todos los criterios son opcionales y se combinan con AND',
})
export class BookFilterInput {
  @Field(() => String, {
    nullable: true,
    description: 'Texto contenido en el título',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  search?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  authorId?: number;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  genreId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  publishedAfter?: number;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Solo libros con ejemplares libres',
  })
  @IsOptional()
  @IsBoolean()
  onlyAvailable?: boolean;
}
