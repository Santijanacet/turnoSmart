import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') string) {
    return this.usersService.findOne(string);
  }

  @Post()
  async create(@Body() body: any) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: string, @Body() body: any, @Req() request: any) {
    return this.usersService.update(id, body, request.user?.role);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: string, @Req() request: any) {
    return this.usersService.softDelete(id, request.user?.role);
  }

  @Get(':id/notifications')
  async getNotifications(@Param('id') id: string) {
    return this.usersService.getNotifications(id);
  }

  @Patch(':id/notifications/:notificationId/read')
  async markNotificationRead(
    @Param('id') id: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.usersService.markNotificationRead(id, notificationId);
  }

  @Get('me')
  async getMe(@Query('userId') userId?: string) {
    if (!userId) {
      return { ok: true };
    }
    return this.usersService.findOne(userId);
  }
}
