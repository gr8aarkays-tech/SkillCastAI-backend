import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileEntity } from './profile.entity.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
  ) {}

  async getProfile(userId: string): Promise<ProfileEntity> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileEntity> {
    // Upsert: find existing or create new
    let profile = await this.profileRepo.findOne({ where: { userId } });

    if (!profile) {
      profile = this.profileRepo.create({ userId });
    }

    if (dto.role !== undefined) profile.role = dto.role;
    if (dto.experienceLevel !== undefined) profile.experienceLevel = dto.experienceLevel;
    if (dto.learningGoal !== undefined) profile.learningGoal = dto.learningGoal;

    return this.profileRepo.save(profile);
  }
}
