-- AlterTable
ALTER TABLE "CheckInLog" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "stress_level" INTEGER;

-- CreateTable
CREATE TABLE "PrivateNurse" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "condition_target" TEXT,
    "medication_name" TEXT,
    "medication_schedule" TEXT,
    "dietary_restrictions" TEXT,
    "doctor_instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivateNurse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "medical_encryption" BOOLEAN NOT NULL DEFAULT true,
    "biometric_login" BOOLEAN NOT NULL DEFAULT false,
    "location_tracking" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportConfig" (
    "id" SERIAL NOT NULL,
    "whatsapp_number" TEXT NOT NULL,
    "default_message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInfo" (
    "id" SERIAL NOT NULL,
    "app_name" TEXT NOT NULL,
    "latest_version" TEXT NOT NULL,
    "release_date" TEXT NOT NULL,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "copyright" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivateNurse_user_id_key" ON "PrivateNurse"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_user_id_key" ON "PrivacySettings"("user_id");

-- AddForeignKey
ALTER TABLE "PrivateNurse" ADD CONSTRAINT "PrivateNurse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
