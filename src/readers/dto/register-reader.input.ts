import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, Length } from 'class-validator';

@InputType()
export class RegisterReaderInput {
  @Field()
  @IsString()
  @Length(2, 120)
  name: string;

  @Field()
  @IsEmail()
  email: string;
}
