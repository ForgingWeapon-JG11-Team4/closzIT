import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post('toggle')
  async toggleFollow(@Request() req, @Body() body: { userId: string }) {
    const followerId = req.user.userId;
    return this.followService.toggleFollow(followerId, body.userId);
  }

  @Get('followers/:userId')
  async getFollowers(@Param('userId') userId: string) {
    return this.followService.getFollowers(userId);
  }

  @Get('following/:userId')
  async getFollowing(@Param('userId') userId: string) {
    return this.followService.getFollowing(userId);
  }

  @Get('is-following/:userId')
  async isFollowing(@Request() req, @Param('userId') targetUserId: string) {
    const currentUserId = req.user.userId;
    const following = await this.followService.isFollowing(currentUserId, targetUserId);
    return { following };
  }
}
