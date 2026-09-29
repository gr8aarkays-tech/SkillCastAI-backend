import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AUTH_PROVIDER, type AuthProvider } from './interfaces/auth.provider.js';
import { ProfileEntity } from '../profile/profile.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    @InjectRepository(ProfileEntity)
    private readonly profileRepo: Repository<ProfileEntity>,
  ) {}

  async register(email: string, password: string) {
    let result: { userId: string; accessToken: string; refreshToken: string };

    try {
      result = await this.authProvider.register(email, password);
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      throw new UnauthorizedException('Registration failed');
    }

    // Create an empty profile row linked to the new Supabase auth user
    const existing = await this.profileRepo.findOne({
      where: { userId: result.userId },
    });

    if (!existing) {
      await this.profileRepo.save(
        this.profileRepo.create({ userId: result.userId }),
      );
    }

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  async login(email: string, password: string) {
    return this.authProvider.login(email, password);
  }

  async refresh(refreshToken: string) {
    return this.authProvider.refresh(refreshToken);
  }
}
