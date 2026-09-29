import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './health/health.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { SourcesModule } from './sources/sources.module.js';
import { QuestionsModule } from './questions/questions.module.js';
import { PodcastsModule } from './podcasts/podcasts.module.js';
import { FlashcardModule } from './flashcards/flashcard.module.js';
import { QuizModule } from './quiz/quiz.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { LibraryModule } from './library/library.module.js';

@Module({
  imports: [
    // Load .env globally across all modules
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM connected to Supabase Postgres
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('SUPABASE_DB_URL'),
        ssl: { rejectUnauthorized: false }, // required for Supabase hosted Postgres
        synchronize: false,
        migrations: ['dist/migrations/*.js'],
        entities: ['dist/**/*.entity.js'],
      }),
    }),

    // Rate limiting: 120 requests per minute per IP (global default).
    // AI generation endpoints are more expensive; override with @Throttle()
    // on individual controllers when needed.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute window in ms
        limit: 120,  // max 120 requests per IP per window
      },
    ]),

    SupabaseModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    SourcesModule,
    QuestionsModule,
    PodcastsModule,
    FlashcardModule,
    QuizModule,
    ProgressModule,
    LibraryModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally so every route is rate-limited by default.
    // Routes or controllers that need stricter limits use @Throttle() decorator.
    // Routes that must be excluded (e.g. health check) use @SkipThrottle().
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
