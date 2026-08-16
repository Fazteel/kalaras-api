const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const rawData = fs.readFileSync(path.join(__dirname, "draf_converted.json"), "utf8");
const rawTemplates = JSON.parse(rawData);

const totalCounts = {};
for (const item of rawTemplates) {
  if (item.intent) {
    totalCounts[item.intent] = (totalCounts[item.intent] || 0) + 1;
  }
}

const currentCounts = {};
const templates = rawTemplates.map(item => {
  const { intent, keywords, response_template } = item;
  if (!intent) return null;

  let uniqueIntent = intent;
  if (totalCounts[intent] > 1) {
    currentCounts[intent] = (currentCounts[intent] || 0) + 1;
    uniqueIntent = `${intent}_${currentCounts[intent]}`;
  }

  return {
    intent: uniqueIntent,
    keywords: keywords || "",
    response_template: response_template || "",
  };
}).filter(Boolean);

async function main() {
  console.log("Clearing existing chatbot templates...");
  await prisma.chatbotTemplate.deleteMany();

  console.log(`Start seeding chatbot templates (${templates.length} templates loaded)...`);
  for (const t of templates) {
    const template = await prisma.chatbotTemplate.create({
      data: t,
    });
    console.log(`Created template with intent: ${template.intent}`);
  }

  console.log("Clearing existing FAQs...");
  await prisma.faq.deleteMany();
  console.log("Seeding FAQs...");
  await prisma.faq.create({
    data: {
      id: 1,
      question: "Bagaimana cara kerja Perawat Pribadi?",
      answer: "Fitur ini akan mengingatkan jadwal minum obat dan pantangan medis Anda secara berkala.",
    },
  });

  console.log("Clearing existing support config...");
  await prisma.supportConfig.deleteMany();
  console.log("Seeding support config...");
  await prisma.supportConfig.create({
    data: {
      whatsapp_number: "6281234567890",
      default_message: "Halo Admin Kala Esok, saya butuh bantuan terkait aplikasi.",
    },
  });

  console.log("Clearing existing app info...");
  await prisma.appInfo.deleteMany();
  console.log("Seeding app info...");
  await prisma.appInfo.create({
    data: {
      app_name: "Kala Esok",
      latest_version: "1.0.0",
      release_date: "2026-06-16",
      force_update: false,
      copyright: "© 2026 Kala Esok. All rights reserved.",
    },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
