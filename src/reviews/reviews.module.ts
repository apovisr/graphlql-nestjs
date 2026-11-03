import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/book.entity';
import { Reader } from '../readers/reader.entity';
import { Review } from './review.entity';
import { ReviewsResolver } from './reviews.resolver';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Book, Reader])],
  providers: [ReviewsResolver, ReviewsService],
})
export class ReviewsModule {}
