import { Module } from '@nestjs/common';
import { LoansResolver } from './loans.resolver';
import { LoansService } from './loans.service';

@Module({
  providers: [LoansResolver, LoansService],
})
export class LoansModule {}
