import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { SupabaseAuthProvider } from './providers/supabase-auth.provider.js';
import { AUTH_PROVIDER } from './interfaces/auth.provider.js';
import { ProfileEntity } from '../profile/profile.entity.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([ProfileEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Bind the AuthProvider interface to the Supabase implementation.
    // To swap providers later, only change this line.
    {
      provide: AUTH_PROVIDER,
      useClass: SupabaseAuthProvider,
    },
  ],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
