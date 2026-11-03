import { Module } from '@nestjs/common';
import { AuthorsModule } from '../authors/authors.module';
import { BooksModule } from '../books/books.module';
import { ReadersModule } from '../readers/readers.module';
import { SearchResolver } from './search.resolver';

@Module({
  imports: [AuthorsModule, BooksModule, ReadersModule],
  providers: [SearchResolver],
})
export class SearchModule {}
