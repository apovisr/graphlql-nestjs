import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Book } from '../books/book.entity';

@ObjectType({ description: 'Género literario (relación N:M con libros)' })
@Entity('genres')
export class Genre {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Book, (book) => book.genres)
  books: Relation<Book[]>;
}
