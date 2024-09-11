import { IsString } from 'class-validator';

export class AddUserDto {
  @IsString()
  userId: string;

  @IsString()
  queueId: string;
}
