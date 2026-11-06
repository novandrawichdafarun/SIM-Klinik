import { handleServiceError } from "@/utils/error";
import { transporter } from "../libs/mailer";
import { SendOtpEmailParams } from "@/types/mail";
import path from "path";

const BRAND_COLORS = {
  primary: "#349f76",
  dark: "#1c684d",
  darker: "#164536",
  light: "#daf3e6",
  lightest: "#f0faf5",
  text: "#0f2a20",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  warning: "#f59e0b",
  warningBg: "#fef3c7",
};

export const sendOtpEmail = async (params: SendOtpEmailParams) => {
  const { to, otpCode, subject = "Kode OTP Lupa Password Akun Anda" } = params;

  const fromAddress = process.env.MAIL_FROM_ADDRESS || "noreply@nutbcare.com";
  const fromName = process.env.MAIL_FROM_NAME || "NU-TBCARE";
  const logoPath = path.join(process.cwd(), "public", "logo.png");

  const mailOptions = {
    from: '"' + fromName + '" <' + fromAddress + ">",
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
          <title>${subject}</title>
          <style>
            @media only screen and (max-width: 600px) {
              .container { width: 100% !important; max-width: 100% !important; }
              .header { padding: 32px 16px !important; }
              .content { padding: 32px 20px !important; }
              .otp-box { padding: 32px 16px !important; margin: 32px 0 !important; }
              .otp-code { font-size: 48px !important; letter-spacing: 10px !important; }
              .footer { padding: 20px 16px !important; }
              h2 { font-size: 22px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.lightest}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          
          <!-- Outer wrapper -->
          <div style="background-color: ${BRAND_COLORS.lightest}; padding: 20px 0;">
            
            <!-- Email Container -->
            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">
              
              <!-- Header Section -->
              <div class="header" style="background: linear-gradient(135deg, ${BRAND_COLORS.dark} 0%, ${BRAND_COLORS.darker} 100%); padding: 48px 24px; text-align: center;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right: 16px;">
                            <img src="cid:logoAplikasi" alt="Logo Aplikasi" width="100" style="width: 100px; height: auto; display: block; border: 0;" />
                          </td>
                          <td valign="middle" style="text-align: left;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.3px;">NU-TBCARE</h1>
                            <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">Sistem Informasi Tuberkulosis</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Main Content Section -->
              <div class="content" style="padding: 48px 32px;">
                
                <!-- Greeting -->
                <h2 style="margin: 0 0 12px 0; color: ${BRAND_COLORS.text}; font-size: 24px; font-weight: 700;">Verifikasi Akun Anda</h2>
                
                <!-- Introduction Text -->
                <p style="margin: 0 0 32px 0; color: ${BRAND_COLORS.textMuted}; font-size: 15px; line-height: 1.6;">
                  Berikut adalah kode OTP untuk verifikasi akun Anda. Gunakan kode ini untuk melanjutkan proses masuk.
                </p>

                <!-- OTP Code Box -->
                <div class="otp-box" style="margin: 48px 0; padding: 40px; background: linear-gradient(135deg, ${BRAND_COLORS.light} 0%, ${BRAND_COLORS.lightest} 100%); border-radius: 12px; border: 2px solid ${BRAND_COLORS.primary}; text-align: center;">
                  <p style="margin: 0 0 20px 0; color: ${BRAND_COLORS.dark}; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Kode Verifikasi Anda</p>
                  
                  <div class="otp-code" style="font-size: 56px; font-weight: 900; color: ${BRAND_COLORS.primary}; letter-spacing: 14px; font-family: 'Courier New', 'Monaco', monospace; word-spacing: 8px; margin: 0; padding: 0; line-height: 1.2;">
                    ${otpCode}
                  </div>
                  
                  <p style="margin: 24px 0 0 0; color: ${BRAND_COLORS.dark}; font-size: 13px; font-weight: 600;">Kode ini berlaku selama <strong>5 menit</strong></p>
                </div>

                <!-- Security Instruction -->
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; border-left: 3px solid ${BRAND_COLORS.primary}; margin: 32px 0;">
                  <p style="margin: 0; color: ${BRAND_COLORS.text}; font-size: 14px; line-height: 1.6;">
                    <strong>🔒 Jangan bagikan kode ini</strong> kepada siapapun. Tim NU-TBCARE tidak akan pernah meminta kode OTP Anda melalui email atau telepon.
                  </p>
                </div>

                <!-- Additional Info -->
                <p style="margin: 24px 0 0 0; color: ${BRAND_COLORS.textMuted}; font-size: 14px; line-height: 1.6;">
                  Jika Anda tidak melakukan permintaan ini, abaikan email ini dan hubungi tim support kami segera.
                </p>
              </div>

              <!-- Divider -->
              <div style="margin: 0 32px; height: 1px; background-color: ${BRAND_COLORS.border};"></div>

              <!-- Suport Section -->
              <div style="padding: 32px; text-align: center; background-color: #fafbfc;">
                <p style="margin: 0 0 12px 0; color: ${BRAND_COLORS.textMuted}; font-size: 14px; font-weight: 600;">Butuh Bantuan?</p>
                <p style="margin: 0; color: ${BRAND_COLORS.textMuted}; font-size: 13px; line-height: 1.6;">
                  Hubungi tim support kami:<br/>
                  <a href="mailto:nutbcare@gmail.com" style="color: ${BRAND_COLORS.primary}; text-decoration: none; font-weight: 600;">nutbcare@gmail.com</a>
                </p>
              </div>

              <!-- Footer Section -->
              <div class="footer" style="background-color: ${BRAND_COLORS.dark}; padding: 28px 32px; text-align: center; border-top: 1px solid ${BRAND_COLORS.primary};">
                <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.85); font-size: 12px; font-weight: 500;">
                  © 2026 NU-TBCARE. Semua hak dilindungi.
                </p>
                <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.75); font-size: 12px;">
                  Email dikirim ke: <strong>${to}</strong>
                </p>
              </div>

            </div>
            <!-- End Email Container -->

          </div>
          <!-- End Outer Wrapper -->

        </body>
      </html>
    `,
    attachments: [
      {
        filename: "logo.png",
        path: logoPath,
        cid: "logoAplikasi",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return handleServiceError(error);
  }
};
