import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { QuotationStatus } from "src/types/enums";

const updateQuotationStatusSchema = z.object({
  status: z.nativeEnum(QuotationStatus),
});

// PATCH: Approve or reject quotation (ADMIN only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateQuotationStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const newStatus = result.data.status;

    // Verify quotation exists
    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Update status
    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: newStatus,
      },
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

    return NextResponse.json(updatedQuotation);
  } catch (error) {
    console.error("Patch quotation error:", error);
    return NextResponse.json({ error: "Failed to update quotation status" }, { status: 500 });
  }
}
