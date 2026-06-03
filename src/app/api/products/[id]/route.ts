import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { Unit } from "src/types/enums";

const updateProductSchema = z.object({
  name: z.string().min(2, "Product name is required").optional(),
  sku: z.string().min(3, "SKU is required").transform((val) => val.toUpperCase().trim()).optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID").optional(),
  baseUnit: z.nativeEnum(Unit).optional(),
  basePrice: z.number().positive("Base price must be greater than 0").optional(),
  inventoryQuantity: z.number().nonnegative("Inventory quantity must be 0 or more").optional(),
  density: z.number().positive("Density must be greater than 0").optional().nullable(),
  imageUrl: z.string().optional().nullable(),
});

// PUT: Update product details (ADMIN & SELLER only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SELLER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const data = result.data;

    // Check if product exists
    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== currentProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        return NextResponse.json({ error: `SKU "${data.sku}" is already in use` }, { status: 409 });
      }
    }

    // Perform update in a transaction to log adjustments if inventory quantity is changed
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updateData: any = { ...data };

      let inventoryChange = 0;
      if (data.inventoryQuantity !== undefined) {
        const currentQty = currentProduct.inventoryQuantity.toNumber();
        const newQty = data.inventoryQuantity;
        inventoryChange = newQty - currentQty;
      }

      const product = await tx.product.update({
        where: { id },
        data: updateData,
      });

      if (inventoryChange !== 0) {
        await tx.inventoryLog.create({
          data: {
            productId: product.id,
            changeQuantity: inventoryChange,
            type: "ADJUSTMENT",
            notes: `Manual stock level override adjustment. Old: ${currentProduct.inventoryQuantity.toString()}, New: ${product.inventoryQuantity.toString()}`,
          },
        });
      }

      return product;
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE: Delete product (ADMIN only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;

    // Verify product exists
    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete product. Prisma will cascade delete inventory logs if onDelete cascade is set, or we handle it here
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Failed to delete product. It may be referenced in existing orders." }, { status: 500 });
  }
}
