import type { ComplexityEstimatorArgs } from '@nestjs/graphql';

/**
 * Coste de un campo que devuelve una lista paginada: el coste de cada
 * elemento multiplicado por cuántos se piden (`first` o `limit`).
 *
 *   authors(limit: 100) { books(first: 100) { title } }
 *   => 1 + 100 * (1 + 100 * 1) = 10.101 puntos
 */
export function paginatedComplexity({
  args,
  childComplexity,
}: ComplexityEstimatorArgs): number {
  const pageSize = Number(args.first ?? args.limit ?? 1);
  return 1 + pageSize * childComplexity;
}
