import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Book } from '../books/book.entity';
import { Reader } from '../readers/reader.entity';

@ObjectType({ description: 'Reseña de un lector sobre un libro' })
@Entity('reviews')
@Index(['bookId', 'createdAt'])
@Index(['readerId', 'createdAt'])
@Check('"rating" BETWEEN 1 AND 5')
export class Review {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int, { description: 'Valoración de 1 a 5' })
  @Column({ type: 'int' })
  rating: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
  createdAt: Date;

  @Column({ name: 'book_id' })
  bookId: number;

  @Column({ name: 'reader_id' })
  readerId: number;

  @ManyToOne(() => Book, (book) => book.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Relation<Book>;

  @ManyToOne(() => Reader, (reader) => reader.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reader_id' })
  reader: Relation<Reader>;
}
