import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Author } from '../authors/author.entity';
import {
  BadUserInputError,
  BusinessRuleError,
  NotFoundError,
} from '../common/graphql/errors';
import { decodeCursor, encodeCursor } from '../common/pagination/cursor';
import type {
  ConnectionArgs,
  OffsetPaginationArgs,
} from '../common/pagination/pagination.args';
import { toOffsetPage } from '../common/pagination/pagination.types';
import { Genre } from '../genres/genre.entity';
import { Book } from './book.entity';
import type { BookFilterInput } from './dto/book-filter.input';
import type { BookConnection, BookPage } from './dto/book-pagination.types';
import type { CreateBookInput } from './dto/create-book.input';
import type { UpdateBookInput } from './dto/update-book.input';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
    @InjectRepository(Author) private readonly authors: Repository<Author>,
    @InjectRepository(Genre) private readonly genres: Repository<Genre>,
  ) {}

  /**
   * Offset: SELECT ... ORDER BY created_at DESC LIMIT 20 OFFSET 4000
   * Problemas:
   *  - Postgres tiene que leer y descartar las 4000 filas anteriores (más lento cuanto más lejos).
   *  - Si entre página y página se inserta un libro, todo se desplaza una posición
   *    y el último de la página anterior reaparece en la siguiente (duplicado).
   */
  async findPage(
    filter: BookFilterInput | undefined,
    pagination: OffsetPaginationArgs,
  ): Promise<BookPage> {
    const [items, total] = await this.newestFirst(this.filtered(filter))
      .offset(pagination.offset)
      .limit(pagination.limit)
      .getManyAndCount();
    return toOffsetPage(items, total, pagination);
  }

  /**
   * Cursor (keyset): WHERE (created_at, id) < (cursor) ORDER BY ... LIMIT 21
   * El índice (created_at, id) permite saltar directamente a la posición: el coste
   * no crece con la profundidad y las inserciones no desplazan las páginas.
   * Pedimos uno de más para saber si hay página siguiente sin hacer un COUNT.
   */
  async findConnection(
    filter: BookFilterInput | undefined,
    { first, after }: ConnectionArgs,
  ): Promise<BookConnection> {
    const query = this.newestFirst(this.filtered(filter)).limit(first + 1);
    if (after) {
      const { createdAt, id } = decodeCursor(after);
      query.andWhere('(book.createdAt, book.id) < (:createdAt, :id)', {
        createdAt,
        id,
      });
    }
    const rows = await query.getMany();
    const nodes = rows.slice(0, first);
    const edges = nodes.map((node) => ({ node, cursor: encodeCursor(node) }));
    return {
      edges,
      pageInfo: {
        hasNextPage: rows.length > first,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
      filter,
    };
  }

  count(filter: BookFilterInput | undefined): Promise<number> {
    return this.filtered(filter).getCount();
  }

  findById(id: number): Promise<Book | null> {
    return this.books.findOneBy({ id });
  }

  search(term: string, limit: number): Promise<Book[]> {
    return this.newestFirst(this.filtered({ search: term }))
      .limit(limit)
      .getMany();
  }

  async create(input: CreateBookInput): Promise<Book> {
    const { genreIds, ...data } = input;
    await this.assertAuthorExists(data.authorId);
    const book = this.books.create({
      ...data,
      availableCopies: data.totalCopies,
      genres: await this.findGenres(genreIds),
    });
    return this.books.save(book);
  }

  async update(id: number, input: UpdateBookInput): Promise<Book> {
    const book = await this.books.findOneBy({ id });
    if (!book) throw new NotFoundError('Libro', id);

    const { genreIds, totalCopies, ...data } = input;
    if (data.authorId !== undefined)
      await this.assertAuthorExists(data.authorId);
    Object.assign(book, data);

    if (totalCopies !== undefined) {
      const onLoan = book.totalCopies - book.availableCopies;
      if (totalCopies < onLoan) {
        throw new BusinessRuleError(
          `Hay ${onLoan} ejemplares prestados: totalCopies no puede ser menor`,
          'INVALID_TOTAL_COPIES',
        );
      }
      book.totalCopies = totalCopies;
      book.availableCopies = totalCopies - onLoan;
    }
    if (genreIds) book.genres = await this.findGenres(genreIds);

    return this.books.save(book);
  }

  async remove(id: number): Promise<boolean> {
    const { affected } = await this.books.delete(id);
    if (!affected) throw new NotFoundError('Libro', id);
    return true;
  }

  private filtered(filter?: BookFilterInput): SelectQueryBuilder<Book> {
    const query = this.books.createQueryBuilder('book');
    if (filter?.search) {
      query.andWhere('book.title ILIKE :search', {
        search: `%${filter.search}%`,
      });
    }
    if (filter?.authorId) {
      query.andWhere('book.authorId = :authorId', {
        authorId: filter.authorId,
      });
    }
    if (filter?.genreId) {
      query.andWhere(
        'EXISTS (SELECT 1 FROM book_genres bg WHERE bg.book_id = book.id AND bg.genre_id = :genreId)',
        { genreId: filter.genreId },
      );
    }
    if (filter?.publishedAfter) {
      query.andWhere('book.publishedYear > :year', {
        year: filter.publishedAfter,
      });
    }
    if (filter?.onlyAvailable) {
      query.andWhere('book.availableCopies > 0');
    }
    return query;
  }

  private newestFirst(
    query: SelectQueryBuilder<Book>,
  ): SelectQueryBuilder<Book> {
    return query
      .orderBy('book.createdAt', 'DESC')
      .addOrderBy('book.id', 'DESC');
  }

  private async assertAuthorExists(authorId: number): Promise<void> {
    if (!(await this.authors.existsBy({ id: authorId }))) {
      throw new NotFoundError('Autor', authorId);
    }
  }

  private async findGenres(ids: number[]): Promise<Genre[]> {
    const genres = await this.genres.findBy({ id: In(ids) });
    if (genres.length !== new Set(ids).size) {
      throw new BadUserInputError('Alguno de los géneros no existe', {
        genreIds: ids,
      });
    }
    return genres;
  }
}
