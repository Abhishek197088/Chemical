import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { OrderStatus, Unit } from "src/types/enums";
import {
  areUnitsCompatible,
  convertToProductBase,
  calculateItemPrice,
} from "src/lib/utils/conversion";

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const modifyOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid("Invalid product ID"),
      orderedQuantity: z.number().positive("Quantity must be greater than zero"),
      orderedUnit: z.nativeEnum(Unit),
    })
  ).min(1, "Order must contain at least one item"),
});

// PATCH: Update order status (ADMIN only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SELLER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateOrderStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const newStatus = result.data.status;

    // Run order status transition in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const prevStatus = order.status;

      // No action needed if status is already correct
      if (prevStatus === newStatus) {
        return order;
      }

      // Case 1: Active/Pending/Approved/Completed -> REJECTED (Return stock)
      if (newStatus === "REJECTED" && prevStatus !== "REJECTED") {
        for (const item of order.items) {
          const qtyInBase = item.calculatedQuantityInBase.toNumber();

          // Increment stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: {
                increment: qtyInBase,
              },
            },
          });

          // Log returning inventory
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              changeQuantity: qtyInBase,
              type: "RETURN",
              referenceId: order.id,
              notes: `Order Rejected. Returned ${item.orderedQuantity.toString()} ${item.orderedUnit.toString()} to inventory.`,
            },
          });
        }
      }

      // Case 2: REJECTED -> Active/Pending/Approved/Completed (Deduct stock again)
      if (prevStatus === "REJECTED" && newStatus !== "REJECTED") {
        for (const item of order.items) {
          const qtyInBase = item.calculatedQuantityInBase.toNumber();

          // Refetch product in transaction to check current stock
          const currentProd = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!currentProd) {
            throw new Error(`Product ${item.productId} no longer exists`);
          }

          const currentStock = currentProd.inventoryQuantity.toNumber();
          if (currentStock < qtyInBase) {
            throw new Error(
              `Cannot re-open order. Product "${currentProd.name}" does not have sufficient stock. Available: ${currentStock} base units, Required: ${qtyInBase} base units.`
            );
          }

          // Decrement stock
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventoryQuantity: {
                decrement: qtyInBase,
              },
            },
          });

          // Log deduction
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              changeQuantity: -qtyInBase,
              type: "SALE",
              referenceId: order.id,
              notes: `Order Status changed from REJECTED to ${newStatus}. Deducted ${item.orderedQuantity.toString()} ${item.orderedUnit.toString()} from inventory.`,
            },
          });
        }
      }

      // Finally, update the status
      return await tx.order.update({
        where: { id },
        data: { status: newStatus },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Patch order error:", error);
    const message = error instanceof Error ? error.message : "Failed to update order status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PUT: Modify order items & quantities (ADMIN & SELLER only)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SELLER")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = modifyOrderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { items: newItems } = result.data;

    // Run modification inside database transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch current order with items
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Check status
      if (order.status === "COMPLETED") {
        throw new Error("Cannot modify a completed order");
      }

      // Step A: Revert old items stock deductions if the order was not already rejected
      if (order.status !== "REJECTED") {
        for (const oldItem of order.items) {
          const qtyInBase = oldItem.calculatedQuantityInBase.toNumber();
          await tx.product.update({
            where: { id: oldItem.productId },
            data: {
              inventoryQuantity: {
                increment: qtyInBase,
              },
            },
          });

          await tx.inventoryLog.create({
            data: {
              productId: oldItem.productId,
              changeQuantity: qtyInBase,
              type: "RETURN",
              referenceId: order.id,
              notes: `Order #${order.id.slice(0, 8)} modification rollback.`,
            },
          });
        }
      }

      // Step B: Calculate new items subtotals and check/deduct stock
      let orderTotal = 0;
      const orderItemsToCreate = [];
      const stockDeductionUpdates = [];

      for (const newItem of newItems) {
        // Fetch product
        const product = await tx.product.findUnique({
          where: { id: newItem.productId },
        });

        if (!product) {
          throw new Error(`Product not found for ID: ${newItem.productId}`);
        }

        const hasDensity = product.density !== null;
        if (!areUnitsCompatible(product.baseUnit, newItem.orderedUnit, hasDensity)) {
          throw new Error(
            `Incompatible units for product "${product.name}". Ordered in "${newItem.orderedUnit}" but base unit is "${product.baseUnit}".`
          );
        }

        const qtyInBase = convertToProductBase(
          newItem.orderedQuantity,
          newItem.orderedUnit,
          product.baseUnit,
          product.density
        );

        // Fetch current stock from the database (reflects any restorations from Step A)
        const productWithRestoredStock = await tx.product.findUnique({
          where: { id: newItem.productId },
        });
        const restoredStock = productWithRestoredStock ? productWithRestoredStock.inventoryQuantity.toNumber() : 0;

        if (order.status !== "REJECTED" && restoredStock < qtyInBase) {
          throw new Error(
            `Insufficient stock for product "${product.name}". Required: ${newItem.orderedQuantity} ${newItem.orderedUnit}, Available: ${restoredStock} base units.`
          );
        }

        const subtotal = calculateItemPrice(
          product.basePrice,
          product.baseUnit,
          newItem.orderedQuantity,
          newItem.orderedUnit,
          product.density
        );

        orderTotal += subtotal;

        orderItemsToCreate.push({
          productId: newItem.productId,
          orderedQuantity: newItem.orderedQuantity,
          orderedUnit: newItem.orderedUnit,
          calculatedQuantityInBase: qtyInBase,
          pricePerUnit: subtotal / newItem.orderedQuantity,
          subtotal: subtotal,
        });

        stockDeductionUpdates.push({
          productId: newItem.productId,
          newQuantity: restoredStock - qtyInBase,
          deductedQty: qtyInBase,
        });
      }

      // Step C: Apply new stock deductions if the order is not rejected
      if (order.status !== "REJECTED") {
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
              notes: `Order #${order.id.slice(0, 8)} modification deduction.`,
            },
          });
        }
      }

      // Step D: Delete existing order items and create new ones
      await tx.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      // Step E: Update the Order total amount
      const updatedOrderRecord = await tx.order.update({
        where: { id: order.id },
        data: {
          totalAmount: orderTotal,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
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
      });

      return updatedOrderRecord;
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Modify order PUT error:", error);
    const message = error instanceof Error ? error.message : "Failed to modify order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
