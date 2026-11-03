import { ObjectType } from '@nestjs/graphql';
import {
  Connection,
  OffsetPage,
} from '../../common/pagination/pagination.types';
import { Book } from '../book.entity';
import type { BookFilterInput } from './book-filter.input';

@ObjectType({ description: 'Página de libros por offset' })
export class BookPage extends OffsetPage(Book) {}

@ObjectType({
  description: 'Página de libros por cursor (spec Relay Connections)',
})
export class BookConnection extends Connection(Book) {
  /** Filtro usado; lo necesita `totalCount`. No se expone en el schema. */
  filter?: BookFilterInput;
}
