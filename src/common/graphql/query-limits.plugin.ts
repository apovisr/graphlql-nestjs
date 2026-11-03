import type {
  ApolloServerPlugin,
  GraphQLRequestListener,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { Inject } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { GraphQLError, Kind, validate, type DocumentNode } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity';
import { appConfig, type AppConfig } from '../../config/app.config';
import type { GqlContext } from './gql-context';

/**
 * Frena las consultas abusivas ANTES de ejecutarlas (0 SQL):
 *
 *  - Profundidad (MAX_QUERY_DEPTH): niveles de anidamiento, p. ej.
 *    author { books { reviews { reader { reviews { book { author ... } } } } } }
 *
 *  - Complejidad (MAX_QUERY_COMPLEXITY): cada campo cuesta 1, salvo las listas
 *    paginadas, que multiplican por el tamaño de página (ver complexity.ts).
 *    También frena el abuso con aliases: `a: books {...} b: books {...}` suma dos veces.
 *
 * Se comprueba solo la operación que se va a ejecutar, no todo el documento:
 * así un archivo de la carpeta demo/ puede mezclar consultas buenas y abusivas.
 */
@Plugin()
export class QueryLimitsPlugin implements ApolloServerPlugin<GqlContext> {
  constructor(
    private readonly schemaHost: GraphQLSchemaHost,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  async requestDidStart(): Promise<GraphQLRequestListener<GqlContext>> {
    const { schema } = this.schemaHost;
    const { maxDepth, maxComplexity } = this.config.graphql;

    return {
      async didResolveOperation({
        request,
        document,
        operation,
        contextValue,
      }) {
        if (maxDepth > 0) {
          // Documento con solo esta operación (y los fragments que pueda usar)
          const single: DocumentNode = {
            ...document,
            definitions: document.definitions.filter(
              (d) => d === operation || d.kind === Kind.FRAGMENT_DEFINITION,
            ),
          };
          const [error] = validate(schema, single, [depthLimit(maxDepth)]);
          if (error) {
            throw new GraphQLError(
              `Consulta demasiado profunda: el máximo son ${maxDepth} niveles.`,
              {
                extensions: {
                  code: 'QUERY_TOO_DEEP',
                  maxDepth,
                  http: { status: 400 },
                },
              },
            );
          }
        }

        const complexity = getComplexity({
          schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [
            fieldExtensionsEstimator(),
            simpleEstimator({ defaultComplexity: 1 }),
          ],
        });
        contextValue.complexity = complexity;

        if (maxComplexity > 0 && complexity > maxComplexity) {
          throw new GraphQLError(
            `Consulta demasiado costosa: ${complexity} puntos (máximo ${maxComplexity}). ` +
              'Pide menos elementos por página o menos niveles.',
            {
              extensions: {
                code: 'QUERY_TOO_COMPLEX',
                complexity,
                maxComplexity,
                http: { status: 400 },
              },
            },
          );
        }
      },
    };
  }
}
