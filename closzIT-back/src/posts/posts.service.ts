import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  // 피드 조회 (팔로잉한 사람들 + 본인 게시물)
  async getFeed(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const posts = await this.prisma.post.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        postClothes: {
          include: {
            clothing: {
              select: {
                id: true,
                category: true,
                subCategory: true,
                imageUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Check if current user liked each post
    const postsWithLikeStatus = await Promise.all(
      posts.map(async (post) => {
        const liked = await this.prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId,
            },
          },
        });

        return {
          ...post,
          isLiked: !!liked,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
        };
      }),
    );

    return postsWithLikeStatus;
  }

  // 특정 유저의 게시물 조회
  async getUserPosts(targetUserId: string, currentUserId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const posts = await this.prisma.post.findMany({
      where: { userId: targetUserId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        postClothes: {
          include: {
            clothing: {
              select: {
                id: true,
                category: true,
                subCategory: true,
                imageUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const postsWithLikeStatus = await Promise.all(
      posts.map(async (post) => {
        const liked = await this.prisma.like.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: currentUserId,
            },
          },
        });

        return {
          ...post,
          isLiked: !!liked,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
        };
      }),
    );

    return postsWithLikeStatus;
  }

  // 게시물 상세 조회
  async getPostById(postId: string, currentUserId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        postClothes: {
          include: {
            clothing: {
              select: {
                id: true,
                category: true,
                subCategory: true,
                imageUrl: true,
                colors: true,
                patterns: true,
              },
            },
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    const liked = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId: currentUserId,
        },
      },
    });

    return {
      ...post,
      isLiked: !!liked,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    };
  }

  // 게시물 생성
  async createPost(userId: string, imageUrl: string, caption: string, clothingIds: string[]) {
    try {
      console.log('Creating post with:', { userId, imageUrlLength: imageUrl?.length, caption, clothingIds });

      const post = await this.prisma.post.create({
        data: {
          userId,
          imageUrl,
          caption,
          postClothes: {
            create: clothingIds.map((clothingId) => ({
              clothingId,
            })),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          postClothes: {
            include: {
              clothing: true,
            },
          },
        },
      });

      console.log('Post created successfully:', post.id);
      return post;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  // 게시물 수정
  async updatePost(postId: string, userId: string, caption: string) {
    // Check ownership
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.userId !== userId) {
      return null;
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: { caption },
    });
  }

  // 게시물 삭제
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.userId !== userId) {
      return false;
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return true;
  }
}
