import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async createComment(
    @Request() req,
    @Body() body: { postId: string; content: string },
  ) {
    const userId = req.user.userId;
    return this.commentsService.createComment(body.postId, userId, body.content);
  }

  @Delete(':id')
  async deleteComment(@Request() req, @Param('id') commentId: string) {
    const userId = req.user.userId;
    const success = await this.commentsService.deleteComment(commentId, userId);

    if (!success) {
      throw new HttpException(
        'Comment not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    return { message: 'Comment deleted successfully' };
  }
}
