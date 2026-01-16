import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
    private readonly logger = new Logger(S3Service.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly region: string;

    constructor(private readonly configService: ConfigService) {
        this.region = this.configService.get<string>('AWS_S3_REGION', 'ap-northeast-2');
        this.bucketName = this.configService.get<string>('AWS_S3_BUCKET', '');

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
            },
        });

        if (this.bucketName) {
            this.logger.log(`S3 Service initialized with bucket: ${this.bucketName}`);
        } else {
            this.logger.warn('S3 bucket name is not configured. S3 uploads will fail.');
        }
    }

    /**
     * Base64 이미지를 S3에 업로드하고 URL을 반환합니다.
     * @param base64Data - Base64 인코딩된 이미지 데이터 (data:image/... prefix 포함 가능)
     * @param key - S3 객체 키 (예: users/{userId}/clothes/{clothingId}.png)
     * @param contentType - MIME 타입 (기본값: image/png)
     * @param bucketName - 사용할 버킷 이름 (기본값: 환경변수 AWS_S3_BUCKET)
     * @returns S3 객체 URL
     */
    async uploadBase64Image(
        base64Data: string,
        key: string,
        contentType: string = 'image/png',
        bucketName?: string,
    ): Promise<string> {
        const targetBucket = bucketName || this.bucketName;

        try {
            // data:image/png;base64, 프리픽스 제거
            let pureBase64 = base64Data;
            if (base64Data.includes(',')) {
                const parts = base64Data.split(',');
                pureBase64 = parts[1];
                // contentType 추출 시도
                const match = parts[0].match(/data:([^;]+);/);
                if (match) {
                    contentType = match[1];
                }
            }

            // Base64를 Buffer로 변환
            const buffer = Buffer.from(pureBase64, 'base64');

            const command = new PutObjectCommand({
                Bucket: targetBucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
                // Public read 권한 (버킷 정책에 따라 조정 필요)
                // ACL: 'public-read',
            });

            await this.s3Client.send(command);

            // S3 URL 생성
            const url = `https://${targetBucket}.s3.${this.region}.amazonaws.com/${key}`;
            this.logger.log(`Uploaded image to S3: ${key}`);

            return url;
        } catch (error) {
            this.logger.error(`Failed to upload image to S3: ${key}`, error);
            throw error;
        }
    }

    /**
     * Buffer를 S3에 직접 업로드하고 URL을 반환합니다.
     * @param buffer - 업로드할 파일 버퍼
     * @param key - S3 객체 키 (예: users/{userId}/posts/{postId}.png)
     * @param contentType - MIME 타입 (기본값: image/png)
     * @returns S3 객체 URL
     */
    async uploadBuffer(
        buffer: Buffer,
        key: string,
        contentType: string = 'image/png',
    ): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            });

            await this.s3Client.send(command);

            const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
            this.logger.log(`Uploaded buffer to S3: ${key}`);

            return url;
        } catch (error) {
            this.logger.error(`Failed to upload buffer to S3: ${key}`, error);
            throw error;
        }
    }

    /**
     * S3 객체를 삭제합니다.
     * @param key - 삭제할 객체 키
     */
    async deleteObject(key: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            this.logger.log(`Deleted object from S3: ${key}`);
        } catch (error) {
            this.logger.error(`Failed to delete object from S3: ${key}`, error);
            throw error;
        }
    }

    /**
     * 특정 prefix로 시작하는 모든 파일을 삭제합니다.
     * @param prefix - 삭제할 파일의 prefix (예: users/userId/fullbody)
     */
    async deleteFolder(prefix: string): Promise<void> {
        try {
            // 폴더 내 모든 객체 목록 조회
            const listCommand = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: prefix,
            });

            const listResponse = await this.s3Client.send(listCommand);

            if (!listResponse.Contents || listResponse.Contents.length === 0) {
                this.logger.log(`No objects found with prefix: ${prefix}`);
                return;
            }

            // 모든 객체 삭제
            const deleteCommand = new DeleteObjectsCommand({
                Bucket: this.bucketName,
                Delete: {
                    Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
                },
            });

            await this.s3Client.send(deleteCommand);
            this.logger.log(`Deleted ${listResponse.Contents.length} objects with prefix: ${prefix}`);
        } catch (error) {
            this.logger.error(`Failed to delete folder with prefix: ${prefix}`, error);
            throw error;
        }
    }

    /**
     * 사용자 폴더 전체를 삭제합니다 (회원 탈퇴 시 사용).
     * @param userId - 사용자 ID
     */
    async deleteUserFolder(userId: string): Promise<void> {
        try {
            const prefix = `users/${userId}/`;
            await this.deleteFolder(prefix);
        } catch (error) {
            this.logger.error(`Failed to delete user folder: ${userId}`, error);
            throw error;
        }
    }

    /**
     * S3 URL에서 객체 키를 추출합니다.
     * @param url - S3 URL
     * @returns 객체 키 또는 null
     */
    extractKeyFromUrl(url: string): string | null {
        if (!url || !url.includes('.s3.')) {
            return null;
        }

        try {
            const urlObj = new URL(url);
            // pathname에서 첫 번째 '/' 제거
            return urlObj.pathname.substring(1);
        } catch {
            return null;
        }
    }

    /**
     * S3 URL에서 버킷 이름을 추출합니다.
     * @param url - S3 URL
     * @returns 버킷 이름 또는 null
     */
    extractBucketFromUrl(url: string): string | null {
        if (!url || !url.includes('.s3.')) {
            return null;
        }

        try {
            const urlObj = new URL(url);
            // hostname에서 버킷 이름 추출 (예: bucket-name.s3.region.amazonaws.com)
            const hostParts = urlObj.hostname.split('.');
            if (hostParts.length >= 4 && hostParts[1] === 's3') {
                return hostParts[0];
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * 주어진 URL이 S3 URL인지 확인합니다.
     */
    isS3Url(url: string): boolean {
        return url?.includes('.s3.') && url?.includes('.amazonaws.com');
    }

    /**
     * 주어진 URL이 Base64 Data URL인지 확인합니다.
     */
    isBase64Url(url: string): boolean {
        return url?.startsWith('data:image/');
    }

    /**
     * S3 객체에 대한 Pre-signed URL을 생성합니다.
     * @param key - S3 객체 키
     * @param expiresIn - URL 유효 시간 (초, 기본값: 3600 = 1시간)
     * @param bucketName - 사용할 버킷 이름 (기본값: 환경변수 AWS_S3_BUCKET)
     * @returns Pre-signed URL
     */
    async getPresignedUrl(key: string, expiresIn: number = 3600, bucketName?: string): Promise<string> {
        const targetBucket = bucketName || this.bucketName;

        try {
            const command = new GetObjectCommand({
                Bucket: targetBucket,
                Key: key,
            });

            const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
            return presignedUrl;
        } catch (error) {
            this.logger.error(`Failed to generate presigned URL for key: ${key}`, error);
            throw error;
        }
    }

    /**
     * S3 객체가 존재하는지 확인합니다.
     * @param key - S3 객체 키
     * @returns 파일 존재 여부
     */
    async checkObjectExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            this.logger.error(`Error checking if S3 object exists: ${key}`, error);
            return false;
        }
    }

    /**
     * S3 URL 또는 키를 Pre-signed URL로 변환합니다.
     * Base64 URL이나 이미 Pre-signed URL인 경우 그대로 반환합니다.
     * @param urlOrKey - S3 URL, S3 키, 또는 Base64 URL
     * @param expiresIn - URL 유효 시간 (초, 기본값: 3600 = 1시간)
     * @returns Pre-signed URL 또는 원본 URL
     */
    async convertToPresignedUrl(urlOrKey: string | null | undefined, expiresIn: number = 3600): Promise<string | null> {
        if (!urlOrKey) {
            return null;
        }

        // Base64 URL인 경우 그대로 반환
        if (this.isBase64Url(urlOrKey)) {
            return urlOrKey;
        }

        // 이미 Pre-signed URL인 경우 그대로 반환 (X-Amz-Signature 포함)
        if (urlOrKey.includes('X-Amz-Signature=')) {
            return urlOrKey;
        }

        // S3 URL인 경우 키와 버킷을 추출하여 Pre-signed URL 생성
        if (this.isS3Url(urlOrKey)) {
            const key = this.extractKeyFromUrl(urlOrKey);
            const bucket = this.extractBucketFromUrl(urlOrKey);
            if (key) {
                return this.getPresignedUrl(key, expiresIn, bucket || undefined);
            }
        }

        // 키만 있는 경우 (users/... 형태)
        if (urlOrKey.startsWith('users/')) {
            return this.getPresignedUrl(urlOrKey, expiresIn);
        }

        // 그 외의 경우 그대로 반환
        return urlOrKey;
    }
}
