import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { AuthorsModule } from './authors/authors.module';
import { BooksModule } from './books/books.module';
import { BadUserInputError, GraphQLErrorFilter } from './common/graphql/errors';
import { buildGqlContext } from './common/graphql/gql-context';
import { QueryLimitsPlugin } from './common/graphql/query-limits.plugin';
import { requestMetricsMiddleware } from './common/graphql/request-metrics';
import { RequestMetricsPlugin } from './common/graphql/request-metrics.plugin';
import { PubSubModule } from './common/pubsub/pubsub.module';
import { appConfig, type AppConfig } from './config/app.config';
import { typeOrmOptions } from './database/typeorm.options';
import { GenresModule } from './genres/genres.module';
import { LoansModule } from './loans/loans.module';
import { ReadersModule } from './readers/readers.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';

/**
 * @apollo/server se publica en CJS y ESM, y @nestjs/apollo usa la versión ESM.
 * Con import() dinámico cargamos esa misma versión (un require() traería la CJS).
 */
async function sandboxLandingPage() {
  const { ApolloServerPluginLandingPageLocalDefault } =
    await import('@apollo/server/plugin/landingPage/default');
  return ApolloServerPluginLandingPageLocalDefault({ embed: true });
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: AppConfig) => typeOrmOptions(config),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [appConfig.KEY, getDataSourceToken()],
      useFactory: async (config: AppConfig, dataSource: DataSource) => ({
        // Code-first: el schema se genera a partir de las clases y decoradores
        autoSchemaFile: join(process.cwd(), 'schema.gql'),
        sortSchema: true,
        context: buildGqlContext(dataSource),
        subscriptions: { 'graphql-ws': true },
        // Los límites de profundidad y complejidad están en QueryLimitsPlugin
        introspection: !config.isProduction,
        includeStacktraceInErrorResponses: false,
        // Apollo Sandbox como explorador en vez del GraphiQL que trae Nest
        graphiql: false,
        plugins: config.isProduction ? [] : [await sandboxLandingPage()],
      }),
    }),
    PubSubModule,
    AuthorsModule,
    BooksModule,
    GenresModule,
    ReadersModule,
    ReviewsModule,
    LoansModule,
    SearchModule,
  ],
  providers: [
    RequestMetricsPlugin,
    QueryLimitsPlugin,
    { provide: APP_FILTER, useClass: GraphQLErrorFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        exceptionFactory: (errors) =>
          new BadUserInputError('Datos de entrada no válidos', {
            fields: Object.fromEntries(
              errors.map((error) => [
                error.property,
                Object.values(error.constraints ?? {}),
              ]),
            ),
          }),
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Abre el "almacén" donde se cuentan los SQL de cada petición a /graphql
    consumer
      .apply(requestMetricsMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.ALL });
  }
}
