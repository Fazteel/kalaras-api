const path = require("path");

// Load the slang / alay dictionary mapping
const aliasGroup = require(path.join(__dirname, "../../prisma/alias_group.json"));

// List of stop words to filter out
const stopWords = new Set([
  "bgt",
  "gw",
  "gue",
  "lu",
  "sih",
  "dong",
  "ih",
  "hari",
  "ini",
  "beneran",
]);

/**
 * Sanitizes and normalizes user message by converting to lowercase, removing punctuation,
 * mapping slang words via alias group tokenization, filtering out stopwords, and returning a clean string.
 *
 * @param {string} message - Raw message input from user
 * @returns {string} Cleaned, normalized sentence
 */
const normalizeMessage = (message) => {
  if (!message || typeof message !== "string") {
    return "";
  }

  // 1. Lowercase and remove all punctuation
  const cleanStr = message.toLowerCase().replace(/[^\w\s]/g, "");

  // 2. Tokenize by splitting based on spaces
  const tokens = cleanStr.split(/\s+/).filter(Boolean);

  // 3. Substitution & Map using dictionary
  const substitutedTokens = [];
  for (const token of tokens) {
    const mapped = aliasGroup[token] !== undefined ? aliasGroup[token] : token;
    // Split the mapped result (in case of multi-word substitution, e.g. "naikjab" -> "naik jabatan")
    const words = mapped.split(/\s+/);
    for (const word of words) {
      if (word) {
        substitutedTokens.push(word);
      }
    }
  }

  // 4. Stopwords filtering
  const filteredTokens = substitutedTokens.filter((word) => !stopWords.has(word));

  // 5. Rejoin into a single space-separated string
  return filteredTokens.join(" ");
};

module.exports = {
  normalizeMessage,
};
