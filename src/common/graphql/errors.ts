import { Catch } from '@nestjs/common';
import type { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * Errores "esperados": viajan al cliente en `errors[].extensions.code`
 * para que pueda reaccionar según el código, no según el texto.
 */
export class NotFoundError extends GraphQLError {
  constructor(entity: string, id: number) {
    super(`${entity} ${id} no existe`, { extensions: { code: 'NOT_FOUND' } });
  }
}

export class BusinessRuleError extends GraphQLError {
  constructor(message: string, code: string) {
    super(message, { extensions: { code } });
  }
}

export class BadUserInputError extends GraphQLError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { extensions: { code: 'BAD_USER_INPUT', ...details } });
  }
}

/**
 * Los GraphQLError que lanzamos a propósito se devuelven tal cual a Apollo.
 * Sin este filtro, Nest los registraría en consola como errores inesperados.
 */
@Catch(GraphQLError)
export class GraphQLErrorFilter implements GqlExceptionFilter {
  catch(exception: GraphQLError) {
    return exception;
  }
}
