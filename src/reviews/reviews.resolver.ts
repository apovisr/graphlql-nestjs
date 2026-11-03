import { Inject } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Book } from '../books/book.entity';
import {
  PUB_SUB,
  type LibraryEvents,
  type LibraryPubSub,
} from '../common/pubsub/pubsub.module';
import type { Loaders } from '../loaders/loaders';
import { Reader } from '../readers/reader.entity';
import { AddReviewInput } from './dto/add-review.input';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';

@Resolver(() => Review)
export class ReviewsResolver {
  constructor(
    private readonly reviewsService: ReviewsService,
    @Inject(PUB_SUB) private readonly pubSub: LibraryPubSub,
  ) {}

  @Mutation(() => Review, {
    description: 'Publica una reseña y la emite por `reviewAdded`',
  })
  addReview(@Args('input') input: AddReviewInput): Promise<Review> {
    return this.reviewsService.add(input);
  }

  /**
   * Tiempo real por WebSocket (protocolo graphql-ws).
   * `filter` decide, evento a evento, si este suscriptor debe recibirlo.
   */
  @Subscription(() => Review, {
    description: 'Nuevas reseñas; con `bookId` solo las de ese libro',
    filter: (
      payload: LibraryEvents['reviewAdded'],
      variables: { bookId?: string },
    ) =>
      !variables.bookId ||
      payload.reviewAdded.bookId === Number(variables.bookId),
  })
  reviewAdded(
    @Args('bookId', { type: () => ID, nullable: true }) _bookId?: string,
  ) {
    return this.pubSub.asyncIterableIterator('reviewAdded');
  }

  @ResolveField(() => Book)
  book(
    @Parent() review: Review,
    @Context('loaders') loaders: Loaders,
  ): Promise<Book> {
    return loaders.bookById.load(review.bookId);
  }

  @ResolveField(() => Reader)
  reader(
    @Parent() review: Review,
    @Context('loaders') loaders: Loaders,
  ): Promise<Reader> {
    return loaders.readerById.load(review.readerId);
  }
}
