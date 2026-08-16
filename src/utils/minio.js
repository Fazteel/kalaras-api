const Minio = require('minio');
require('dotenv').config();

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'kalaras-bucket';

const crypto = require('crypto');

const getEncryptionKey = () => {
    const key = process.env.MINIO_ENCRYPTION_KEY;
    if (!key) {
        throw new Error("[Encryption Config ERROR]: MINIO_ENCRYPTION_KEY tidak ditemukan di environment variables!");
    }
    const keyBuffer = Buffer.from(key, 'utf8');
    if (keyBuffer.length !== 32) {
        throw new Error(`[Encryption Config ERROR]: MINIO_ENCRYPTION_KEY harus berukuran tepat 32 bytes! Ukuran saat ini: ${keyBuffer.length} bytes.`);
    }
    return keyBuffer;
};

const encryptBuffer = (plainBuffer) => {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]);
};

const decryptBuffer = (encryptedBuffer) => {
    const key = getEncryptionKey();

    if (encryptedBuffer.length < 28) {
        throw new Error("Data terenkripsi tidak valid atau terlalu pendek.");
    }

    const iv = encryptedBuffer.subarray(0, 12);
    const tag = encryptedBuffer.subarray(12, 28);
    const encrypted = encryptedBuffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

const initializeMinIO = async () => {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);

        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`[MinIO LOG]: Bucket '${bucketName}' berhasil dibuat.`);
        } else {
            console.log(`[MinIO LOG]: Bucket '${bucketName}' sudah tersedia.`);
        }

        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadGetObjectForAvatars",
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${bucketName}/avatar-*`]
                }
            ]
        };

        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log(`[MinIO LOG]: Kebijakan akses berhasil dikonfigurasi: Hanya prefix 'avatar-*' yang bersifat publik pada bucket '${bucketName}'.`);
    } catch (err) {
        console.warn("[MinIO WARN]: Gagal melakukan inisialisasi konfigurasi storage. Menggunakan fallback lokal.");
        minioClient.isMock = true;
    }
};

const uploadToMinIO = async (fileName, fileBuffer, mimeType) => {
    if (minioClient.isMock) {
        console.log(`[MinIO Mock]: Unggah berkas ${fileName}`);
        return `http://localhost:3000/mock-uploads/${fileName}`;
    }
    try {
        await minioClient.putObject(bucketName, fileName, fileBuffer, fileBuffer.length, {
            'Content-Type': mimeType
        });

        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        const fileUrl = `${protocol}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${fileName}`;

        return fileUrl;
    } catch (err) {
        console.error("[MinIO ERROR]: Gagal mengunggah berkas ke storage server:", err);
        throw err;
    }
};

const downloadFromMinIO = async (fileName) => {
    if (minioClient.isMock) {
        return Buffer.from("mock content");
    }
    return new Promise((resolve, reject) => {
        minioClient.getObject(bucketName, fileName, (err, dataStream) => {
            if (err) {
                return reject(err);
            }
            const chunks = [];
            dataStream.on('data', (chunk) => chunks.push(chunk));
            dataStream.on('end', () => resolve(Buffer.concat(chunks)));
            dataStream.on('error', (streamErr) => reject(streamErr));
        });
    });
};

const getPresignedUrl = async (fileName, expiryInSeconds = 300) => {
    if (minioClient.isMock) {
        return `http://localhost:3000/mock-uploads/${fileName}?presigned=true`;
    }
    try {
        return await minioClient.presignedGetObject(bucketName, fileName, expiryInSeconds);
    } catch (err) {
        console.error(`[MinIO ERROR]: Gagal mendapatkan presigned URL untuk '${fileName}':`, err);
        throw err;
    }
};

module.exports = {
    initializeMinIO,
    uploadToMinIO,
    downloadFromMinIO,
    getPresignedUrl,
    encryptBuffer,
    decryptBuffer
};
