import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class RemoveUserDto {
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value.trim())
    userId: string;

    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value.trim())
    batchId: string;
  }
  