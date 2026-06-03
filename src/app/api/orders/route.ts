import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { Unit } from "src/types/enums";
import {
  areUnitsCompatible,
  convertToBase,
  convertToProductBase,
  calculateItemPrice,
} from "src/lib/utils/conversion";

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid("Invalid product ID"),
      orderedQuantity: z.number().positive("Quantity must be greater than zero"),
      orderedUnit: z.nativeEnum(Unit),
    })
  ).min(1, "Order must contain at least one item"),
});

// GET: Retrieve order history (Admin sees all, User sees their own)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const where: any = {};
    if (session.user.role !== "ADMIN" && session.user.role !== "SELLER") {
      where.userId = session.user.id;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
                baseUnit: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST: Create a new order (Saves details and deducts inventory in base units)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const result = createOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { items } = result.data;

    // Run database operations in a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      let orderTotal = 0;
      const orderItemsToCreate: any[] = [];
      const stockDeductionUpdates: any[] = [];

      for (const item of items) {
        // 1. Fetch product
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found for ID: ${item.productId}`);
        }

        // 2. Validate unit compatibility (checking if density allows weight <-> volume conversion)
        const hasDensity = product.density !== null;
        if (!areUnitsCompatible(product.baseUnit, item.orderedUnit, hasDensity)) {
          throw new Error(
            `Incompatible units for product "${product.name}". Ordered in "${item.orderedUnit}" but base unit is "${product.baseUnit}".`
          );
        }

        // 3. Convert ordered quantity to internal base units (g, mL, items) utilizing density
        const qtyInBase = convertToProductBase(
          item.orderedQuantity,
          item.orderedUnit,
          product.baseUnit,
          product.density
        );

        // 4. Check stock levels
        const currentStock = product.inventoryQuantity.toNumber();
        if (currentStock < qtyInBase) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${item.orderedQuantity} ${item.orderedUnit}, Available: ${currentStock} base units.`
          );
        }

        // 5. Calculate item pricing
        const subtotal = calculateItemPrice(
          product.basePrice,
          product.baseUnit,
          item.orderedQuantity,
          item.orderedUnit,
          product.density
        );

        orderTotal += subtotal;

        // Save order item specs
        orderItemsToCreate.push({
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          orderedUnit: item.orderedUnit,
          calculatedQuantityInBase: qtyInBase,
          pricePerUnit: subtotal / item.orderedQuantity,
          subtotal: subtotal,
        });

        // Add to queue for updating product stock levels
        stockDeductionUpdates.push({
          productId: item.productId,
          newQuantity: currentStock - qtyInBase,
          deductedQty: qtyInBase,
          productName: product.name,
        });
      }

      // 6. Create the Order
      const order = await tx.order.create({
        data: {
          userId: session.user.id,
          status: "PENDING",
          totalAmount: orderTotal,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      });

      // 7. Update inventory and log stock reduction
      for (const update of stockDeductionUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: {
            inventoryQuantity: update.newQuantity,
          },
        });

        await tx.inventoryLog.create({
          data: {
            productId: update.productId,
            changeQuantity: -update.deductedQty,
            type: "SALE",
            referenceId: order.id,
            notes: `Order #${order.id.slice(0, 8)} purchase deduction.`,
          },
        });
      }

      return order;
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("Create order transaction error:", error);
    const message = error instanceof Error ? error.message : "Failed to place order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
