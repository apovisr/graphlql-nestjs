// El paquete @types/graphql-depth-limit arrastra graphql@14 y rompe los tipos,
// así que declaramos solo lo que usamos.
declare module 'graphql-depth-limit' {
  import type { ValidationRule } from 'graphql';

  export default function depthLimit(
    maxDepth: number,
    options?: {
      ignore?: Array<string | RegExp | ((field: string) => boolean)>;
    },
    callback?: (depths: Record<string, number>) => void,
  ): ValidationRule;
}
