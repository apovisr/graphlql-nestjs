/**
 * Rellena la base de datos con datos falsos pero realistas.
 * Es idempotente: vacía las tablas y vuelve a insertar todo.
 *
 *   npm run seed                  (~5.000 libros)
 *   SEED_SCALE=20 npm run seed    (~100.000 libros, para notar el OFFSET lento)
 */
import 'reflect-metadata';
import { fakerES as faker } from '@faker-js/faker';
import { DataSource, type ObjectLiteral, type Repository } from 'typeorm';
import { Author } from '../authors/author.entity';
import { Book } from '../books/book.entity';
import { loadEnv } from '../config/app.config';
import { Genre } from '../genres/genre.entity';
import { Loan } from '../loans/loan.entity';
import { Reader } from '../readers/reader.entity';
import { Review } from '../reviews/review.entity';
import { typeOrmOptions } from './typeorm.options';

const GENRES = [
  'Novela',
  'Ciencia ficción',
  'Fantasía',
  'Misterio',
  'Thriller',
  'Romance',
  'Terror',
  'Historia',
  'Biografía',
  'Ensayo',
  'Poesía',
  'Infantil',
  'Juvenil',
  'Filosofía',
  'Divulgación científica',
];

const COMMENTS: Record<number, string[]> = {
  1: [
    'No lo recomiendo.',
    'Lo dejé a la mitad.',
    'Muy por debajo de lo esperado.',
  ],
  2: ['Se hace largo.', 'Tiene buenas ideas, pero mal contadas.', 'Flojo.'],
  3: [
    'Correcto, sin más.',
    'Entretenido para el verano.',
    'Bien escrito, pero predecible.',
  ],
  4: [
    'Muy recomendable.',
    'Me enganchó desde el principio.',
    'Personajes muy bien construidos.',
  ],
  5: [
    'Una obra maestra.',
    'De mis favoritos.',
    'Imprescindible.',
    'Lo releería mil veces.',
  ],
};

const DAY_MS = 24 * 60 * 60 * 1000;
const CHUNK = 1000;

