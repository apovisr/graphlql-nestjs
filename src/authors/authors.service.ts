import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import type { OffsetPaginationArgs } from '../common/pagination/pagination.args';
import { toOffsetPage } from '../common/pagination/pagination.types';
import { Author } from './author.entity';
import type { AuthorPage } from './dto/author-page.type';
import type { CreateAuthorInput } from './dto/create-author.input';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author) private readonly authors: Repository<Author>,
  ) {}

  async findPage(pagination: OffsetPaginationArgs): Promise<AuthorPage> {
    const [items, total] = await this.authors.findAndCount({
      order: { name: 'ASC', id: 'ASC' },
      skip: pagination.offset,
      take: pagination.limit,
    });
    return toOffsetPage(items, total, pagination);
  }

  findById(id: number): Promise<Author | null> {
    return this.authors.findOneBy({ id });
  }

  create(input: CreateAuthorInput): Promise<Author> {
    return this.authors.save(this.authors.create(input));
  }

  search(term: string, limit: number): Promise<Author[]> {
    return this.authors.find({
      where: { name: ILike(`%${term}%`) },
      order: { name: 'ASC' },
      take: limit,
    });
  }
}
