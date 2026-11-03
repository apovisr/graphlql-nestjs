import { ObjectType } from '@nestjs/graphql';
import { OffsetPage } from '../../common/pagination/pagination.types';
import { Reader } from '../reader.entity';

@ObjectType()
export class ReaderPage extends OffsetPage(Reader) {}