async function main() {
  try {
    process.loadEnvFile();
  } catch {
    // Sin .env: se usan los valores por defecto de loadEnv()
  }
  const config = loadEnv();
  const scale = Math.max(1, Number(process.env.SEED_SCALE ?? 1));
  faker.seed(42); // Datos reproducibles entre ejecuciones

  const dataSource = new DataSource(
    typeOrmOptions(config, { printSql: false }),
  );
  await dataSource.initialize();
  console.log(`Conectado a ${config.db.name}. Escala del seed: x${scale}`);

  await dataSource.query(
    'TRUNCATE loans, reviews, book_genres, books, genres, authors, readers RESTART IDENTITY CASCADE',
  );

  const now = Date.now();

  const genreIds = await insertAll(
    dataSource.getRepository(Genre),
    GENRES.map((name) => ({ name })),
  );

  const authorIds = await insertAll(
    dataSource.getRepository(Author),
    Array.from({ length: 200 * scale }, () => ({
      name: faker.person.fullName(),
      country: faker.location.country(),
      birthYear: faker.number.int({ min: 1850, max: 2000 }),
      createdAt: faker.date.past({ years: 6 }),
    })),
  );

  const isbns = new Set<string>();
  const books = Array.from({ length: 5000 * scale }, () => {
    let isbn: string;
    do isbn = faker.commerce.isbn(13);
    while (isbns.has(isbn));
    isbns.add(isbn);
    const totalCopies = faker.number.int({ min: 1, max: 5 });
    return {
      title: faker.book.title(),
      isbn,
      publishedYear: faker.number.int({ min: 1900, max: 2025 }),
      pages: faker.number.int({ min: 80, max: 1200 }),
      totalCopies,
      availableCopies: totalCopies,
      authorId: faker.helpers.arrayElement(authorIds),
      createdAt: faker.date.past({ years: 5 }),
    };
  });
  const bookIds = await insertAll(dataSource.getRepository(Book), books);

  const bookGenres = bookIds.flatMap((bookId) =>
    faker.helpers
      .arrayElements(genreIds, { min: 1, max: 3 })
      .map((genreId) => [bookId, genreId]),
  );
  for (let i = 0; i < bookGenres.length; i += CHUNK) {
    const chunk = bookGenres.slice(i, i + CHUNK);
    const values = chunk
      .map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`)
      .join(', ');
    await dataSource.query(
      `INSERT INTO book_genres (book_id, genre_id) VALUES ${values}`,
      chunk.flat(),
    );
  }

  const readerIds = await insertAll(
    dataSource.getRepository(Reader),
    Array.from({ length: 1000 * scale }, (_, i) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return {
        name: `${firstName} ${lastName}`,
        email: faker.internet
          .email({
            firstName,
            lastName,
            provider: `lector${i}.biblioteca.test`,
          })
          .toLowerCase(),
        memberSince: faker.date.past({ years: 5 }),
      };
    }),
  );

  await insertAll(
    dataSource.getRepository(Review),
    Array.from({ length: 30000 * scale }, () => {
      const rating = faker.helpers.weightedArrayElement([
        { weight: 1, value: 1 },
        { weight: 2, value: 2 },
        { weight: 4, value: 3 },
        { weight: 6, value: 4 },
        { weight: 5, value: 5 },
      ]);
      return {
        rating,
        comment: faker.datatype.boolean(0.8)
          ? faker.helpers.arrayElement(COMMENTS[rating])
          : null,
        bookId: faker.helpers.arrayElement(bookIds),
        readerId: faker.helpers.arrayElement(readerIds),
        createdAt: faker.date.past({ years: 2 }),
      };
    }),
  );

  // Préstamos: ~30 % siguen activos (algunos ya vencidos), sin superar
  // nunca los ejemplares que tiene cada libro.
  const copiesByBook = new Map(
    bookIds.map((id, i) => [id, books[i].totalCopies]),
  );
  const activeByBook = new Map<number, number>();
  await insertAll(
    dataSource.getRepository(Loan),
    Array.from({ length: 10000 * scale }, () => {
      const bookId = faker.helpers.arrayElement(bookIds);
      const loanedAt = faker.date.past({ years: 1 });
      const dueAt = new Date(loanedAt.getTime() + 21 * DAY_MS);
      const active = activeByBook.get(bookId) ?? 0;
      const wantsActive = faker.datatype.boolean(0.3);
      let returnedAt: Date | null = null;
      if (wantsActive && active < copiesByBook.get(bookId)!) {
        activeByBook.set(bookId, active + 1);
      } else {
        const returned =
          loanedAt.getTime() + faker.number.int({ min: 1, max: 30 }) * DAY_MS;
        returnedAt = new Date(Math.min(returned, now));
      }
      return {
        bookId,
        readerId: faker.helpers.arrayElement(readerIds),
        loanedAt,
        dueAt,
        returnedAt,
      };
    }),
  );

  await dataSource.query(`
    UPDATE books b
    SET available_copies = b.total_copies - a.active
    FROM (
      SELECT book_id, COUNT(*)::int AS active
      FROM loans WHERE returned_at IS NULL
      GROUP BY book_id
    ) a
    WHERE a.book_id = b.id
  `);
  await dataSource.query('ANALYZE');

  const counts = await dataSource.query<{ table: string; rows: number }[]>(`
    SELECT 'authors' AS table, COUNT(*)::int AS rows FROM authors
    UNION ALL SELECT 'books', COUNT(*)::int FROM books
    UNION ALL SELECT 'genres', COUNT(*)::int FROM genres
    UNION ALL SELECT 'book_genres', COUNT(*)::int FROM book_genres
    UNION ALL SELECT 'readers', COUNT(*)::int FROM readers
    UNION ALL SELECT 'reviews', COUNT(*)::int FROM reviews
    UNION ALL SELECT 'loans', COUNT(*)::int FROM loans
  `);
  console.table(counts);
  await dataSource.destroy();
}

/** Inserta en lotes y devuelve los ids generados, en el mismo orden. */
async function insertAll<T extends ObjectLiteral>(
  repository: Repository<T>,
  rows: Partial<T>[],
): Promise<number[]> {
  const ids: number[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await repository.insert(rows.slice(i, i + CHUNK) as never);
    ids.push(...result.identifiers.map((identifier) => Number(identifier.id)));
  }
  console.log(`  ${repository.metadata.tableName}: ${rows.length}`);
  return ids;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
