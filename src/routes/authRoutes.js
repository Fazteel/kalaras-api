const authController = require("../controllers/authControllers");

module.exports = async function (fastify, opts) {
  fastify.post("/register", {
    schema: {
      description: "Register a new user account",
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["email", "password", "full_name", "religion"],
        properties: {
          email: { type: "string", format: "email", description: "User email address" },
          password: { type: "string", minLength: 6, description: "Account password" },
          full_name: { type: "string", description: "Full name" },
          religion: { type: "string", description: "Religion" },
          marital_status: { type: "string", description: "Marital status", default: "Belum Kawin" },
          phone: { type: "string", description: "Phone number (for OTP)" },
          referred_by: { type: "string", description: "Referral code" },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            message: { type: "string" },
            user_id: { type: "string" },
          },
        },
      },
    },
  }, authController.register);

  fastify.post("/login", {
    schema: {
      description: "Login with email and password",
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            access_token: { type: "string" },
            refresh_token: { type: "string" },
          },
        },
      },
    },
  }, authController.login);

  fastify.post("/logout", {
    schema: {
      description: "Logout and invalidate refresh token",
      tags: ["Auth"],
      body: {
        type: "object",
        properties: {
          refresh_token: { type: "string" },
        },
      },
    },
  }, authController.logout);

  fastify.post("/refresh", {
    schema: {
      description: "Refresh access token using refresh token",
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["refresh_token"],
        properties: {
          refresh_token: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            access_token: { type: "string" },
          },
        },
      },
    },
  }, authController.refresh);

  fastify.post("/verify-otp", {
    schema: {
      description: "Verify OTP code sent to phone number",
      tags: ["Auth"],
      body: {
        type: "object",
        required: ["phone", "otp"],
        properties: {
          phone: { type: "string", description: "Phone number registered" },
          otp: { type: "string", description: "OTP code received" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  }, authController.verifyOtp);
};
