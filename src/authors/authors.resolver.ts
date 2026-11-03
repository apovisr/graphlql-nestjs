import { ParseIntPipe } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Book } from '../books/book.entity';
import { paginatedComplexity } from '../common/graphql/complexity';
import {
  NestedListArgs,
  OffsetPaginationArgs,
} from '../common/pagination/pagination.args';
import type { Loaders } from '../loaders/loaders';
import { Author } from './author.entity';
import { AuthorsService } from './authors.service';
import { AuthorPage } from './dto/author-page.type';
import { CreateAuthorInput } from './dto/create-author.input';

@Resolver(() => Author)
export class AuthorsResolver {
  constructor(private readonly authorsService: AuthorsService) {}

  @Query(() => AuthorPage, {
    description: 'Autores ordenados por nombre (paginación por offset)',
    complexity: paginatedComplexity,
  })
  authors(@Args() pagination: OffsetPaginationArgs): Promise<AuthorPage> {
    return this.authorsService.findPage(pagination);
  }

  @Query(() => Author, { nullable: true })
  author(@Args('id', { type: () => ID }, ParseIntPipe) id: number) {
    return this.authorsService.findById(id);
  }

  @Mutation(() => Author)
  createAuthor(@Args('input') input: CreateAuthorInput): Promise<Author> {
    return this.authorsService.create(input);
  }

  /**
   * Campo anidado: solo se ejecuta si el cliente pide `books` dentro de un autor.
   * Con 50 autores en pantalla, este método se llama 50 veces: si cada llamada
   * lanzara su propio SELECT tendríamos el problema N+1 (ver demo/04).
   */
  @ResolveField(() => [Book], {
    description: 'Libros más recientes del autor',
    complexity: paginatedComplexity,
  })
  books(
    @Parent() author: Author,
    @Args() { first }: NestedListArgs,
    @Context('loaders') loaders: Loaders,
  ): Promise<Book[]> {
    return loaders.booksByAuthorId(first).load(author.id);
  }
}
