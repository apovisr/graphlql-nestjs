import type { DataSourceOptions } from 'typeorm';
import { Author } from '../authors/author.entity';
import { Book } from '../books/book.entity';
import type { AppConfig } from '../config/app.config';
import { Genre } from '../genres/genre.entity';
import { Loan } from '../loans/loan.entity';
import { Reader } from '../readers/reader.entity';
import { Review } from '../reviews/review.entity';
import { QueryCounterLogger } from './query-counter.logger';

export const ENTITIES = [Author, Book, Genre, Reader, Review, Loan];

export function typeOrmOptions(
  config: AppConfig,
  { printSql = config.db.logSql } = {},
): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    entities: ENTITIES,
    // Solo para la demo: crea/actualiza las tablas a partir de las entidades.
    // En un proyecto real se usan migraciones (ver "Pendientes" en el README).
    synchronize: !config.isProduction,
    logger: new QueryCounterLogger(printSql),
    // Avisa por consola de cualquier SQL que tarde más de esto (ms)
    maxQueryExecutionTime: 200,
  };
}
