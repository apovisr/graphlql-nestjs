import type {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import type { GqlContext } from './gql-context';

/**
 * Añade a cada respuesta:
 *   "extensions": { "sqlQueries": 51, "durationMs": 87, "dataLoader": false, "complexity": 52 }
 * para ver el coste real de una query directamente en Apollo Sandbox.
 */
@Plugin()
export class RequestMetricsPlugin implements ApolloServerPlugin<GqlContext> {
  async requestDidStart(): Promise<GraphQLRequestListener<GqlContext>> {
    return {
      async willSendResponse({ contextValue, response }) {
        const { metrics } = contextValue;
        if (!metrics || response.body.kind !== 'single') return;
        response.body.singleResult.extensions = {
          ...response.body.singleResult.extensions,
          sqlQueries: metrics.sqlQueries,
          durationMs: Math.round(performance.now() - metrics.startedAt),
          dataLoader: contextValue.useDataLoader,
          complexity: contextValue.complexity,
        };
      },
    };
  }
}
