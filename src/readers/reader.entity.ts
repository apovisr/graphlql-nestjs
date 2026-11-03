import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Review } from '../reviews/review.entity';

@ObjectType({
  description: 'Socio de la biblioteca: escribe reseñas y pide préstamos',
})
@Entity('readers')
export class Reader {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @CreateDateColumn({ name: 'member_since', type: 'timestamptz', precision: 3 })
  memberSince: Date;

  @OneToMany(() => Review, (review) => review.reader)
  reviews: Relation<Review[]>;

  @OneToMany(() => Loan, (loan) => loan.reader)
  loans: Relation<Loan[]>;
}
