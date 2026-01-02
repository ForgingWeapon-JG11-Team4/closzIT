import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async createComment(postId: string, userId: string, content: string) {
    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    // Update comments count
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        commentsCount: {
          increment: 1,
        },
      },
    });

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.userId !== userId) {
      return false;
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    // Update comments count
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: {
        commentsCount: {
          decrement: 1,
        },
      },
    });

    return true;
  }
}
