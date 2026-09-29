import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExperienceLevel, UserRole } from '../profile.entity.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsEnum(UserRole, {
    message: `role must be one of: ${Object.values(UserRole).join(', ')}`,
  })
  role?: UserRole;

  @IsOptional()
  @IsEnum(ExperienceLevel, {
    message: `experienceLevel must be one of: ${Object.values(ExperienceLevel).join(', ')}`,
  })
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'learningGoal must be 500 characters or fewer' })
  learningGoal?: string;
}
