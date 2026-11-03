import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Author } from '../authors/author.entity';
import { Genre } from '../genres/genre.entity';
import { Loan } from '../loans/loan.entity';
import { Review } from '../reviews/review.entity';

@ObjectType({ description: 'Libro del catálogo' })
@Entity('books')
// Índice para la paginación por cursor (keyset): ORDER BY created_at DESC, id DESC
@Index(['createdAt', 'id'])
@Index(['authorId', 'createdAt'])
@Check('"available_copies" >= 0 AND "available_copies" <= "total_copies"')
export class Book {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ unique: true })
  isbn: string;

  @Field(() => Int)
  @Column({ name: 'published_year', type: 'int' })
  publishedYear: number;

  @Field(() => Int)
  @Column({ type: 'int' })
  pages: number;

  @Field(() => Int, { description: 'Ejemplares que tiene la biblioteca' })
  @Column({ name: 'total_copies', type: 'int' })
  totalCopies: number;

  @Field(() => Int, {
    description: 'Ejemplares que se pueden prestar ahora mismo',
  })
  @Column({ name: 'available_copies', type: 'int' })
  availableCopies: number;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
  createdAt: Date;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => Author, (author) => author.books, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: Relation<Author>;

  @ManyToMany(() => Genre, (genre) => genre.books)
  @JoinTable({
    name: 'book_genres',
    joinColumn: { name: 'book_id' },
    inverseJoinColumn: { name: 'genre_id' },
  })
  genres: Relation<Genre[]>;

  @OneToMany(() => Review, (review) => review.book)
  reviews: Relation<Review[]>;

  @OneToMany(() => Loan, (loan) => loan.book)
  loans: Relation<Loan[]>;
}
