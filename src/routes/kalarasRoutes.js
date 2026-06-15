const authenticate = require("../middlewares/auth");
const kalarasQuotaCheck = require("../middlewares/quotaCheck");
const kalarasController = require("../controllers/kalarasControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.post(
    "/chat",
    { preValidation: [kalarasQuotaCheck] },
    kalarasController.sendChatMessage,
  );
  fastify.get("/quota", kalarasController.getChatQuota);
  fastify.delete("/history", kalarasController.deleteChatHistory);
};
