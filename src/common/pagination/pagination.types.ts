import type { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { OffsetPaginationArgs } from './pagination.args';

/** Genera el tipo `XPage { items, total, offset, limit, hasMore }`. */
export function OffsetPage<T>(itemType: Type<T>) {
  @ObjectType({ isAbstract: true })
  abstract class OffsetPageType {
    @Field(() => [itemType])
    items: T[];

    @Field(() => Int, {
      description: 'Total de elementos (requiere un COUNT extra)',
    })
    total: number;

    @Field(() => Int)
    offset: number;

    @Field(() => Int)
    limit: number;

    @Field()
    hasMore: boolean;
  }
  return OffsetPageType;
}

export function toOffsetPage<T>(
  items: T[],
  total: number,
  { offset, limit }: OffsetPaginationArgs,
) {
  return {
    items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
  };
}

@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field(() => String, { nullable: true })
  endCursor: string | null;
}

/** Genera los tipos `XEdge { cursor, node }` y `XConnection { edges, pageInfo }` (spec de Relay). */
export function Connection<T>(nodeType: Type<T>) {
  @ObjectType(`${nodeType.name}Edge`)
  abstract class EdgeType {
    @Field({ description: 'Cursor opaco que apunta a este elemento' })
    cursor: string;

    @Field(() => nodeType)
    node: T;
  }

  @ObjectType({ isAbstract: true })
  abstract class ConnectionType {
    @Field(() => [EdgeType])
    edges: EdgeType[];

    @Field(() => PageInfo)
    pageInfo: PageInfo;
  }
  return ConnectionType;
}
