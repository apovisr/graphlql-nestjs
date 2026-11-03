# Demo GraphQL con NestJS: Biblioteca

Proyecto didáctico que enseña **qué aporta GraphQL** (consultas anidadas en una sola petición, pedir solo los campos necesarios, mutations, subscriptions en tiempo real, unions, schema autodocumentado) y **sus problemas típicos con su solución** (N+1, paginación, consultas abusivas).

Cada problema se enseña primero roto y luego resuelto, con métricas que se ven en la propia respuesta GraphQL:

```json
"extensions": { "sqlQueries": 346, "durationMs": 101, "dataLoader": false, "complexity": 751 }
```

**Stack:** NestJS 12 · GraphQL code-first (`@nestjs/graphql` + Apollo Server 5) · TypeORM 1 · PostgreSQL 17 en Docker · DataLoader · graphql-ws · graphql-depth-limit · graphql-query-complexity

## Puesta en marcha

Requisitos: Node 24 y Docker.

```bash
cp .env.example .env
npm install
npm run db:up        # Postgres en :5432 y Adminer en http://localhost:8080
npm run seed         # ~5.000 libros, 30.000 reseñas, 10.000 préstamos (datos reproducibles)
npm run start:dev
```

Abre **http://localhost:3000/graphql** (Apollo Sandbox) y pega el contenido de cualquier archivo de [demo/](demo/).

## Modelo de datos

```
Author 1──N Book N──M Genre
              │
              ├──1──N Review N──1 Reader
              └──1──N Loan   N──1 Reader
```

La relación circular `author → books → reviews → reader → reviews → book → author…` es intencionada: sirve para la demo de consultas abusivas.

Campos calculados (no son columnas): `Book.averageRating` y `Loan.status` (`ACTIVE | OVERDUE | RETURNED`).

## Guion de la demo

| Archivo | Qué enseña | Qué mirar |
|---|---|---|
| [01-consultas-anidadas](demo/01-consultas-anidadas.graphql) | Una pantalla completa en una petición, solo los campos necesarios, fragments, aliases, introspección | Tamaño de la respuesta y `sqlQueries` |
| [02-mutations](demo/02-mutations.graphql) | Crear, actualizar y borrar; reglas de negocio; errores con `extensions.code`; mutations en serie y propagación de `null` | `errors[].extensions` |
| [03-subscriptions](demo/03-subscriptions.graphql) | Tiempo real por WebSocket, con filtro por argumento | Dos pestañas: una escucha y otra lanza mutations |
| [04-n-mas-1](demo/04-n-mas-1.graphql) | El problema N+1 y DataLoader | Cabecera `x-dataloader: off` frente a `on` |
| [05-paginacion](demo/05-paginacion.graphql) | Offset frente a cursor, duplicados al insertar, `totalCount` bajo demanda, paginación anidada | IDs repetidos y `durationMs` |
| [06-consultas-abusivas](demo/06-consultas-abusivas.graphql) | Profundidad, listas gigantes, aliases | `QUERY_TOO_DEEP` / `QUERY_TOO_COMPLEX` con `sqlQueries: 0` |
| [07-unions-search](demo/07-unions-search.graphql) | Unions, `__typename` y fragments inline | Tipos distintos en una misma lista |

**Cabeceras en Sandbox:** pestaña *Headers*, debajo del editor. `x-dataloader: off` desactiva el batching para esa petición.

**Consola del servidor:** con `DB_LOG_SQL=true` cada SQL de una petición sale numerado (`[SQL] #1 SELECT …`), lo que hace muy visible el N+1.

### Cifras de referencia (seed por defecto)

| Operación | Sin DataLoader | Con DataLoader |
|---|---|---|
| `AutoresConLibros` (50 autores → libros → géneros y valoración) | 346 SQL | 5 SQL |
| `ResenasConLectorYLibro` (20 libros → autor, reseñas → lector) | 133 SQL | 4 SQL |
| `AtaqueCircular` con los límites desactivados | ~1.740 SQL | 8 SQL |

| Paginación (100.000 libros, `SEED_SCALE=20`) | Tiempo |
|---|---|
| `books(offset: 99960, limit: 20)` | ~45 ms |
| La misma página con `booksConnection(after: …)` | ~3 ms |

## Cómo está resuelto cada problema

