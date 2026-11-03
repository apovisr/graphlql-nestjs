import { ParseIntPipe } from '@nestjs/common';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { paginatedComplexity } from '../common/graphql/complexity';
import {
  NestedListArgs,
  OffsetPaginationArgs,
} from '../common/pagination/pagination.args';
import { Loan } from '../loans/loan.entity';
import type { Loaders } from '../loaders/loaders';
import { Review } from '../reviews/review.entity';
import { ReaderPage } from './dto/reader-page.type';
import { RegisterReaderInput } from './dto/register-reader.input';
import { Reader } from './reader.entity';
import { ReadersService } from './readers.service';

@Resolver(() => Reader)
export class ReadersResolver {
  constructor(private readonly readersService: ReadersService) {}

  @Query(() => ReaderPage, { complexity: paginatedComplexity })
  readers(@Args() pagination: OffsetPaginationArgs): Promise<ReaderPage> {
    return this.readersService.findPage(pagination);
  }

  @Query(() => Reader, { nullable: true })
  reader(@Args('id', { type: () => ID }, ParseIntPipe) id: number) {
    return this.readersService.findById(id);
  }

  @Mutation(() => Reader)
  registerReader(@Args('input') input: RegisterReaderInput): Promise<Reader> {
    return this.readersService.register(input);
  }

  @ResolveField(() => [Review], { complexity: paginatedComplexity })
  reviews(
    @Parent() reader: Reader,
    @Args() { first }: NestedListArgs,
    @Context('loaders') loaders: Loaders,
  ): Promise<Review[]> {
    return loaders.reviewsByReaderId(first).load(reader.id);
  }

  @ResolveField(() => [Loan], { complexity: paginatedComplexity })
  loans(
    @Parent() reader: Reader,
    @Args() { first }: NestedListArgs,
    @Context('loaders') loaders: Loaders,
  ): Promise<Loan[]> {
    return loaders.loansByReaderId(first).load(reader.id);
  }
}
