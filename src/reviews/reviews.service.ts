import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/book.entity';
import { NotFoundError } from '../common/graphql/errors';
import { PUB_SUB, type LibraryPubSub } from '../common/pubsub/pubsub.module';
import { Reader } from '../readers/reader.entity';
import type { AddReviewInput } from './dto/add-review.input';
import { Review } from './review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(Book) private readonly books: Repository<Book>,
    @InjectRepository(Reader) private readonly readers: Repository<Reader>,
    @Inject(PUB_SUB) private readonly pubSub: LibraryPubSub,
  ) {}

  async add(input: AddReviewInput): Promise<Review> {
    if (!(await this.books.existsBy({ id: input.bookId }))) {
      throw new NotFoundError('Libro', input.bookId);
    }
    if (!(await this.readers.existsBy({ id: input.readerId }))) {
      throw new NotFoundError('Lector', input.readerId);
    }
    const review = await this.reviews.save(this.reviews.create(input));
    // Avisamos a todos los clientes suscritos a `reviewAdded`
    await this.pubSub.publish('reviewAdded', { reviewAdded: review });
    return review;
  }
}
