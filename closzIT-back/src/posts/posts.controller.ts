import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('feed')
  async getFeed(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const userId = req.user.id;
    return this.postsService.getFeed(userId, parseInt(page), parseInt(limit));
  }

  @Get('user/:userId')
  async getUserPosts(
    @Request() req,
    @Param('userId') targetUserId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const currentUserId = req.user.id;
    return this.postsService.getUserPosts(
      targetUserId,
      currentUserId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id')
  async getPost(@Request() req, @Param('id') postId: string) {
    const userId = req.user.id;
    const post = await this.postsService.getPostById(postId, userId);

    if (!post) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }

    return post;
  }

  @Post()
  async createPost(
    @Request() req,
    @Body() body: { imageUrl: string; caption?: string; clothingIds?: string[] },
  ) {
    const userId = req.user.id;
    const { imageUrl, caption = '', clothingIds = [] } = body;

    return this.postsService.createPost(userId, imageUrl, caption, clothingIds);
  }

  @Put(':id')
  async updatePost(
    @Request() req,
    @Param('id') postId: string,
    @Body() body: { caption: string },
  ) {
    const userId = req.user.id;
    const post = await this.postsService.updatePost(postId, userId, body.caption);

    if (!post) {
      throw new HttpException(
        'Post not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    return post;
  }

  @Delete(':id')
  async deletePost(@Request() req, @Param('id') postId: string) {
    const userId = req.user.id;
    const success = await this.postsService.deletePost(postId, userId);

    if (!success) {
      throw new HttpException(
        'Post not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    return { message: 'Post deleted successfully' };
  }
}
