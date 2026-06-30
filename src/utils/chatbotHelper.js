const path = require("path");

const aliasGroup = require(path.join(__dirname, "../../prisma/alias_group.json"));

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

const normalizeMessage = (message) => {
  if (!message || typeof message !== "string") {
    return "";
  }

  const cleanStr = message.toLowerCase().replace(/[^\w\s]/g, "");

  const tokens = cleanStr.split(/\s+/).filter(Boolean);

  const substitutedTokens = [];
  for (const token of tokens) {
    const mapped = aliasGroup[token] !== undefined ? aliasGroup[token] : token;
    const words = mapped.split(/\s+/);
    for (const word of words) {
      if (word) {
        substitutedTokens.push(word);
      }
    }
  }

  const filteredTokens = substitutedTokens.filter((word) => !stopWords.has(word));

  return filteredTokens.join(" ");
};

module.exports = {
  normalizeMessage,
};
