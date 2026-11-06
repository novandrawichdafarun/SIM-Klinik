import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 465,
  secure: process.env.MAIL_PORT === "465",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
});