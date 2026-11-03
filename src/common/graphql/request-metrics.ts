import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

/** Métricas de una petición HTTP; se devuelven en `extensions` de la respuesta GraphQL. */
export interface RequestMetrics {
  sqlQueries: number;
  startedAt: number;
}

/**
 * AsyncLocalStorage permite que el logger de TypeORM sepa a qué petición
 * pertenece cada SQL sin tener que pasar el contexto a mano por todas las capas.
 */
export const requestMetricsStorage = new AsyncLocalStorage<RequestMetrics>();

export function requestMetricsMiddleware(
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  requestMetricsStorage.run(
    { sqlQueries: 0, startedAt: performance.now() },
    next,
  );
}
