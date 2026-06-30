module.exports = (requiredRole) => {
  return async (request, reply) => {
    if (!request.user || request.user.role !== requiredRole) {
      return reply.code(403).send({
        error: "Anda tidak memiliki izin untuk mengakses sumber daya ini.",
      });
    }
  };
};
