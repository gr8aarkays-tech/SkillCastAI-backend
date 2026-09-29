/**
 * AuthProvider — abstraction over the authentication system.
 * The concrete implementation (SupabaseAuthProvider) can be swapped
 * without touching AuthService or AuthController.
 */
export interface AuthProvider {
  /**
   * Register a new user. Returns userId + tokens on success.
   * Throws ConflictException if email already exists.
   */
  register(
    email: string,
    password: string,
  ): Promise<{ userId: string; accessToken: string; refreshToken: string }>;

  /**
   * Login with email + password.
   * Throws UnauthorizedException on invalid credentials.
   */
  login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;

  /**
   * Rotate a refresh token and return a new access token.
   * Throws UnauthorizedException on invalid/expired refresh token.
   */
  refresh(refreshToken: string): Promise<{ accessToken: string }>;

  /**
   * Validate a JWT access token and return the user's ID.
   * Throws UnauthorizedException if the token is invalid or expired.
   */
  validateToken(token: string): Promise<{ userId: string }>;
}

export const AUTH_PROVIDER = 'AUTH_PROVIDER';
