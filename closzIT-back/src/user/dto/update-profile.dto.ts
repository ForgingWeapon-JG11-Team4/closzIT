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
  bodyType?: string;
  preferredStyles?: string[];
}
