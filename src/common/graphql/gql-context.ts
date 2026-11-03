import type { Request } from 'express';
import type { DataSource } from 'typeorm';
import { createLoaders, type Loaders } from '../../loaders/loaders';
import { requestMetricsStorage, type RequestMetrics } from './request-metrics';

/** Lo que recibe cada resolver con @Context(). */
export interface GqlContext {
  req?: Request;
  loaders: Loaders;
  /** false si la petición trae la cabecera `x-dataloader: off`. */
  useDataLoader: boolean;
  metrics?: RequestMetrics;
  complexity?: number;
}

/**
 * Se ejecuta una vez por operación:
 *  - HTTP (queries y mutations): Apollo nos pasa { req, res }.
 *  - WebSocket (subscriptions): graphql-ws nos pasa { connectionParams, extra }.
 */
export function buildGqlContext(dataSource: DataSource) {
  return (arg: { req?: Request }): GqlContext => {
    if (arg.req) {
      const useDataLoader = arg.req.headers['x-dataloader'] !== 'off';
      return {
        req: arg.req,
        useDataLoader,
        loaders: createLoaders(dataSource, { batch: useDataLoader }),
        metrics: requestMetricsStorage.getStore(),
      };
    }
    // En una subscription el contexto vive mientras dura la suscripción:
    // una caché de DataLoader devolvería datos viejos en los eventos siguientes.
    return {
      useDataLoader: false,
      loaders: createLoaders(dataSource, { batch: false }),
    };
  };
}
