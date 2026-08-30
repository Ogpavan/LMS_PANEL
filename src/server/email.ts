import nodemailer from "nodemailer";

import { serverConfig } from "@/server/config";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!serverConfig.smtp.host || !serverConfig.smtp.user || !serverConfig.smtp.password) {
    return null;
  }

  transporter ??= nodemailer.createTransport({
    host: serverConfig.smtp.host,
    port: serverConfig.smtp.port,
    secure: serverConfig.smtp.secure,
    auth: {
      user: serverConfig.smtp.user,
      pass: serverConfig.smtp.password
    }
  });

  return transporter;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

async function sendEmail(to: string, subject: string, text: string, actionUrl: string) {
  const mailer = getTransporter();
  if (!mailer || !serverConfig.smtp.from) return false;

  await mailer.sendMail({
    from: serverConfig.smtp.from,
    to,
    subject,
    text: `${text}\n\n${actionUrl}`,
    html: `<p>${escapeHtml(text)}</p><p><a href="${escapeHtml(actionUrl)}">Continue</a></p>`
  });
  return true;
}

export function sendVerificationEmail(name: string, email: string, token: string) {
  const url = `${serverConfig.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail(email, "Verify your email", `Hello ${name}, verify your LMS account.`, url);
}

export function sendPasswordResetEmail(name: string, email: string, token: string) {
  const url = `${serverConfig.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail(email, "Reset your password", `Hello ${name}, reset your LMS password.`, url);
}
