const authenticate = require("../middlewares/auth");
const pocketController = require("../controllers/pocketControllers");

module.exports = async function (fastify, opts) {
  fastify.addHook("preValidation", authenticate);

  fastify.get("/emergency-contacts", pocketController.getEmergencyContacts);
  fastify.post("/emergency-contacts", pocketController.createEmergencyContact);
  fastify.put(
    "/emergency-contacts/:id",
    pocketController.updateEmergencyContact,
  );
  fastify.delete(
    "/emergency-contacts/:id",
    pocketController.deleteEmergencyContact,
  );

  fastify.get("/journal", pocketController.getJournalEntries);
  fastify.post("/journal", pocketController.createJournalEntry);
  fastify.put("/journal/:id", pocketController.updateJournalEntry);
  fastify.delete("/journal/:id", pocketController.deleteJournalEntry);
};
