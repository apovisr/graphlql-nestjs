/**
 * Funciones "batch": reciben N claves y resuelven todas con UNA consulta SQL.
 * Deben devolver un array alineado con las claves (mismo orden y longitud).
 */
import {
  In,
  type DataSource,
  type FindOptionsWhere,
  type ObjectLiteral,
  type Repository,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { Genre } from '../genres/genre.entity';

/** SELECT ... WHERE id IN (...) */
export async function findByIds<T extends { id: number }>(
  repository: Repository<T>,
  ids: readonly number[],
): Promise<(T | Error)[]> {
  const rows = await repository.findBy({
    id: In([...ids]),
  } as FindOptionsWhere<T>);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const entity = repository.metadata.name;
  return ids.map(
    (id) => byId.get(id) ?? new Error(`${entity} ${id} no existe`),
  );
}

/**
 * Los `limit` hijos más recientes de cada padre en una sola consulta.
 * Un `LIMIT` normal no sirve: limitaría el total, no "N por padre".
 *
 *   SELECT ... WHERE id IN (
 *     SELECT id FROM (
 *       SELECT id, ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) rn
 *       FROM books WHERE author_id = ANY($1)
 *     ) ranked WHERE rn <= $2
 *   )
 */
export async function firstNPerParent<T extends ObjectLiteral>(
  repository: Repository<T>,
  parentProperty: keyof T & string,
  orderProperty: keyof T & string,
  parentIds: readonly number[],
  limit: number,
): Promise<T[][]> {
  const { tableName } = repository.metadata;
  const parentColumn = columnName(repository, parentProperty);
  const orderColumn = columnName(repository, orderProperty);

  const rows = await repository
    .createQueryBuilder('e')
    .where(
      `e.id IN (
        SELECT ranked.id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY ${parentColumn} ORDER BY ${orderColumn} DESC, id DESC
          ) AS rn
          FROM ${tableName}
          WHERE ${parentColumn} = ANY(:parentIds)
        ) ranked
        WHERE ranked.rn <= :limit
      )`,
      { parentIds: [...parentIds], limit },
    )
    .orderBy(`e.${orderProperty}`, 'DESC')
    .addOrderBy('e.id', 'DESC')
    .getMany();

  return groupByKeys(parentIds, rows, (row) => row[parentProperty] as number);
}

/** Géneros de cada libro (relación N:M a través de book_genres). */
export async function genresOfBooks(
  dataSource: DataSource,
  bookIds: readonly number[],
): Promise<Genre[][]> {
  const rows = await dataSource.query<
    { book_id: number; id: number; name: string }[]
  >(
    `SELECT bg.book_id, g.id, g.name
     FROM book_genres bg
     JOIN genres g ON g.id = bg.genre_id
     WHERE bg.book_id = ANY($1)
     ORDER BY g.name`,
    [[...bookIds]],
  );
  const genres = dataSource.getRepository(Genre);
  const grouped = groupByKeys(bookIds, rows, (row) => row.book_id);
  return grouped.map((group) =>
    group.map(({ id, name }) => genres.create({ id, name })),
  );
}

/** Los `limit` libros más recientes de cada género (N:M + top-N por grupo). */
export async function booksOfGenres(
  dataSource: DataSource,
  genreIds: readonly number[],
  limit: number,
): Promise<Book[][]> {
  const pairs = await dataSource.query<{ book_id: number; genre_id: number }[]>(
    `SELECT book_id, genre_id FROM (
       SELECT bg.book_id, bg.genre_id, ROW_NUMBER() OVER (
         PARTITION BY bg.genre_id ORDER BY b.created_at DESC, b.id DESC
       ) AS rn
       FROM book_genres bg
       JOIN books b ON b.id = bg.book_id
       WHERE bg.genre_id = ANY($1)
     ) ranked
     WHERE rn <= $2
     ORDER BY rn`,
    [[...genreIds], limit],
  );
  const bookIds = [...new Set(pairs.map((pair) => pair.book_id))];
  const books = bookIds.length
    ? await dataSource.getRepository(Book).findBy({ id: In(bookIds) })
    : [];
  const bookById = new Map(books.map((book) => [book.id, book]));
  return groupByKeys(genreIds, pairs, (pair) => pair.genre_id).map((group) =>
    group.map((pair) => bookById.get(pair.book_id)!),
  );
}

/** Valoración media de cada libro con un único GROUP BY. */
export async function averageRatings(
  dataSource: DataSource,
  bookIds: readonly number[],
): Promise<(number | null)[]> {
  const rows = await dataSource.query<{ book_id: number; average: string }[]>(
    `SELECT book_id, ROUND(AVG(rating), 2) AS average
     FROM reviews
     WHERE book_id = ANY($1)
     GROUP BY book_id`,
    [[...bookIds]],
  );
  const byBook = new Map(rows.map((row) => [row.book_id, Number(row.average)]));
  return bookIds.map((id) => byBook.get(id) ?? null);
}

function columnName<T extends ObjectLiteral>(
  repository: Repository<T>,
  property: string,
): string {
  const column = repository.metadata.findColumnWithPropertyName(property);
  if (!column)
    throw new Error(
      `${repository.metadata.name}.${property} no es una columna`,
    );
  return column.databaseName;
}

function groupByKeys<K, V>(
  keys: readonly K[],
  rows: V[],
  keyOf: (row: V) => K,
): V[][] {
  const groups = new Map<K, V[]>(keys.map((key) => [key, []]));
  for (const row of rows) groups.get(keyOf(row))?.push(row);
  return keys.map((key) => groups.get(key)!);
}
