const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || "8000", 10);

let cachedClient = null;

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }

  return cachedClient.getGenerativeModel({ model: DEFAULT_MODEL });
};

const withTimeout = async (promise, timeoutMs) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Gemini request timed out")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const tryParseJson = (text) => {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (err) {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return JSON.parse(objectMatch[0]);
  }

  throw new Error("Gemini returned non-JSON output");
};

const validateRouterResult = (parsed, knownIntents) => {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Gemini response is not an object");
  }

  if (parsed.status === "MATCHED") {
    if (typeof parsed.matched_intent !== "string" || !knownIntents.has(parsed.matched_intent)) {
      throw new Error("Gemini matched_intent invalid or unknown");
    }

    return {
      status: "MATCHED",
      matched_intent: parsed.matched_intent,
    };
  }

  if (parsed.status === "DEEP_TALK") {
    if (typeof parsed.custom_reply !== "string" || parsed.custom_reply.trim() === "") {
      throw new Error("Gemini custom_reply missing");
    }

    return {
      status: "DEEP_TALK",
      custom_reply: parsed.custom_reply.trim(),
    };
  }

  throw new Error("Gemini status invalid");
};

const buildPrompt = ({ message, normalizedMessage, intentCatalog }) => {
  const compactCatalog = intentCatalog.map(({ intent, keywords }) => ({
    intent,
    keywords,
  }));

  return [
    "Kamu adalah router percakapan Kalaras.",
    "Tugasmu memilih SALAH SATU output JSON saja.",
    "",
    "Aturan output:",
    "1. Output HARUS JSON valid tanpa markdown, tanpa penjelasan tambahan.",
    '2. Jika pesan masih cocok dengan intent template yang ada meski typo/alay/metafora ringan, outputkan: {"status":"MATCHED","matched_intent":"NAMA_INTENT"}',
    '3. Jika pesan butuh respons empatik personal, validasi emosi, atau solusi yang tidak cukup dijawab template singkat, outputkan: {"status":"DEEP_TALK","custom_reply":"..."}',
    "4. matched_intent HARUS salah satu intent dari katalog yang diberikan. Jangan mengarang intent baru.",
    "5. Jika ragu antara MATCHED vs DEEP_TALK, pilih DEEP_TALK.",
    "6. Jika DEEP_TALK, balas dalam Bahasa Indonesia, plain text, empatik, singkat-menengah, tanpa markdown.",
    "",
    `Pesan user mentah: ${JSON.stringify(message)}`,
    `Pesan user ternormalisasi: ${JSON.stringify(normalizedMessage)}`,
    `Katalog intent: ${JSON.stringify(compactCatalog)}`,
  ].join("\n");
};

const routeKalarasMessage = async ({ message, normalizedMessage, intentCatalog }) => {
  const model = getModel();
  if (!model) {
    return null;
  }

  const prompt = buildPrompt({ message, normalizedMessage, intentCatalog });
  const result = await withTimeout(
    model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    DEFAULT_TIMEOUT_MS
  );

  const text = result.response.text();
  const parsed = tryParseJson(text);
  return validateRouterResult(
    parsed,
    new Set(intentCatalog.map(({ intent }) => intent))
  );
};

module.exports = {
  routeKalarasMessage,
};
