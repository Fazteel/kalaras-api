-- CreateTable
CREATE TABLE "KalarasHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_message" TEXT NOT NULL,
    "ai_reply" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KalarasHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KalarasHistory" ADD CONSTRAINT "KalarasHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
