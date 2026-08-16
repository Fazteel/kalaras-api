const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");

const prisma = new PrismaClient();

const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("+62")) {
    cleaned = "62" + cleaned.slice(3);
  }

  return `${cleaned}@c.us`;
};

const sendWhatsAppMessage = async (phone, message) => {
  const chatId = formatPhoneNumber(phone);

  try {
    let user = await prisma.user.findFirst({
      where: { phone },
      orderBy: { created_at: "desc" },
    });

    if (!user) {
      const contact = await prisma.emergencyContact.findFirst({
        where: { phone },
        include: { user: true },
      });
      if (contact && contact.user) {
        user = contact.user;
      }
    }

    const recipientEmail = user ? user.email : (process.env.ZOHO_EMAIL || "antares311004@zohomail.com");

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL || "antares311004@zohomail.com",
        pass: process.env.ZOHO_PASSWORD || "Antares19()",
      },
    });

    let subject = "Kalaras Alert Notification";
    if (message.toUpperCase().includes("OTP")) {
      subject = "Kalaras Verification OTP";
    } else if (
      message.toUpperCase().includes("DARURAT") ||
      message.toUpperCase().includes("EMERGENCY") ||
      message.toUpperCase().includes("SOS") ||
      message.toUpperCase().includes("SINYAL")
    ) {
      subject = "Kalaras Emergency Distress Signal";
    }

    await transporter.sendMail({
      from: `"Kalaras System" <${process.env.ZOHO_EMAIL || "antares311004@zohomail.com"}>`,
      to: recipientEmail,
      subject,
      text: message,
    });

    console.log(`[EMAIL ROUTER] Message for ${phone} redirected to ${recipientEmail}`);
    return { success: true, chatId: "email-sent" };
  } catch (err) {
    console.error(`[EMAIL ROUTER] Failed to redirect message to email:`, err.message);
    return { success: false, chatId: "email-failed" };
  }
};

module.exports = { sendWhatsAppMessage, formatPhoneNumber };
