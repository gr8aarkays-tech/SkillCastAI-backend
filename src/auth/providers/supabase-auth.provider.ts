import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module.js';
import type { AuthProvider } from '../interfaces/auth.provider.js';

@Injectable()
export class SupabaseAuthProvider implements AuthProvider {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async register(
    email: string,
    password: string,
  ): Promise<{ userId: string; accessToken: string; refreshToken: string }> {
    // Use admin API so we can immediately confirm the email (no email loop in dev)
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists') ||
          error.code === 'email_exists') {
        throw new ConflictException('Email already registered');
      }
      throw new UnauthorizedException(error.message);
    }

    // After admin.createUser, sign in to get actual session tokens
    const { data: session, error: loginError } =
      await this.supabase.auth.signInWithPassword({ email, password });

    if (loginError || !session.session) {
      throw new UnauthorizedException('Registration succeeded but login failed');
    }

    return {
      userId: data.user.id,
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { accessToken: data.session.access_token };
  }

  async validateToken(token: string): Promise<{ userId: string }> {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return { userId: data.user.id };
  }
}
