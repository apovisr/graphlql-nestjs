import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from '../authors/author.entity';
import { Genre } from '../genres/genre.entity';
import { Book } from './book.entity';
import { BookConnectionResolver, BooksResolver } from './books.resolver';
import { BooksService } from './books.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Author, Genre])],
  providers: [BooksResolver, BookConnectionResolver, BooksService],
  exports: [BooksService],
})
export class BooksModule {}
