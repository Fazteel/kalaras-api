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

const initializeMinIO = async () => {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);

        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`[MinIO LOG]: Bucket '${bucketName}' berhasil dibuat.`);

            const policy = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Sid: "PublicReadGetObject",
                        Effect: "Allow",
                        Principal: "*",
                        Action: ["s3:GetObject"],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            };

            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
            console.log(`[MinIO LOG]: Kebijakan akses publik berhasil dikonfigurasi pada bucket '${bucketName}'.`);
        } else {
            console.log(`[MinIO LOG]: Bucket '${bucketName}' sudah tersedia.`);
        }
    } catch (err) {
        console.error("[MinIO ERROR]: Gagal melakukan inisialisasi konfigurasi storage:", err);
        process.exit(1);
    }
};

const uploadToMinIO = async (fileName, fileBuffer, mimeType) => {
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

module.exports = {
    initializeMinIO,
    uploadToMinIO
};