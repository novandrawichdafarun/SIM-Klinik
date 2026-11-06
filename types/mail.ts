export interface SendOtpEmailParams {
  to: string;
  otpCode: string;
  subject?: string;
}
