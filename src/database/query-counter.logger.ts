import { Logger as NestLogger } from '@nestjs/common';
import type { Logger as TypeOrmLogger } from 'typeorm';
import { requestMetricsStorage } from '../common/graphql/request-metrics';

/**
 * Logger de TypeORM que cuenta cada SQL ejecutado dentro de la petición actual
 * y, opcionalmente, lo imprime numerado (#1, #2...) para ver el N+1 en vivo.
 */
export class QueryCounterLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('SQL');

  constructor(private readonly printSql: boolean) {}

  logQuery(query: string, parameters?: unknown[]): void {
    // Fuera de una petición HTTP (arranque, synchronize, subscriptions) no hay contador
    const metrics = requestMetricsStorage.getStore();
    if (!metrics) return;
    metrics.sqlQueries++;
    if (this.printSql) {
      this.logger.log(
        `#${metrics.sqlQueries} ${oneLine(query)}${formatParams(parameters)}`,
      );
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: unknown[]) {
    const message = error instanceof Error ? error.message : error;
    this.logger.error(
      `${message} -> ${oneLine(query)}${formatParams(parameters)}`,
    );
  }

  logQuerySlow(time: number, query: string, parameters?: unknown[]) {
    this.logger.warn(
      `Consulta lenta (${time} ms): ${oneLine(query)}${formatParams(parameters)}`,
    );
  }

  logSchemaBuild(): void {}

  logMigration(): void {}

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') this.logger.warn(String(message));
  }
}

function oneLine(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function formatParams(parameters?: unknown[]): string {
  if (!parameters?.length) return '';
  const text = JSON.stringify(parameters);
  return ` -- ${text.length > 200 ? `${text.slice(0, 200)}…` : text}`;
}
