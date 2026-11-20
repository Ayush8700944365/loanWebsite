const resendEndpoint = "https://api.resend.com/emails";

export const isPasswordResetEmailConfigured = () => Boolean(
  process.env.RESEND_API_KEY?.trim() && process.env.PASSWORD_RESET_FROM?.trim(),
);

export const getPasswordResetUrl = (token) => {
  const clientOrigin = String(process.env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
  return `${clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  if (!isPasswordResetEmailConfigured()) throw new Error("Password reset email is not configured.");
  const response = await fetch(resendEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.PASSWORD_RESET_FROM.trim(),
      to: [to],
      subject: "Reset your RealCred password",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h1 style="font-size:22px">Reset your password</h1><p>We received a request to reset your RealCred account password. This link expires in 30 minutes and can only be used once.</p><p style="margin:28px 0"><a href="${resetUrl}" style="background:#b4232c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Set a new password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
      text: `Reset your RealCred password using this link (expires in 30 minutes): ${resetUrl}\nIf you did not request this, ignore this email.`,
    }),
  });
  if (!response.ok) throw new Error(`Password reset email provider returned ${response.status}.`);
};
