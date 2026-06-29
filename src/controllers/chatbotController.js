const { normalizeMessage } = require("../utils/chatbotHelper");

// Local in-memory cache to store compiled regexes for sub-5ms lookup performance
let localCache = {
  raw: null,
  compiled: [],
};

/**
 * Retrieves the matched chatbot template by executing exact word-boundary keyword matches against the sanitized user message.
 *
 * @param {object} prisma - Prisma Client instance
 * @param {object} redis - Redis Client instance
 * @param {string} message - Raw user message
 * @returns {Promise<object|null>} Full matched template object or null if not matched
 */
const getCachedResponse = async (prisma, redis, message) => {
  const cacheKey = "chatbot_all_templates";
  let dataStr = await redis.get(cacheKey);
  let templates = [];

  if (!dataStr) {
    // If not in cache, retrieve from database
    templates = await prisma.chatbotTemplate.findMany();
    dataStr = JSON.stringify(templates);
    // Sync back to Redis cache
    await redis.set(cacheKey, dataStr, { EX: 3600 });
  }

  // If Redis content has changed or was never compiled, re-compile local cache
  if (dataStr !== localCache.raw) {
    try {
      if (!templates.length && dataStr) {
        templates = JSON.parse(dataStr);
      }
    } catch (err) {
      // If parsing fails, fall back to Postgres
      templates = await prisma.chatbotTemplate.findMany();
      dataStr = JSON.stringify(templates);
      await redis.set(cacheKey, dataStr, { EX: 3600 });
    }

    // Compile regexes for each template keyword
    localCache.raw = dataStr;
    localCache.compiled = templates.map((template) => {
      const keywords = (template.keywords || "")
        .split(",")
        .map((kw) => kw.trim().toLowerCase())
        .filter(Boolean);

      const compiledRegexes = keywords.map((kw) => {
        // Escape regex special chars to prevent syntax issues
        const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        // Use word boundaries \b to enforce exact matching
        return new RegExp(`\\b${escaped}\\b`);
      });

      return {
        template,
        compiledRegexes,
      };
    });
  }

  // Normalize user message
  const cleanMessage = normalizeMessage(message);
  if (!cleanMessage) {
    return null;
  }

  // Check templates sequentially for a match
  for (const cached of localCache.compiled) {
    for (const regex of cached.compiledRegexes) {
      if (regex.test(cleanMessage)) {
        return cached.template;
      }
    }
  }

  return null;
};

module.exports = {
  getCachedResponse,
};
