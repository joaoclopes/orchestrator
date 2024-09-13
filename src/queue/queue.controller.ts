import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { QueueService } from './queue.service';
import { AddUserDto } from './dto/add-user.dto';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('add')
  addUserToQueue(@Body() addUserDto: AddUserDto) {
    const { userId, queueId } = addUserDto;
    const position = this.queueService.addUserToQueue(userId, queueId);
    return { userId, position };
  }

  @Get('position/:userId/:queueId')
  getUserPosition(@Param('userId') userId: string, @Param('queueId') queueId: string) {
    const position = this.queueService.getUserPosition(userId, queueId);
    return { userId, position };
  }
}
