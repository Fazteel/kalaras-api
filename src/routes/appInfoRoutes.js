const appInfoController = require("../controllers/appInfoControllers");

module.exports = async function (fastify, opts) {
  fastify.get("/info", {
    schema: {
      description: "Get App Info & Minimum Supported Version",
      tags: ["App Info"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            data: {
              type: "object",
              properties: {
                app_name: { type: "string" },
                latest_version: { type: "string" },
                release_date: { type: "string" },
                force_update: { type: "boolean" },
                copyright: { type: "string" },
              },
            },
          },
        },
      },
    },
  }, appInfoController.getAppInfo);
};
