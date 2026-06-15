const authenticate = require("../middlewares/auth");
const emergencyController = require("../controllers/emergencyControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.post("/trigger", emergencyController.triggerEmergency);
  fastify.get("/logs", emergencyController.getEmergencyLogs);
};
