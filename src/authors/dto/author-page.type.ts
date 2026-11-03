import { ObjectType } from '@nestjs/graphql';
import { OffsetPage } from '../../common/pagination/pagination.types';
import { Author } from '../author.entity';

@ObjectType()
export class AuthorPage extends OffsetPage(Author) {}
