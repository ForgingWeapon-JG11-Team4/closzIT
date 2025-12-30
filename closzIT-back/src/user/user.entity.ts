// src/user/user.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Google OAuth 정보
  @Column({ unique: true })
  googleId: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  profileImage: string;

  // Setup 1 정보 (UserProfileSetup1)
  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  gender: string; // 'male' | 'female'

  @Column({ type: 'date', nullable: true })
  birthday: Date;

  @Column({ nullable: true })
  province: string; // 도/광역시

  @Column({ nullable: true })
  city: string; // 시/군/구

  // Setup 2 정보 (UserProfileSetup2)
  @Column({ nullable: true })
  hairColor: string;

  @Column({ nullable: true })
  personalColor: string; // 'spring' | 'summer' | 'autumn' | 'winter'

  @Column({ nullable: true })
  bodyType: string;

  @Column('simple-array', { nullable: true })
  preferredStyles: string[]; // ['캐주얼', '미니멀', ...]

  @Column({ default: false })
  isProfileComplete: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
