import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const ROLES = ['developer', 'tester', 'architect', 'manager', 'student', 'teacher'] as const;
export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export class ExplainDto {
  @IsEnum(ROLES, { message: `role must be one of: ${ROLES.join(', ')}` })
  role!: string;

  @IsEnum(EXPERIENCE_LEVELS, { message: `experience must be one of: ${EXPERIENCE_LEVELS.join(', ')}` })
  @IsOptional()
  experience?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  learningGoal?: string;
}
