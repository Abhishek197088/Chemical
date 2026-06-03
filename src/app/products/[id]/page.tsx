import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import ProductDetailsClient from "./ProductDetailsClient";

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch product from database
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: { name: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Serialize Decimal objects to standard numbers before passing to Client Component
  const serializedProduct = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    baseUnit: product.baseUnit,
    basePrice: product.basePrice.toNumber(),
    inventoryQuantity: product.inventoryQuantity.toNumber(),
    density: product.density ? product.density.toNumber() : null,
    imageUrl: product.imageUrl,
    category: {
      name: product.category.name,
    },
  };

  return <ProductDetailsClient product={serializedProduct} />;
}
