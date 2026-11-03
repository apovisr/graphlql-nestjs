import { ArgsType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_NESTED_PAGE_SIZE = 10;
/** Ninguna lista devuelve más de esto: sin límite, una query puede traerse la BD entera. */
export const MAX_PAGE_SIZE = 100;

/** Paginación por offset: `LIMIT x OFFSET y`. Sencilla, pero con problemas (ver demo/05). */
@ArgsType()
export class OffsetPaginationArgs {
  @Field(() => Int, { defaultValue: 0 })
  @Min(0)
  offset: number;

  @Field(() => Int, { defaultValue: DEFAULT_PAGE_SIZE })
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number;
}

/** Paginación por cursor (estilo Relay): "dame `first` elementos después de `after`". */
@ArgsType()
export class ConnectionArgs {
  @Field(() => Int, { defaultValue: DEFAULT_PAGE_SIZE })
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  first: number;

  @Field(() => String, {
    nullable: true,
    description: 'Cursor opaco: el `endCursor` de la página anterior',
  })
  @IsOptional()
  @IsString()
  after?: string;
}

/** Límite para listas anidadas (author.books, book.reviews...). */
@ArgsType()
export class NestedListArgs {
  @Field(() => Int, { defaultValue: DEFAULT_NESTED_PAGE_SIZE })
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  first: number;
}
