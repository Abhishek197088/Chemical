import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { Unit } from "src/types/enums";

// Product validation schema for creation
const createProductSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().min(3, "SKU is required").transform((val) => val.toUpperCase().trim()),
  description: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID"),
  baseUnit: z.nativeEnum(Unit),
  basePrice: z.number().positive("Base price must be greater than 0"),
  inventoryQuantity: z.number().nonnegative("Inventory quantity must be 0 or more"),
  density: z.number().positive("Density must be greater than 0").optional().nullable().default(1.0),
  imageUrl: z.string().optional().nullable(),
});

// GET: List products with search, category, and unit filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const categoryId = searchParams.get("categoryId") || "";
    const baseUnit = searchParams.get("baseUnit") || "";

    const where: any = {};

    // Filter by SKU or Name search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by Category
    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    // Filter by Base Unit
    if (baseUnit && baseUnit !== "all") {
      where.baseUnit = baseUnit as Unit;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST: Create a product (ADMIN & SELLER only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SELLER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await request.json();
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const data = result.data;

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      return NextResponse.json({ error: `SKU "${data.sku}" is already in use` }, { status: 409 });
    }

    // Create product and log initial inventory transaction in a transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          description: data.description,
          categoryId: data.categoryId,
          baseUnit: data.baseUnit,
          basePrice: data.basePrice,
          inventoryQuantity: data.inventoryQuantity,
          density: data.density ?? 1.0,
          imageUrl: data.imageUrl,
        },
      });

      // Log the initial stock
      await tx.inventoryLog.create({
        data: {
          productId: product.id,
          changeQuantity: data.inventoryQuantity,
          type: "STOCK_IN",
          notes: "Initial inventory setup",
        },
      });

      return product;
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
