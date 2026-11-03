import { ConfigType, registerAs } from '@nestjs/config';

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(
      `La variable de entorno ${name} debe ser un entero (valor: "${raw}")`,
    );
  }
  return value;
}

/**
 * Lee la configuración desde process.env. Se usa tanto desde Nest
 * (vía ConfigModule) como desde el script de seed.
 */
export function loadEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: int('PORT', 3000),
    db: {
      host: process.env.DB_HOST ?? 'localhost',
      port: int('DB_PORT', 5432),
      user: process.env.DB_USER ?? 'biblioteca',
      password: process.env.DB_PASSWORD ?? 'biblioteca',
      name: process.env.DB_NAME ?? 'biblioteca',
      logSql: process.env.DB_LOG_SQL === 'true',
    },
    graphql: {
      /** Profundidad máxima de una operación (0 = sin límite). */
      maxDepth: int('MAX_QUERY_DEPTH', 7),
      /** Coste máximo calculado de una operación (0 = sin límite). */
      maxComplexity: int('MAX_QUERY_COMPLEXITY', 1000),
    },
  };
}

export const appConfig = registerAs('app', loadEnv);
export type AppConfig = ConfigType<typeof appConfig>;
