import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { BusinessRuleError } from '../common/graphql/errors';
import type { OffsetPaginationArgs } from '../common/pagination/pagination.args';
import { toOffsetPage } from '../common/pagination/pagination.types';
import type { ReaderPage } from './dto/reader-page.type';
import type { RegisterReaderInput } from './dto/register-reader.input';
import { Reader } from './reader.entity';

@Injectable()
export class ReadersService {
  constructor(
    @InjectRepository(Reader) private readonly readers: Repository<Reader>,
  ) {}

  async findPage(pagination: OffsetPaginationArgs): Promise<ReaderPage> {
    const [items, total] = await this.readers.findAndCount({
      order: { name: 'ASC', id: 'ASC' },
      skip: pagination.offset,
      take: pagination.limit,
    });
    return toOffsetPage(items, total, pagination);
  }

  findById(id: number): Promise<Reader | null> {
    return this.readers.findOneBy({ id });
  }

  async register(input: RegisterReaderInput): Promise<Reader> {
    const email = input.email.toLowerCase();
    if (await this.readers.existsBy({ email })) {
      throw new BusinessRuleError(
        `Ya existe un lector con el email ${email}`,
        'EMAIL_TAKEN',
      );
    }
    return this.readers.save(this.readers.create({ ...input, email }));
  }

  search(term: string, limit: number): Promise<Reader[]> {
    return this.readers.find({
      where: { name: ILike(`%${term}%`) },
      order: { name: 'ASC' },
      take: limit,
    });
  }
}
