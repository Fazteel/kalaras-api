/**
 * Utilitas WhatsApp menggunakan WAHA (WhatsApp HTTP API).
 * Dirancang untuk fault-tolerant: error WAHA tidak akan mematikan server.
 */

/**
 * Memformat nomor telepon Indonesia ke format WhatsApp chatId.
 * Contoh: "08123456789" -> "628123456789@c.us"
 * @param {string} phone
 * @returns {string}
 */
const formatPhoneNumber = (phone) => {
  // 1. Buang semua karakter non-digit
  let cleaned = phone.replace(/\D/g, "");

  // 2. Normalisasi awalan
  if (cleaned.startsWith("0")) {
    // 0812... -> 62812...
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("62")) {
    // Sudah benar, biarkan apa adanya
  } else if (cleaned.startsWith("+62")) {
    // Kondisi ini tidak mungkin terjadi setelah replace /\D/g,
    // tapi dijaga untuk keamanan
    cleaned = "62" + cleaned.slice(3);
  }

  return `${cleaned}@c.us`;
};

/**
 * Mengirim pesan WhatsApp melalui WAHA API.
 * Fungsi ini TIDAK melempar error ke caller — semua kegagalan dicatat via console.error.
 * @param {string} phone - Nomor telepon tujuan (format Indonesia)
 * @param {string} message - Isi pesan teks
 * @returns {Promise<{ success: boolean, chatId: string }>}
 */
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
    // Tangkap error jaringan (misal: WAHA offline, DNS tidak ditemukan)
    console.error(
      `[WAHA] Error jaringan saat mengirim ke ${chatId}: ${err.message}`
    );
    return { success: false, chatId };
  }
};

module.exports = { sendWhatsAppMessage, formatPhoneNumber };
