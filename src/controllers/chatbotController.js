const { normalizeMessage } = require("../utils/chatbotHelper");

const TEMPLATE_CACHE_KEY = "chatbot_all_templates";

let localCache = {
  raw: null,
  templates: [],
  compiled: [],
  groupedBaseIntents: {},
  intentCatalog: [],
};

const getBaseIntent = (intent = "") => intent.replace(/_\d+$/, "");

const escapeRegex = (keyword) => keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

const buildLocalCache = (templates, raw) => {
  const groupedBaseIntents = {};
  const keywordSetsByIntent = {};

  const compiled = templates.map((template) => {
    const baseIntent = getBaseIntent(template.intent);
    const keywords = (template.keywords || "")
      .split(",")
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean);

    if (!groupedBaseIntents[baseIntent]) {
      groupedBaseIntents[baseIntent] = [];
    }
    groupedBaseIntents[baseIntent].push(template);

    if (!keywordSetsByIntent[baseIntent]) {
      keywordSetsByIntent[baseIntent] = new Set();
    }
    keywords.forEach((keyword) => keywordSetsByIntent[baseIntent].add(keyword));

    return {
      template,
      compiledRegexes: keywords.map((keyword) =>
        new RegExp(`\\b${escapeRegex(keyword)}\\b`)
      ),
    };
  });

  const intentCatalog = Object.entries(keywordSetsByIntent)
    .map(([intent, keywords]) => ({
      intent,
      keywords: Array.from(keywords).sort(),
    }))
    .sort((left, right) => left.intent.localeCompare(right.intent));

  localCache = {
    raw,
    templates,
    compiled,
    groupedBaseIntents,
    intentCatalog,
  };

  return localCache;
};

const getTemplateCache = async (prisma, redis) => {
  let dataStr = await redis.get(TEMPLATE_CACHE_KEY);
  let templates = [];

  if (!dataStr) {
    templates = await prisma.chatbotTemplate.findMany();
    dataStr = JSON.stringify(templates);
    await redis.set(TEMPLATE_CACHE_KEY, dataStr, { EX: 3600 });
  }

  if (dataStr !== localCache.raw) {
    if (!templates.length && dataStr) {
      try {
        templates = JSON.parse(dataStr);
      } catch (err) {
        templates = await prisma.chatbotTemplate.findMany();
        dataStr = JSON.stringify(templates);
        await redis.set(TEMPLATE_CACHE_KEY, dataStr, { EX: 3600 });
      }
    }

    buildLocalCache(templates, dataStr);
  }

  return localCache;
};

const getCachedResponse = async (prisma, redis, message) => {
  const cleanMessage = normalizeMessage(message);
  if (!cleanMessage) {
    return null;
  }

  const { compiled } = await getTemplateCache(prisma, redis);

  for (const cached of compiled) {
    for (const regex of cached.compiledRegexes) {
      if (regex.test(cleanMessage)) {
        return cached.template;
      }
    }
  }

  return null;
};

const getIntentCatalog = async (prisma, redis) => {
  const { intentCatalog } = await getTemplateCache(prisma, redis);
  return intentCatalog;
};

const getTemplateByBaseIntent = async (prisma, redis, intent) => {
  if (!intent || typeof intent !== "string") {
    return null;
  }

  const { groupedBaseIntents } = await getTemplateCache(prisma, redis);
  const baseIntent = getBaseIntent(intent.trim());
  const templates = groupedBaseIntents[baseIntent] || [];

  // ponytail: first template per base intent; add ranking/random selection if repetition becomes visible.
  return templates[0] || null;
};

module.exports = {
  getBaseIntent,
  getCachedResponse,
  getIntentCatalog,
  getTemplateByBaseIntent,
};
