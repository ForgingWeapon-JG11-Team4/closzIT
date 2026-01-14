import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) { }

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
                flattenImageUrl: true,
                tpos: true,
                styleMoods: true,
                seasons: true,
                colors: true,
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

    // Check if current user liked each post and convert image URLs to presigned URLs
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

        // 이미지 URL을 Pre-signed URL로 변환
        const [postImageUrl, userProfileImage] = await Promise.all([
          this.s3Service.convertToPresignedUrl(post.imageUrl),
          this.s3Service.convertToPresignedUrl(post.user.profileImage),
        ]);

        // 의류 이미지들도 Pre-signed URL로 변환
        const postClothesWithPresigned = await Promise.all(
          post.postClothes.map(async (pc) => ({
            ...pc,
            clothing: {
              ...pc.clothing,
              imageUrl: await this.s3Service.convertToPresignedUrl(pc.clothing.imageUrl),
              flattenImageUrl: pc.clothing.flattenImageUrl
                ? await this.s3Service.convertToPresignedUrl(pc.clothing.flattenImageUrl)
                : null,
            },
          }))
        );

        return {
          ...post,
          imageUrl: postImageUrl,
          user: {
            ...post.user,
            profileImage: userProfileImage,
          },
          postClothes: postClothesWithPresigned,
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
                flattenImageUrl: true,
                tpos: true,
                styleMoods: true,
                seasons: true,
                colors: true,
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

        // 이미지 URL을 Pre-signed URL로 변환
        const [postImageUrl, userProfileImage] = await Promise.all([
          this.s3Service.convertToPresignedUrl(post.imageUrl),
          this.s3Service.convertToPresignedUrl(post.user.profileImage),
        ]);

        const postClothesWithPresigned = await Promise.all(
          post.postClothes.map(async (pc) => ({
            ...pc,
            clothing: {
              ...pc.clothing,
              imageUrl: await this.s3Service.convertToPresignedUrl(pc.clothing.imageUrl),
              flattenImageUrl: pc.clothing.flattenImageUrl
                ? await this.s3Service.convertToPresignedUrl(pc.clothing.flattenImageUrl)
                : null,
            },
          }))
        );

        return {
          ...post,
          imageUrl: postImageUrl,
          user: {
            ...post.user,
            profileImage: userProfileImage,
          },
          postClothes: postClothesWithPresigned,
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
                flattenImageUrl: true,
                tpos: true,
                styleMoods: true,
                seasons: true,
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

    // 이미지 URL을 Pre-signed URL로 변환
    const [postImageUrl, userProfileImage] = await Promise.all([
      this.s3Service.convertToPresignedUrl(post.imageUrl),
      this.s3Service.convertToPresignedUrl(post.user.profileImage),
    ]);

    const postClothesWithPresigned = await Promise.all(
      post.postClothes.map(async (pc) => ({
        ...pc,
        clothing: {
          ...pc.clothing,
          imageUrl: await this.s3Service.convertToPresignedUrl(pc.clothing.imageUrl),
          flattenImageUrl: pc.clothing.flattenImageUrl
            ? await this.s3Service.convertToPresignedUrl(pc.clothing.flattenImageUrl)
            : null,
        },
      }))
    );

    // 댓글 작성자 프로필 이미지도 변환
    const commentsWithPresigned = await Promise.all(
      post.comments.map(async (comment) => ({
        ...comment,
        user: {
          ...comment.user,
          profileImage: await this.s3Service.convertToPresignedUrl(comment.user.profileImage),
        },
      }))
    );

    return {
      ...post,
      imageUrl: postImageUrl,
      user: {
        ...post.user,
        profileImage: userProfileImage,
      },
      postClothes: postClothesWithPresigned,
      comments: commentsWithPresigned,
      isLiked: !!liked,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    };
  }

  // 게시물 생성
  async createPost(userId: string, imageUrl: string, caption: string, clothingIds: string[]) {
    try {
      this.logger.log(`Creating post for user: ${userId}`);

      // Base64 이미지인 경우 S3에 업로드
      let finalImageUrl = imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        const postId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        finalImageUrl = await this.s3Service.uploadBase64Image(
          imageUrl,
          `users/${userId}/posts/${postId}.png`,
          'image/png'
        );
        this.logger.log(`Uploaded post image to S3: ${finalImageUrl}`);
      }

      const post = await this.prisma.post.create({
        data: {
          userId,
          imageUrl: finalImageUrl,
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

      this.logger.log(`Post created successfully: ${post.id}`);
      return post;
    } catch (error) {
      this.logger.error('Error creating post:', error);
      throw error;
    }
  }

  // 게시물 수정
  async updatePost(postId: string, userId: string, caption: string, clothingIds?: string[]) {
    // Check ownership
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.userId !== userId) {
      return null;
    }

    // clothingIds가 제공된 경우 postClothes 관계도 업데이트
    if (clothingIds !== undefined) {
      // 기존 postClothes 삭제
      await this.prisma.postClothing.deleteMany({
        where: { postId },
      });

      // 새로운 postClothes 생성
      if (clothingIds.length > 0) {
        await this.prisma.postClothing.createMany({
          data: clothingIds.map((clothingId) => ({
            postId,
            clothingId,
          })),
        });
      }
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: { caption },
      include: {
        postClothes: {
          include: {
            clothing: true,
          },
        },
      },
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
