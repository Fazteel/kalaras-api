const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Load data from draf_converted.json
const rawData = fs.readFileSync(path.join(__dirname, "draf_converted.json"), "utf8");
const rawTemplates = JSON.parse(rawData);

// Count occurrences of each intent to identify duplicates
const totalCounts = {};
for (const item of rawTemplates) {
  if (item.intent) {
    totalCounts[item.intent] = (totalCounts[item.intent] || 0) + 1;
  }
}

// Map templates with unique intent names
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
