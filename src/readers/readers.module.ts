import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reader } from './reader.entity';
import { ReadersResolver } from './readers.resolver';
import { ReadersService } from './readers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reader])],
  providers: [ReadersResolver, ReadersService],
  exports: [ReadersService],
})
export class ReadersModule {}
