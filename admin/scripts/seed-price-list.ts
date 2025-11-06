import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultProcedures = [
  {
    title: "Teeth Cleaning",
    description: "Professional dental cleaning and plaque removal",
    price: 150.0,
    category: "Cleaning",
    duration: 60,
    order: 1,
    isActive: true,
  },
  {
    title: "Teeth Whitening",
    description: "Professional teeth whitening treatment",
    price: 300.0,
    category: "Cosmetic",
    duration: 90,
    order: 2,
    isActive: true,
  },
  {
    title: "Dental Filling",
    description: "Composite or amalgam filling for cavities",
    price: 200.0,
    category: "Restoration",
    duration: 45,
    order: 3,
    isActive: true,
  },
  {
    title: "Root Canal Treatment",
    description: "Endodontic treatment to save an infected tooth",
    price: 800.0,
    category: "Restoration",
    duration: 120,
    order: 4,
    isActive: true,
  },
  {
    title: "Tooth Extraction",
    description: "Simple tooth extraction procedure",
    price: 250.0,
    category: "Surgery",
    duration: 30,
    order: 5,
    isActive: true,
  },
  {
    title: "Wisdom Tooth Extraction",
    description: "Surgical removal of wisdom teeth",
    price: 500.0,
    category: "Surgery",
    duration: 60,
    order: 6,
    isActive: true,
  },
  {
    title: "Dental Crown",
    description: "Porcelain or metal crown placement",
    price: 1200.0,
    category: "Restoration",
    duration: 90,
    order: 7,
    isActive: true,
  },
  {
    title: "Dental Implant",
    description: "Titanium implant placement",
    price: 2500.0,
    category: "Surgery",
    duration: 120,
    order: 8,
    isActive: true,
  },
  {
    title: "Dental X-Ray",
    description: "Digital dental X-ray examination",
    price: 80.0,
    category: "Diagnostic",
    duration: 15,
    order: 9,
    isActive: true,
  },
  {
    title: "Dental Consultation",
    description: "Initial consultation and examination",
    price: 100.0,
    category: "Diagnostic",
    duration: 30,
    order: 10,
    isActive: true,
  },
  {
    title: "Gum Treatment",
    description: "Periodontal treatment for gum disease",
    price: 400.0,
    category: "Treatment",
    duration: 60,
    order: 11,
    isActive: true,
  },
  {
    title: "Dental Bridge",
    description: "Fixed bridge to replace missing teeth",
    price: 1800.0,
    category: "Restoration",
    duration: 90,
    order: 12,
    isActive: true,
  },
];

async function seedPriceList() {
  try {
    console.log("🌱 Seeding price list...");

    // Check if price list already has items
    const existingCount = await (prisma as any).priceList.count();
    if (existingCount > 0) {
      console.log(`⚠️  Price list already has ${existingCount} items. Skipping seed.`);
      console.log("   To reset, delete all items first.");
      return;
    }

    // Create all procedures
    for (const procedure of defaultProcedures) {
      await (prisma as any).priceList.create({
        data: procedure,
      });
      console.log(`✅ Added: ${procedure.title} - $${procedure.price}`);
    }

    console.log(`\n✨ Successfully seeded ${defaultProcedures.length} procedures!`);
  } catch (error) {
    console.error("❌ Error seeding price list:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPriceList();

