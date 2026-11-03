import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Book } from '../books/book.entity';

/**
 * La misma clase es entidad de TypeORM y tipo de GraphQL.
 * Las relaciones (books) NO llevan @Field: se resuelven con @ResolveField
 * en el resolver para controlar cómo se cargan (y poder enseñar el N+1).
 */
@ObjectType({ description: 'Autor de uno o varios libros' })
@Entity('authors')
export class Author {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'birth_year', type: 'int', nullable: true })
  birthYear: number | null;

  @Field()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', precision: 3 })
  createdAt: Date;

  @OneToMany(() => Book, (book) => book.author)
  books: Relation<Book[]>;
}
