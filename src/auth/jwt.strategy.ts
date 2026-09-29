import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const projectUrl = config.getOrThrow<string>('SUPABASE_URL');
    // Supabase JWKS endpoint — NestJS validates every incoming JWT against this
    const jwksUri = `${projectUrl}/auth/v1/jwks`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: { sub: string; email: string }) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    // req.user will be { id, email } on all protected routes
    return { id: payload.sub, email: payload.email };
  }
}
