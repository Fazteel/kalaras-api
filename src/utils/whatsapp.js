
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("62")) {
  } else if (cleaned.startsWith("+62")) {
    cleaned = "62" + cleaned.slice(3);
  }

  return `${cleaned}@c.us`;
};

const sendWhatsAppMessage = async (phone, message) => {
  const chatId = formatPhoneNumber(phone);

  try {
    const url = `${process.env.WAHA_API_URL}/api/sendText`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": process.env.WAHA_API_KEY,
      },
      body: JSON.stringify({
        chatId,
        text: message,
        session: process.env.WAHA_SESSION,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(
        `[WAHA] Gagal mengirim ke ${chatId}. Status: ${response.status}. Body: ${errBody}`
      );
      return { success: false, chatId };
    }

    console.log(`[WAHA] Pesan berhasil dikirim ke ${chatId}`);
    return { success: true, chatId };
  } catch (err) {
    console.error(
      `[WAHA] Error jaringan saat mengirim ke ${chatId}: ${err.message}`
    );
    return { success: false, chatId };
  }
};

module.exports = { sendWhatsAppMessage, formatPhoneNumber };
