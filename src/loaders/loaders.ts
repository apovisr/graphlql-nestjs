import DataLoader from 'dataloader';
import type { DataSource } from 'typeorm';
import { Author } from '../authors/author.entity';
import { Book } from '../books/book.entity';
import type { Genre } from '../genres/genre.entity';
import { Loan } from '../loans/loan.entity';
import { Reader } from '../readers/reader.entity';
import { Review } from '../reviews/review.entity';
import {
  averageRatings,
  booksOfGenres,
  findByIds,
  firstNPerParent,
  genresOfBooks,
} from './batch-queries';

export interface LoaderOptions {
  /**
   * true  -> DataLoader agrupa todas las claves pedidas en el mismo "tick"
   *          y lanza UNA consulta (y cachea durante la petición).
   * false -> cada .load(key) lanza su propia consulta: exactamente lo que
   *          hace un resolver ingenuo. Así se reproduce el problema N+1.
   */
  batch: boolean;
}

/**
 * Se crean nuevos por cada petición (en el contexto de GraphQL):
 * la caché de DataLoader no debe compartirse entre usuarios ni peticiones.
 */
export function createLoaders(
  dataSource: DataSource,
  { batch }: LoaderOptions,
) {
  const options = { batch, cache: batch };
  const books = dataSource.getRepository(Book);
  const reviews = dataSource.getRepository(Review);
  const loans = dataSource.getRepository(Loan);

  /** Las listas anidadas aceptan `first`, así que hay un DataLoader por cada valor. */
  function perLimit<V>(
    batchFn: (keys: readonly number[], limit: number) => Promise<V[]>,
  ) {
    const byLimit = new Map<number, DataLoader<number, V>>();
    return (limit: number) => {
      let loader = byLimit.get(limit);
      if (!loader) {
        loader = new DataLoader<number, V>(
          (keys) => batchFn(keys, limit),
          options,
        );
        byLimit.set(limit, loader);
      }
      return loader;
    };
  }

  return {
    authorById: new DataLoader<number, Author>(
      (ids) => findByIds(dataSource.getRepository(Author), ids),
      options,
    ),
    bookById: new DataLoader<number, Book>(
      (ids) => findByIds(books, ids),
      options,
    ),
    readerById: new DataLoader<number, Reader>(
      (ids) => findByIds(dataSource.getRepository(Reader), ids),
      options,
    ),
    genresByBookId: new DataLoader<number, Genre[]>(
      (ids) => genresOfBooks(dataSource, ids),
      options,
    ),
    averageRatingByBookId: new DataLoader<number, number | null>(
      (ids) => averageRatings(dataSource, ids),
      options,
    ),
    booksByAuthorId: perLimit((ids, limit) =>
      firstNPerParent(books, 'authorId', 'createdAt', ids, limit),
    ),
    booksByGenreId: perLimit((ids, limit) =>
      booksOfGenres(dataSource, ids, limit),
    ),
    reviewsByBookId: perLimit((ids, limit) =>
      firstNPerParent(reviews, 'bookId', 'createdAt', ids, limit),
    ),
    reviewsByReaderId: perLimit((ids, limit) =>
      firstNPerParent(reviews, 'readerId', 'createdAt', ids, limit),
    ),
    loansByBookId: perLimit((ids, limit) =>
      firstNPerParent(loans, 'bookId', 'loanedAt', ids, limit),
    ),
    loansByReaderId: perLimit((ids, limit) =>
      firstNPerParent(loans, 'readerId', 'loanedAt', ids, limit),
    ),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
