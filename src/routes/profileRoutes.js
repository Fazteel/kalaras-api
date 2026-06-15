const authenticate = require("../middlewares/auth");
const profileController = require("../controllers/profileControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/", profileController.getProfile);
  fastify.put("/", profileController.updateProfile);
  fastify.post("/avatar", profileController.updateAvatar);

  fastify.get("/documents", profileController.getFormalDocuments);
  fastify.post("/documents", profileController.uploadFormalDocument);
};
