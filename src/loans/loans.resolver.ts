import { Inject, ParseIntPipe } from '@nestjs/common';
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
import { LoanStatus } from './loan-status.enum';
import { Loan } from './loan.entity';
import { LoansService } from './loans.service';

@Resolver(() => Loan)
export class LoansResolver {
  constructor(
    private readonly loansService: LoansService,
    @Inject(PUB_SUB) private readonly pubSub: LibraryPubSub,
  ) {}

  @Mutation(() => Loan, {
    description: 'Presta un ejemplar. Error NO_COPIES_AVAILABLE si no quedan.',
  })
  borrowBook(
    @Args('bookId', { type: () => ID }, ParseIntPipe) bookId: number,
    @Args('readerId', { type: () => ID }, ParseIntPipe) readerId: number,
  ): Promise<Loan> {
    return this.loansService.borrow(bookId, readerId);
  }

  @Mutation(() => Loan, {
    description: 'Devuelve un préstamo y libera el ejemplar',
  })
  returnBook(
    @Args('loanId', { type: () => ID }, ParseIntPipe) loanId: number,
  ): Promise<Loan> {
    return this.loansService.giveBack(loanId);
  }

  @Subscription(() => Book, {
    description:
      'Cambios en los ejemplares disponibles (préstamos y devoluciones)',
    filter: (
      payload: LibraryEvents['bookAvailabilityChanged'],
      variables: { bookId?: string },
    ) =>
      !variables.bookId ||
      payload.bookAvailabilityChanged.id === Number(variables.bookId),
  })
  bookAvailabilityChanged(
    @Args('bookId', { type: () => ID, nullable: true }) _bookId?: string,
  ) {
    return this.pubSub.asyncIterableIterator('bookAvailabilityChanged');
  }

  @ResolveField(() => LoanStatus, {
    description: 'Campo calculado, no existe en la BD',
  })
  status(@Parent() loan: Loan): LoanStatus {
    if (loan.returnedAt) return LoanStatus.RETURNED;
    return loan.dueAt < new Date() ? LoanStatus.OVERDUE : LoanStatus.ACTIVE;
  }

  @ResolveField(() => Book)
  book(
    @Parent() loan: Loan,
    @Context('loaders') loaders: Loaders,
  ): Promise<Book> {
    return loaders.bookById.load(loan.bookId);
  }

  @ResolveField(() => Reader)
  reader(
    @Parent() loan: Loan,
    @Context('loaders') loaders: Loaders,
  ): Promise<Reader> {
    return loaders.readerById.load(loan.readerId);
  }
}
