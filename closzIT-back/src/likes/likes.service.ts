import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.like.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
      });

      return { liked: false };
    } else {
      // Like
      await this.prisma.like.create({
        data: {
          postId,
          userId,
        },
      });

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
      });

      return { liked: true };
    }
  }
}
