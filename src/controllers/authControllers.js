const bcrypt = require("bcrypt");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (request, reply) => {
  const {
    email,
    password,
    full_name,
    religion,
    marital_status,
    phone,
    referred_by,
  } = request.body;

  try {
    const password_hash = await bcrypt.hash(password, 10);

    const user = await request.server.prisma.user.create({
      data: {
        email,
        password_hash,
        phone: phone || null,
        referred_by: referred_by || null,
        pocket_profile: {
          create: {
            full_name,
            religion,
            marital_status: marital_status || "Belum Kawin",
          },
        },
      },
    });

    if (phone) {
      const otpCode = generateOTP();
      const redisKey = `otp:${phone}`;

      await request.server.redis.set(redisKey, otpCode, { EX: 300 });

      request.server.log.info(
        `[OTP MOCK] Mengirim kode OTP ${otpCode} ke nomor ${phone}`,
      );
    }

    return reply.code(201).send({
      message: "Registrasi akun berhasil dilakukan.",
      user_id: user.id,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply.code(400).send({
      error:
        "Gagal melakukan registrasi. Alamat email atau nomor telepon mungkin telah digunakan.",
    });
  }
};

const login = async (request, reply) => {
  const { email, password } = request.body;

  try {
    const user = await request.server.prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return reply
        .code(404)
        .send({ error: "Alamat email tidak terdaftar dalam sistem." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return reply
        .code(401)
        .send({ error: "Kata sandi yang Anda masukkan salah." });
    }

    const accessToken = request.server.jwt.sign(
      { id: user.id, email: user.email, role: user.role, tier: user.tier },
      { expiresIn: "15m" },
    );

    const refreshToken = request.server.jwt.sign(
      { id: user.id },
      { expiresIn: "7d" },
    );

    const redisRefreshKey = `refresh:${user.id}`;
    await request.server.redis.set(redisRefreshKey, refreshToken, {
      EX: 604800,
    });

    reply.setCookie("token", accessToken, {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: true,
      maxAge: 15 * 60,
    });

    return reply.send({
      message: "Otentikasi berhasil. Selamat datang kembali.",
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Terjadi kesalahan internal pada server." });
  }
};

const logout = async (request, reply) => {
  try {
    const { refresh_token } = request.body || {};

    if (refresh_token) {
      try {
        const decoded = request.server.jwt.verify(refresh_token);
        await request.server.redis.del(`refresh:${decoded.id}`);
      } catch (e) {}
    }

    reply.clearCookie("token", { path: "/" });

    return reply.send({
      message: "Sesi Anda telah berakhir. Log out berhasil.",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Terjadi kesalahan saat memproses log out." });
  }
};

const refresh = async (request, reply) => {
  const { refresh_token } = request.body;

  if (!refresh_token) {
    return reply
      .code(400)
      .send({ error: "Refresh token tidak disertakan dalam permintaan." });
  }

  try {
    const decoded = request.server.jwt.verify(refresh_token);
    const redisRefreshKey = `refresh:${decoded.id}`;
    const storedToken = await request.server.redis.get(redisRefreshKey);

    if (!storedToken || storedToken !== refresh_token) {
      return reply.code(403).send({
        error:
          "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
      });
    }

    const user = await request.server.prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return reply
        .code(404)
        .send({ error: "Pengguna tidak ditemukan dalam sistem." });
    }

    const newAccessToken = request.server.jwt.sign(
      { id: user.id, email: user.email, role: user.role, tier: user.tier },
      { expiresIn: "15m" },
    );

    reply.setCookie("token", newAccessToken, {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: true,
      maxAge: 15 * 60,
    });

    return reply.send({
      message: "Masa aktif sesi berhasil diperbarui.",
      access_token: newAccessToken,
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(403)
      .send({ error: "Proses pembaruan sesi gagal. Token tidak sah." });
  }
};

const verifyOtp = async (request, reply) => {
  const { phone, otp } = request.body;

  if (!phone || !otp) {
    return reply
      .code(400)
      .send({ error: "Nomor telepon dan kode OTP wajib diisi." });
  }

  try {
    const redisKey = `otp:${phone}`;
    const storedOtp = await request.server.redis.get(redisKey);

    if (!storedOtp) {
      return reply
        .code(400)
        .send({ error: "Kode OTP telah kedaluwarsa atau tidak ditemukan." });
    }

    if (storedOtp !== otp) {
      return reply
        .code(400)
        .send({ error: "Kode OTP yang Anda masukkan salah." });
    }

    await request.server.redis.del(redisKey);
    return reply.send({
      message: "Verifikasi kode OTP berhasil diselesaikan.",
    });
  } catch (err) {
    request.server.log.error(err);
    return reply
      .code(500)
      .send({ error: "Terjadi kesalahan internal saat memverifikasi OTP." });
  }
};

module.exports = {
  register,
  login,
  logout,
  refresh,
  verifyOtp,
};
