const nodemailer = require("nodemailer");

let transporter = null;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendPasswordResetEmail = async (email, resetLink) => {
  const mailOptions = {
    from: `"Kala Esok Support" <${process.env.SMTP_USER || "no-reply@kalaesok.com"}>`,
    to: email,
    subject: "Reset Password - Kala Esok",
    text: `Halo, silakan gunakan link berikut untuk menyetel ulang kata sandi Anda: ${resetLink}. Link ini berlaku selama 1 jam.`,
    html: `<p>Halo,</p><p>Silakan klik tautan di bawah ini untuk menyetel ulang kata sandi Anda:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Tautan ini berlaku selama 1 jam.</p><p>Terima kasih,<br>Tim Kala Esok</p>`,
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Mailer] Email terkirim ke ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Mailer] Gagal mengirim email ke ${email} via SMTP:`, err.message);
    }
  }

  console.log("==================================================");
  console.log(`[SIMULASI MAILER] Mengirim email ke: ${email}`);
  console.log(`Subjek: ${mailOptions.subject}`);
  console.log(`Reset Link: ${resetLink}`);
  console.log("==================================================");
  return { success: true, simulated: true };
};

module.exports = {
  sendPasswordResetEmail,
};
