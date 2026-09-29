import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AUTH_PROVIDER } from './interfaces/auth.provider.js';
import { ProfileEntity } from '../profile/profile.entity.js';

// ── Mock factory helpers ──────────────────────────────────────────────────────

const mockAuthProvider = {
  register: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  validateToken: vi.fn(),
};

const mockProfileRepo = {
  findOne: vi.fn(),
  create: vi.fn(),
  save: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AUTH_PROVIDER, useValue: mockAuthProvider },
        {
          provide: getRepositoryToken(ProfileEntity),
          useValue: mockProfileRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('happy path: calls provider, creates profile row, returns tokens', async () => {
      const userId = 'uuid-123';
      const tokens = {
        userId,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      mockAuthProvider.register.mockResolvedValueOnce(tokens);
      mockProfileRepo.findOne.mockResolvedValueOnce(null); // no existing profile
      mockProfileRepo.create.mockReturnValueOnce({ userId });
      mockProfileRepo.save.mockResolvedValueOnce({ userId });

      const result = await service.register('test@example.com', 'password123');

      expect(mockAuthProvider.register).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(mockProfileRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });

    it('does not create a duplicate profile if one already exists', async () => {
      mockAuthProvider.register.mockResolvedValueOnce({
        userId: 'uuid-123',
        accessToken: 'at',
        refreshToken: 'rt',
      });
      // Profile already exists
      mockProfileRepo.findOne.mockResolvedValueOnce({ userId: 'uuid-123' });

      await service.register('test@example.com', 'password123');

      expect(mockProfileRepo.save).not.toHaveBeenCalled();
    });

    it('re-throws ConflictException when email already registered', async () => {
      mockAuthProvider.register.mockRejectedValueOnce(
        new ConflictException('Email already registered'),
      );

      await expect(
        service.register('dupe@example.com', 'password123'),
      ).rejects.toThrow(ConflictException);
    });

    it('wraps unknown provider errors as UnauthorizedException', async () => {
      mockAuthProvider.register.mockRejectedValueOnce(new Error('Unknown error'));

      await expect(
        service.register('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthProvider.login.mockResolvedValueOnce(tokens);

      const result = await service.login('test@example.com', 'password123');

      expect(mockAuthProvider.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(result).toEqual(tokens);
    });

    it('throws UnauthorizedException on invalid credentials', async () => {
      mockAuthProvider.login.mockRejectedValueOnce(
        new UnauthorizedException('Invalid email or password'),
      );

      await expect(
        service.login('bad@example.com', 'wrongpass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      mockAuthProvider.refresh.mockResolvedValueOnce({ accessToken: 'new_at' });

      const result = await service.refresh('valid_refresh_token');

      expect(mockAuthProvider.refresh).toHaveBeenCalledWith('valid_refresh_token');
      expect(result).toEqual({ accessToken: 'new_at' });
    });

    it('throws UnauthorizedException for invalid refresh token', async () => {
      mockAuthProvider.refresh.mockRejectedValueOnce(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await expect(service.refresh('bad_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
