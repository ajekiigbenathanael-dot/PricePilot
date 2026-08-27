/**
 * Shared types for the API layer — kept here so serverless handlers never
 * import from the frontend `src/` tree (which uses the `@` Vite alias and
 * client-only env vars).
 */

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
}

export interface UpdateProfileRequest {
  display_name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
