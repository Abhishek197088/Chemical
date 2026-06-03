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

const createQuotationSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().uuid("Invalid product ID"),
      quantity: z.number().positive("Quantity must be greater than zero"),
      unit: z.nativeEnum(Unit),
    })
  ).min(1, "Quotation must contain at least one item"),
});

// GET: List quotations (Admin sees all, User sees their own)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const where: any = {};
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    }

    const quotations = await prisma.quotation.findMany({
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

    return NextResponse.json(quotations);
  } catch (error) {
    console.error("Fetch quotations error:", error);
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

// POST: Create a new quotation
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const result = createQuotationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { items } = result.data;

    // Process items and verify pricing
    let quotationTotal = 0;
    const quotationItemsToCreate = [];

    for (const item of items) {
      // 1. Fetch product
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found for ID: ${item.productId}` },
          { status: 404 }
        );
      }

      // 2. Validate unit compatibility (checking if density allows weight <-> volume conversion)
      const hasDensity = product.density !== null;
      if (!areUnitsCompatible(product.baseUnit, item.unit, hasDensity)) {
        return NextResponse.json(
          {
            error: `Incompatible units for product "${product.name}". Quoted in "${item.unit}" but base unit is "${product.baseUnit}".`,
          },
          { status: 400 }
        );
      }

      // 3. Convert ordered quantity to base unit utilizing density
      const qtyInBase = convertToProductBase(item.quantity, item.unit, product.baseUnit, product.density);

      // 4. Calculate subtotal
      const subtotal = calculateItemPrice(
        product.basePrice,
        product.baseUnit,
        item.quantity,
        item.unit,
        product.density
      );

      quotationTotal += subtotal;

      quotationItemsToCreate.push({
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        calculatedQuantityInBase: qtyInBase,
        pricePerUnit: subtotal / item.quantity,
        subtotal: subtotal,
      });
    }

    // Create the Quotation record
    const quotation = await prisma.quotation.create({
      data: {
        userId: session.user.id,
        status: "PENDING",
        totalAmount: quotationTotal,
        items: {
          create: quotationItemsToCreate,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Create quotation error:", error);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
