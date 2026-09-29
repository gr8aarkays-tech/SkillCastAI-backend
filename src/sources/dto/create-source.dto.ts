import { IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { SourceType } from '../source.entity.js';

export class CreateTextSourceDto {
  @IsEnum(SourceType)
  type!: SourceType;

  @IsString()
  @MinLength(10, { message: 'Content must be at least 10 characters' })
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}

export class CreateUrlSourceDto {
  @IsUrl({}, { message: 'Must be a valid URL' })
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
