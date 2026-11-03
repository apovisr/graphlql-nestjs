import { BadUserInputError } from '../graphql/errors';

export interface CursorPosition {
  createdAt: Date;
  id: number;
}

/**
 * El cursor codifica la posición (createdAt, id) del último elemento visto.
 * Se manda en base64 para que el cliente lo trate como algo opaco.
 */
export function encodeCursor({ createdAt, id }: CursorPosition): string {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString(
    'base64url',
  );
}

export function decodeCursor(cursor: string): CursorPosition {
  try {
    const [iso, id] = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    const createdAt = new Date(iso);
    if (Number.isInteger(id) && !Number.isNaN(createdAt.getTime())) {
      return { createdAt, id };
    }
  } catch {
    // Se trata abajo
  }
  throw new BadUserInputError('Cursor inválido');
}
