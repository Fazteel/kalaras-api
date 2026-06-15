const authController = require("../controllers/authControllers");

module.exports = async function (fastify, opts) {
  fastify.post("/register", authController.register);
  fastify.post("/login", authController.login);
  fastify.post("/logout", authController.logout);
  fastify.post("/refresh", authController.refresh);
  fastify.post("/verify-otp", authController.verifyOtp);
};
