import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('likes')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('toggle')
  async toggleLike(@Request() req, @Body() body: { postId: string }) {
    const userId = req.user.userId;
    return this.likesService.toggleLike(body.postId, userId);
  }
}
