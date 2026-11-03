import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Genre } from './genre.entity';
import { GenresResolver } from './genres.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Genre])],
  providers: [GenresResolver],
})
export class GenresModule {}
