/**
 * Tests e2e contra la base de datos de Docker con el seed cargado:
 *   npm run db:up && npm run seed && npm run test:e2e
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface GqlResponse<T = any> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
  extensions?: { sqlQueries: number; complexity?: number };
}

describe('API GraphQL (e2e)', () => {
  let app: INestApplication;
  const createdBookIds: string[] = [];

  async function gql<T = any>(
    query: string,
    headers: Record<string, string> = {},
  ): Promise<GqlResponse<T>> {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set(headers)
      .send({ query });
    return res.body;
  }

  async function createBook(totalCopies = 1): Promise<string> {
    const isbn = `97${Date.now() % 1e11}${createdBookIds.length}`;
    const { data, errors } = await gql(`mutation {
      createBook(input: { title: "Libro de test", isbn: "${isbn}", publishedYear: 2024,
        pages: 10, totalCopies: ${totalCopies}, authorId: 1, genreIds: [1] }) { id }
    }`);
    expect(errors).toBeUndefined();
    createdBookIds.push(data.createBook.id);
    return data.createBook.id;
  }

  beforeAll(async () => {
    process.env.DB_LOG_SQL = 'false';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    for (const id of createdBookIds) {
      await gql(`mutation { deleteBook(id: ${id}) }`);
    }
    await app.close();
  });

  describe('N+1', () => {
    const query =
      '{ authors(limit: 20) { items { books(first: 3) { title author { name } } } } }';

    it('sin DataLoader lanza una consulta por cada autor y por cada libro', async () => {
      const body = await gql(query, { 'x-dataloader': 'off' });
      const authors = body.data.authors.items;
      const books = authors.flatMap((a: { books: unknown[] }) => a.books);
      // 2 (página + COUNT) + 1 por autor (sus libros) + 1 por libro (su autor)
      expect(body.extensions?.sqlQueries).toBe(
        2 + authors.length + books.length,
      );
    });

    it('con DataLoader el número de consultas no depende de los datos', async () => {
      const body = await gql(query);
      // 2 (página + COUNT) + 1 (libros de todos los autores) + 1 (autores de todos los libros)
      expect(body.extensions?.sqlQueries).toBe(4);
    });
  });

  describe('paginación', () => {
    it('por cursor no repite elementos aunque se inserten datos entre páginas', async () => {
      const page1 = await gql(
        '{ booksConnection(first: 3) { edges { node { id } } pageInfo { endCursor } } }',
      );
      const { endCursor } = page1.data.booksConnection.pageInfo;
      await createBook();
      const page2 = await gql(
        `{ booksConnection(first: 3, after: "${endCursor}") { edges { node { id } } } }`,
      );

      const ids1 = page1.data.booksConnection.edges.map((e: any) => e.node.id);
      const ids2 = page2.data.booksConnection.edges.map((e: any) => e.node.id);
      expect(ids2.filter((id: string) => ids1.includes(id))).toEqual([]);
    });

    it('rechaza páginas de más de 100 elementos', async () => {
      const body = await gql(
        '{ booksConnection(first: 101) { edges { node { id } } } }',
      );
      expect(body.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
    });
  });

  describe('consultas abusivas', () => {
    it('rechaza las consultas demasiado profundas sin tocar la BD', async () => {
      const body =
        await gql(`{ author(id: 1) { books { reviews { reader { reviews {
        book { author { books { title } } } } } } } } }`);
      expect(body.errors?.[0].extensions?.code).toBe('QUERY_TOO_DEEP');
      expect(body.extensions?.sqlQueries).toBe(0);
    });

    it('rechaza las consultas demasiado costosas', async () => {
      const body = await gql(
        '{ authors(limit: 100) { items { books(first: 100) { title } } } }',
      );
      expect(body.errors?.[0].extensions?.code).toBe('QUERY_TOO_COMPLEX');
      expect(body.extensions?.complexity).toBeGreaterThan(1000);
    });
  });

  describe('mutations', () => {
    it('no presta un libro sin ejemplares disponibles', async () => {
      const bookId = await createBook(1);
      const first = await gql(
        `mutation { borrowBook(bookId: ${bookId}, readerId: 1) { status } }`,
      );
      expect(first.data.borrowBook.status).toBe('ACTIVE');

      const second = await gql(
        `mutation { borrowBook(bookId: ${bookId}, readerId: 2) { id } }`,
      );
      expect(second.errors?.[0].extensions?.code).toBe('NO_COPIES_AVAILABLE');
    });

    it('valida los datos de entrada', async () => {
      const body = await gql(
        'mutation { addReview(input: { bookId: 1, readerId: 1, rating: 9 }) { id } }',
      );
      expect(body.errors?.[0].extensions).toMatchObject({
        code: 'BAD_USER_INPUT',
        fields: { rating: expect.any(Array) },
      });
    });
  });
});