| Problema | Solución | Dónde |
|---|---|---|
| N+1 | DataLoader por petición. El modo "ingenuo" es el **mismo** DataLoader con `batch: false`, así que la única diferencia entre los dos modos es el batching | [src/loaders/](src/loaders/) |
| "N primeros por padre" (`author.books(first: 3)`) | Una sola consulta con `ROW_NUMBER() OVER (PARTITION BY …)` | [batch-queries.ts](src/loaders/batch-queries.ts) |
| Paginación inestable o lenta | Cursor keyset sobre el índice `(created_at, id)`, al estilo Relay | [books.service.ts](src/books/books.service.ts) |
| `COUNT(*)` en cada página | `totalCount` es un `@ResolveField`: solo se calcula si se pide | [books.resolver.ts](src/books/books.resolver.ts) |
| Listas sin límite | `first`/`limit` con valor por defecto y máximo de 100, validados | [pagination.args.ts](src/common/pagination/pagination.args.ts) |
| Consultas profundas, costosas o con aliases | Límite de profundidad y de complejidad, comprobados solo sobre la operación que se ejecuta | [query-limits.plugin.ts](src/common/graphql/query-limits.plugin.ts) |
| Medir todo lo anterior | `AsyncLocalStorage` más un logger de TypeORM que cuenta los SQL, y un plugin de Apollo que los añade a `extensions` | [request-metrics.ts](src/common/graphql/request-metrics.ts), [query-counter.logger.ts](src/database/query-counter.logger.ts) |

## Estructura

```
docker-compose.yml       Postgres 17 + Adminer
demo/                    Guion: operaciones .graphql numeradas
src/
  app.module.ts          GraphQL (Apollo, code-first, graphql-ws), TypeORM, pipe y filtro globales
  config/                Variables de entorno
  common/
    graphql/             Contexto, métricas, límites de consulta, errores
    pagination/          Args, tipos genéricos OffsetPage() / Connection(), cursores
    pubsub/              PubSub en memoria para las subscriptions
  loaders/               DataLoaders y sus consultas batch
  authors/ books/ genres/ readers/ reviews/ loans/ search/
                         entidad (TypeORM + ObjectType) · resolver · service · dto
  database/              Opciones de TypeORM, logger contador de SQL y seed
test/app.e2e-spec.ts     Tests e2e contra la BD de Docker
schema.gql               Schema generado automáticamente (no editar)
```

## Configuración (.env)

| Variable | Por defecto | Uso |
|---|---|---|
| `DB_*` | `biblioteca` | Conexión a Postgres (docker-compose usa las mismas) |
| `DB_LOG_SQL` | `true` | Imprime cada SQL numerado en la consola |
| `MAX_QUERY_DEPTH` | `7` | Profundidad máxima (`0` = sin límite) |
| `MAX_QUERY_COMPLEXITY` | `1000` | Coste máximo (`0` = sin límite) |
| `SEED_SCALE` | `1` | Multiplica el volumen del seed |
| `NODE_ENV` | `development` | En `production` se desactivan la introspección, Sandbox y `synchronize` |

## Tests

```bash
npm run db:up && npm run seed
npm run test:e2e
```

Cubren: número de SQL con y sin DataLoader, que el cursor no repita elementos tras una inserción, el rechazo por profundidad, complejidad y tamaño de página, la regla `NO_COPIES_AVAILABLE` y la validación de entrada.

## Notas técnicas

- **NestJS 12 se distribuye como ESM** y este proyecto es CommonJS (la plantilla por defecto de `nest new`): funciona gracias al `require(esm)` de Node 24. Por eso los tests usan `--experimental-vm-modules`, y el plugin de Sandbox se carga con `import()` para usar la misma copia de `@apollo/server` que `@nestjs/apollo`.
- `graphql` se queda en la versión 16 porque `@apollo/server` 5 y `graphql-subscriptions` 3 aún no admiten la 17.
- No se usa `@types/graphql-depth-limit` porque instala `graphql@14`; hay una declaración mínima en [src/types/](src/types/).
- `synchronize: true` crea las tablas a partir de las entidades. Vale para la demo, no para producción.

## Pendientes

- [ ] **Comparativa con REST**: endpoints equivalentes (`/authors/:id`, `/authors/:id/books`…) para mostrar over-fetching y under-fetching frente a una sola query GraphQL.
- [ ] Migraciones de TypeORM en lugar de `synchronize`.
- [ ] PubSub con Redis para poder escalar a varias instancias.
- [ ] Persisted queries (APQ) y caché de respuestas.
- [ ] Autenticación y autorización por campo.
- [ ] Dockerfile de la app y ejemplo de federation.
