import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { Reader } from '../readers/reader.entity';

@ObjectType({ description: 'Préstamo de un ejemplar a un lector' })
@Entity('loans')
@Index(['bookId', 'loanedAt'])
@Index(['readerId', 'loanedAt'])
export class Loan {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ name: 'loaned_at', type: 'timestamptz', precision: 3 })
  loanedAt: Date;

  @Field({ description: 'Fecha límite de devolución' })
  @Column({ name: 'due_at', type: 'timestamptz', precision: 3 })
  dueAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({
    name: 'returned_at',
    type: 'timestamptz',
    precision: 3,
    nullable: true,
  })
  returnedAt: Date | null;

  @Column({ name: 'book_id' })
  bookId: number;

  @Column({ name: 'reader_id' })
  readerId: number;

  @ManyToOne(() => Book, (book) => book.loans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Relation<Book>;

  @ManyToOne(() => Reader, (reader) => reader.loans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reader_id' })
  reader: Relation<Reader>;
}
