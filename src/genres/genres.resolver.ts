import {
  Args,
  Context,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/book.entity';
import { paginatedComplexity } from '../common/graphql/complexity';
import { NestedListArgs } from '../common/pagination/pagination.args';
import type { Loaders } from '../loaders/loaders';
import { Genre } from './genre.entity';

@Resolver(() => Genre)
export class GenresResolver {
  constructor(
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  @Query(() => [Genre], {
    description: 'Todos los géneros (son pocos: no se paginan)',
  })
  genres(): Promise<Genre[]> {
    return this.genreRepository.find({ order: { name: 'ASC' } });
  }

  @ResolveField(() => [Book], {
    description: 'Libros más recientes del género',
    complexity: paginatedComplexity,
  })
  books(
    @Parent() genre: Genre,
    @Args() { first }: NestedListArgs,
    @Context('loaders') loaders: Loaders,
  ): Promise<Book[]> {
    return loaders.booksByGenreId(first).load(genre.id);
  }
}
