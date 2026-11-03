import { ParseIntPipe } from '@nestjs/common';
import {
  Args,
  Context,
  Float,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Author } from '../authors/author.entity';
import { paginatedComplexity } from '../common/graphql/complexity';
import {
  ConnectionArgs,
  NestedListArgs,
  OffsetPaginationArgs,
} from '../common/pagination/pagination.args';
import { Genre } from '../genres/genre.entity';
import { Loan } from '../loans/loan.entity';
import type { Loaders } from '../loaders/loaders';
import { Review } from '../reviews/review.entity';
import { Book } from './book.entity';
import { BooksService } from './books.service';
import { BookFilterInput } from './dto/book-filter.input';
import { BookConnection, BookPage } from './dto/book-pagination.types';
import { CreateBookInput } from './dto/create-book.input';
import { UpdateBookInput } from './dto/update-book.input';

@Resolver(() => Book)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  // ---------- Queries ----------

  @Query(() => BookPage, {
    description: 'Libros paginados por OFFSET (más recientes primero)',
    complexity: paginatedComplexity,
  })
  books(
    @Args() pagination: OffsetPaginationArgs,
    @Args('filter', { nullable: true }) filter?: BookFilterInput,
  ): Promise<BookPage> {
    return this.booksService.findPage(filter, pagination);
  }

  @Query(() => BookConnection, {
    description: 'Libros paginados por CURSOR (más recientes primero)',
    complexity: paginatedComplexity,
  })
  booksConnection(
    @Args() pagination: ConnectionArgs,
    @Args('filter', { nullable: true }) filter?: BookFilterInput,
  ): Promise<BookConnection> {
    return this.booksService.findConnection(filter, pagination);
  }

  @Query(() => Book, { nullable: true })
  book(@Args('id', { type: () => ID }, ParseIntPipe) id: number) {
    return this.booksService.findById(id);
  }

  // ---------- Mutations ----------

  @Mutation(() => Book)
  createBook(@Args('input') input: CreateBookInput): Promise<Book> {
    return this.booksService.create(input);
  }

  @Mutation(() => Book)
  updateBook(
    @Args('id', { type: () => ID }, ParseIntPipe) id: number,
    @Args('input') input: UpdateBookInput,
  ): Promise<Book> {
    return this.booksService.update(id, input);
  }

  @Mutation(() => Boolean)
  deleteBook(
    @Args('id', { type: () => ID }, ParseIntPipe) id: number,
  ): Promise<boolean> {
    return this.booksService.remove(id);
  }

  // ---------- Campos anidados (solo se ejecutan si el cliente los pide) ----------

  @ResolveField(() => Author)
  author(
    @Parent() book: Book,
    @Context('loaders') loaders: Loaders,
  ): Promise<Author> {
    return loaders.authorById.load(book.authorId);
  }

  @ResolveField(() => [Genre])
  genres(
    @Parent() book: Book,
    @Context('loaders') loaders: Loaders,
  ): Promise<Genre[]> {
    return loaders.genresByBookId.load(book.id);
  }

  @ResolveField(() => [Review], {
    description: 'Reseñas más recientes',
    complexity: paginatedComplexity,
  })
  reviews(
    @Parent() book: Book,
    @Args() { first }: NestedListArgs,
    @Context('loaders') loaders: Loaders,
  ): Promise<Review[]> {
    return loaders.reviewsByBookId(first).load(book.id);
  }

  @ResolveField(() => [Loan], {
    description: 'Préstamos más recientes',
    complexity: paginatedComplexity,
  })
  loans(
    @Parent() book: Book,
    @Args() { first }: NestedListArgs,
    @Context('loaders') loaders: Loaders,
  ): Promise<Loan[]> {
    return loaders.loansByBookId(first).load(book.id);
  }

  @ResolveField(() => Float, {
    nullable: true,
    description: 'Campo calculado: media de las reseñas (no es una columna)',
  })
  averageRating(
    @Parent() book: Book,
    @Context('loaders') loaders: Loaders,
  ): Promise<number | null> {
    return loaders.averageRatingByBookId.load(book.id);
  }
}

@Resolver(() => BookConnection)
export class BookConnectionResolver {
  constructor(private readonly booksService: BooksService) {}

  /** El COUNT(*) solo se ejecuta si el cliente pide `totalCount`. */
  @ResolveField(() => Int, {
    description: 'Total de libros que cumplen el filtro',
  })
  totalCount(@Parent() connection: BookConnection): Promise<number> {
    return this.booksService.count(connection.filter);
  }
}
