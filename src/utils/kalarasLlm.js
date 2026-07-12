const DEFAULT_BASE_URL =
  process.env.KALARAS_LLM_BASE_URL || process.env.AI_BASE_URL || "https://9router.theobuilds.tech/v1";
const DEFAULT_MODEL =
  process.env.KALARAS_LLM_MODEL ||
  process.env.CLOUDFLARE_AI_MODEL ||
  "cf/@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_TIMEOUT_MS = parsePositiveInt(
  process.env.KALARAS_LLM_TIMEOUT_MS || process.env.AI_TIMEOUT_MS,
  8000
);
const DEFAULT_MAX_TOKENS = parsePositiveInt(process.env.KALARAS_LLM_MAX_TOKENS, 700);
const DEFAULT_TEMPERATURE = Number.parseFloat(process.env.KALARAS_LLM_TEMPERATURE || "0.2");

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const getApiConfig = () => {
  const apiKey =
    process.env.KALARAS_LLM_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.CLOUDFLARE_AI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl: DEFAULT_BASE_URL.replace(/\/+$/, ""),
    model: DEFAULT_MODEL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
};

const extractFirstJsonObject = (text) => {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
};

const tryParseJson = (text) => {
  const trimmed = String(text || "").trim();

  try {
    return JSON.parse(trimmed);
  } catch (err) {}

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const objectText = extractFirstJsonObject(trimmed);
  if (objectText) {
    return JSON.parse(objectText);
  }

  throw new Error("LLM returned non-JSON output");
};

const getChatCompletionText = (payload) => {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }

  const resultResponse = payload?.result?.response;
  if (typeof resultResponse === "string" && resultResponse.trim()) {
    return resultResponse;
  }

  const response = payload?.response;
  if (typeof response === "string" && response.trim()) {
    return response;
  }

  throw new Error("LLM response missing assistant content");
};

const validateRouterResult = (parsed, knownIntents) => {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response is not an object");
  }

  if (parsed.status === "MATCHED") {
    if (typeof parsed.matched_intent !== "string" || !knownIntents.has(parsed.matched_intent)) {
      throw new Error("LLM matched_intent invalid or unknown");
    }

    return {
      status: "MATCHED",
      matched_intent: parsed.matched_intent,
    };
  }

  if (parsed.status === "DEEP_TALK") {
    if (typeof parsed.custom_reply !== "string" || parsed.custom_reply.trim() === "") {
      throw new Error("LLM custom_reply missing");
    }

    return {
      status: "DEEP_TALK",
      custom_reply: parsed.custom_reply.trim(),
    };
  }

  throw new Error("LLM status invalid");
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

const requestChatCompletion = async ({ prompt, config }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah router JSON untuk Kalaras. Jawab hanya JSON valid sesuai instruksi user.",
          },
          { role: "user", content: prompt },
        ],
        temperature: Number.isFinite(DEFAULT_TEMPERATURE) ? DEFAULT_TEMPERATURE : 0.2,
        max_tokens: DEFAULT_MAX_TOKENS,
        stream: false,
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}: ${responseText.slice(0, 200)}`);
    }

    // Handle SSE streaming responses (server may ignore stream:false)
    if (responseText.trimStart().startsWith("data:")) {
      let fullContent = "";
      for (const line of responseText.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") break;
        try {
          const chunk = JSON.parse(data);
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (delta) fullContent += delta;
        } catch {}
      }
      if (fullContent.trim()) return fullContent;
      throw new Error("LLM streaming response had no content");
    }

    const payload = tryParseJson(responseText);
    return getChatCompletionText(payload);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("LLM request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

const routeKalarasMessage = async ({ message, normalizedMessage, intentCatalog }) => {
  const config = getApiConfig();
  if (!config) {
    return null;
  }

  const prompt = buildPrompt({ message, normalizedMessage, intentCatalog });
  const text = await requestChatCompletion({ prompt, config });
  const parsed = tryParseJson(text);
  return validateRouterResult(parsed, new Set(intentCatalog.map(({ intent }) => intent)));
};

module.exports = {
  routeKalarasMessage,
};
