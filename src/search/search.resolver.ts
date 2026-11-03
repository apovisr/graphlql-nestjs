import {
  Args,
  ArgsType,
  createUnionType,
  Field,
  Int,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { IsString, Max, Min, MinLength } from 'class-validator';
import { Author } from '../authors/author.entity';
import { AuthorsService } from '../authors/authors.service';
import { Book } from '../books/book.entity';
import { BooksService } from '../books/books.service';
import { Reader } from '../readers/reader.entity';
import { ReadersService } from '../readers/readers.service';

/**
 * Union: un mismo campo puede devolver tipos distintos. El cliente usa
 * `__typename` y fragments (`... on Book { title }`) para pedir lo de cada uno.
 */
export const SearchResult = createUnionType({
  name: 'SearchResult',
  description: 'Un libro, un autor o un lector',
  types: () => [Book, Author, Reader] as const,
  resolveType(value) {
    if (value instanceof Book) return Book;
    if (value instanceof Author) return Author;
    return Reader;
  },
});

@ArgsType()
class SearchArgs {
  @Field()
  @IsString()
  @MinLength(2)
  term: string;

  @Field(() => Int, {
    defaultValue: 5,
    description: 'Máximo de resultados por tipo',
  })
  @Min(1)
  @Max(20)
  limitPerType: number;
}

@Resolver()
export class SearchResolver {
  constructor(
    private readonly authorsService: AuthorsService,
    private readonly booksService: BooksService,
    private readonly readersService: ReadersService,
  ) {}

  @Query(() => [SearchResult], {
    description: 'Busca por texto en libros, autores y lectores',
  })
  async search(
    @Args() { term, limitPerType }: SearchArgs,
  ): Promise<Array<typeof SearchResult>> {
    const [authors, books, readers] = await Promise.all([
      this.authorsService.search(term, limitPerType),
      this.booksService.search(term, limitPerType),
      this.readersService.search(term, limitPerType),
    ]);
    return [...authors, ...books, ...readers];
  }
}
