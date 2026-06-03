import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { InventoryTransactionType } from "src/types/enums";

const adjustInventorySchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  changeQuantity: z.number("Change quantity must be a number"),
  type: z.nativeEnum(InventoryTransactionType),
  notes: z.string().optional(),
});

// GET: Retrieve all inventory logs (ADMIN & SELLER only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SELLER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "";

    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    const logs = await prisma.inventoryLog.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            baseUnit: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Fetch inventory logs error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory logs" }, { status: 500 });
  }
}

// POST: Log a manual stock adjustment (ADMIN & SELLER only)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SELLER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const body = await request.url ? await request.json() : {};
    const result = adjustInventorySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { productId, changeQuantity, type, notes } = result.data;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Perform adjustment in a database transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // Calculate new quantity
      const currentQty = product.inventoryQuantity.toNumber();
      const newQty = currentQty + changeQuantity;

      if (newQty < 0) {
        throw new Error("Inventory quantity cannot drop below zero");
      }

      // Update product inventory levels
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          inventoryQuantity: newQty,
        },
      });

      // Write transaction log
      const log = await tx.inventoryLog.create({
        data: {
          productId,
          changeQuantity,
          type,
          notes: notes || "Manual stock adjustment",
        },
      });

      return { product: updatedProduct, log };
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Adjust inventory error:", error);
    const message = error instanceof Error ? error.message : "Failed to adjust inventory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
