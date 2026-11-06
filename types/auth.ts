export type UserRole = "pasien" | "super_admin";

export interface UserAuthData {
  id: string;
  email: string;
  role: UserRole;
  sessionToken: string;
}

export interface LoginPayLoad {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface ForgetPasswordPayload {
  email: string;
}

export interface OtpPayload {
  email: string;
  token: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  newPassword: string;
}
