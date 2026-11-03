import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Book } from '../books/book.entity';
import { BusinessRuleError, NotFoundError } from '../common/graphql/errors';
import { PUB_SUB, type LibraryPubSub } from '../common/pubsub/pubsub.module';
import { Reader } from '../readers/reader.entity';
import { Loan } from './loan.entity';

const LOAN_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LoansService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(PUB_SUB) private readonly pubSub: LibraryPubSub,
  ) {}

  async borrow(bookId: number, readerId: number): Promise<Loan> {
    const loan = await this.dataSource.transaction(async (manager) => {
      if (!(await manager.existsBy(Reader, { id: readerId }))) {
        throw new NotFoundError('Lector', readerId);
      }
      // UPDATE atómico: si dos personas piden el último ejemplar a la vez,
      // solo una consigue que "available_copies > 0" se cumpla.
      const { affected } = await manager
        .createQueryBuilder()
        .update(Book)
        .set({ availableCopies: () => 'available_copies - 1' })
        .where('id = :bookId AND available_copies > 0', { bookId })
        .execute();
      if (!affected) {
        if (!(await manager.existsBy(Book, { id: bookId }))) {
          throw new NotFoundError('Libro', bookId);
        }
        throw new BusinessRuleError(
          'No quedan ejemplares disponibles de este libro',
          'NO_COPIES_AVAILABLE',
        );
      }
      const loanedAt = new Date();
      return manager.save(
        manager.create(Loan, {
          bookId,
          readerId,
          loanedAt,
          dueAt: new Date(loanedAt.getTime() + LOAN_DAYS * DAY_MS),
          returnedAt: null,
        }),
      );
    });
    await this.publishAvailability(bookId);
    return loan;
  }

  async giveBack(loanId: number): Promise<Loan> {
    const loan = await this.dataSource.transaction(async (manager) => {
      const loan = await manager.findOne(Loan, {
        where: { id: loanId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!loan) throw new NotFoundError('Préstamo', loanId);
      if (loan.returnedAt) {
        throw new BusinessRuleError(
          'Este préstamo ya se devolvió',
          'LOAN_ALREADY_RETURNED',
        );
      }
      loan.returnedAt = new Date();
      await manager.save(loan);
      await manager.increment(Book, { id: loan.bookId }, 'availableCopies', 1);
      return loan;
    });
    await this.publishAvailability(loan.bookId);
    return loan;
  }

  private async publishAvailability(bookId: number): Promise<void> {
    const book = await this.dataSource
      .getRepository(Book)
      .findOneByOrFail({ id: bookId });
    await this.pubSub.publish('bookAvailabilityChanged', {
      bookAvailabilityChanged: book,
    });
  }
}
