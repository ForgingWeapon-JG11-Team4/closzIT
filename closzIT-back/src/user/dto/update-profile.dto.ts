// src/user/dto/update-profile.dto.ts

export class UpdateProfileDto {
  // Setup 1 정보
  name?: string;
  gender?: string;
  birthday?: string; // ISO date string
  province?: string;
  city?: string;

  // Setup 2 정보
  hairColor?: string;
  personalColor?: string;
  height?: number;
  weight?: number;
  bodyType?: string;
  preferredStyles?: string[];

  // Setup 3 정보
  fullBodyImage?: string; // Base64 encoded image or S3 URL

  // Profile image
  profileImage?: string; // S3 URL
}
