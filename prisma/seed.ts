import { Prisma } from "@prisma/client";
import { Role, Unit, InventoryTransactionType } from "../src/types/enums";
import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Starting database seed...");

  // 1. Clean existing database
  console.log("Cleaning database...");
  await prisma.inventoryLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  console.log("Creating users...");
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const sellerPassword = await bcrypt.hash("Seller@123", 10);
  const buyerPassword = await bcrypt.hash("Buyer@123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@inventory.com",
      name: "Admin User",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const seller = await prisma.user.create({
    data: {
      email: "seller@inventory.com",
      name: "Seller User",
      password: sellerPassword,
      role: Role.SELLER,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      email: "buyer@inventory.com",
      name: "Buyer User",
      password: buyerPassword,
      role: Role.BUYER,
    },
  });

  console.log(`Created users: Admin (${admin.email}), Seller (${seller.email}), Buyer (${buyer.email})`);

  // 3. Create Categories
  console.log("Creating categories...");
  const categories = {
    solids: await prisma.category.create({
      data: { name: "Chemical Solids", description: "Solid chemicals, salts, and powders" },
    }),
    liquids: await prisma.category.create({
      data: { name: "Chemical Liquids", description: "Liquid chemicals, solvents, and acids" },
    }),
    equipment: await prisma.category.create({
      data: { name: "Lab Equipment", description: "Glassware, instruments, and containers" },
    }),
  };

  console.log("Created categories");

  // 4. Create Products
  console.log("Creating products...");
  
  const productData = [
    {
      name: "Sulphur Powder (Pure)",
      sku: "CHM-SUL-001",
      description: "Elemental Sulphur powder, stored internally in grams. Density: 2.07 g/cm³ (kg/L).",
      categoryId: categories.solids.id,
      baseUnit: Unit.kg,
      basePrice: new Prisma.Decimal(150.00), // 150 INR per kg
      inventoryQuantity: new Prisma.Decimal(1000000.00), // 1,000 kg (stored as 1,000,000 grams)
      density: new Prisma.Decimal(2.07),
      imageUrl: "/images/pure_sulphur_powder.png",
    },
    {
      name: "Industrial Ethanol (99%)",
      sku: "CHM-ETH-001",
      description: "Fresh high-purity ethanol, stored internally in milliliters. Density: 0.789 g/mL (kg/L).",
      categoryId: categories.liquids.id,
      baseUnit: Unit.L,
      basePrice: new Prisma.Decimal(85.00), // 85 INR per Liter
      inventoryQuantity: new Prisma.Decimal(500000.00), // 500 Liters (stored as 500,000 mL)
      density: new Prisma.Decimal(0.789),
      imageUrl: "/images/industrial_ethanol.png",
    },
    {
      name: "Sulphuric Acid (98%)",
      sku: "CHM-SAC-001",
      description: "Concentrated Sulphuric Acid, stored internally in milliliters. Density: 1.84 g/mL (kg/L). Highly corrosive.",
      categoryId: categories.liquids.id,
      baseUnit: Unit.L,
      basePrice: new Prisma.Decimal(240.00), // 240 INR per Liter
      inventoryQuantity: new Prisma.Decimal(200000.00), // 200 Liters (stored as 200,000 mL)
      density: new Prisma.Decimal(1.84),
      imageUrl: "/images/sulphuric_acid.png",
    },
    {
      name: "Sodium Hydroxide Pellets",
      sku: "CHM-SOH-001",
      description: "Caustic soda pellets, stored internally in grams. Density: 2.13 g/mL (kg/L).",
      categoryId: categories.solids.id,
      baseUnit: Unit.kg,
      basePrice: new Prisma.Decimal(110.00), // 110 INR per kg
      inventoryQuantity: new Prisma.Decimal(400000.00), // 400 kg (stored as 400,000 grams)
      density: new Prisma.Decimal(2.13),
      imageUrl: "/images/sodium_hydroxide_pellets.png",
    },
    {
      name: "Glass Beaker 250ml",
      sku: "EQP-BKR-250",
      description: "Borosilicate glass beaker for lab measurements, stored internally in items. Count unit (no density).",
      categoryId: categories.equipment.id,
      baseUnit: Unit.items,
      basePrice: new Prisma.Decimal(45.00), // 45 INR per item
      inventoryQuantity: new Prisma.Decimal(150.00), // 150 items
      density: null,
      imageUrl: "/images/glass_beaker_250ml.png",
    },
  ];

  for (const item of productData) {
    const product = await prisma.product.create({
      data: item,
    });

    // Create an initial stock transaction log
    await prisma.inventoryLog.create({
      data: {
        productId: product.id,
        changeQuantity: product.inventoryQuantity,
        type: InventoryTransactionType.STOCK_IN,
        notes: "Initial chemical database seed stock import",
      },
    });

    console.log(`Created product: ${product.name} (${product.sku}) - Stock: ${product.inventoryQuantity}`);
  }

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
