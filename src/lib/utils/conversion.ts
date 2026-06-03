import { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;

export type UnitGroup = "weight" | "volume" | "count";

export const UNIT_CONFIG: Record<string, { group: UnitGroup; factor: number; label: string }> = {
  g: { group: "weight", factor: 1, label: "grams (g)" },
  kg: { group: "weight", factor: 1000, label: "kilograms (kg)" },
  mL: { group: "volume", factor: 1, label: "milliliters (mL)" },
  L: { group: "volume", factor: 1000, label: "liters (L)" },
  items: { group: "count", factor: 1, label: "items" },
};

/**
 * Checks if two units belong to the same conversion group (e.g., kg and g)
 * or if they can be cross-converted using product density (weight <-> volume).
 */
export function areUnitsCompatible(unitA: string, unitB: string, hasDensity: boolean = false): boolean {
  const configA = UNIT_CONFIG[unitA];
  const configB = UNIT_CONFIG[unitB];
  if (!configA || !configB) return false;
  if (configA.group === configB.group) return true;
  if (hasDensity) {
    const isWeightOrVolumeA = ["weight", "volume"].includes(configA.group);
    const isWeightOrVolumeB = ["weight", "volume"].includes(configB.group);
    return isWeightOrVolumeA && isWeightOrVolumeB;
  }
  return false;
}

/**
 * Converts a quantity from any unit to its internal base unit (grams, milliliters, items).
 */
export function convertToBase(quantity: number | string | Decimal, unit: string): number {
  const config = UNIT_CONFIG[unit];
  if (!config) {
    throw new Error(`Unsupported unit: ${unit}`);
  }
  const qty = typeof quantity === "object" ? quantity.toNumber() : Number(quantity);
  return qty * config.factor;
}

/**
 * Converts a quantity from the ordered unit to the product's internal database base unit,
 * utilizing density for cross-dimension weight <-> volume calculations.
 */
export function convertToProductBase(
  quantity: number | string | Decimal,
  orderedUnit: string,
  productBaseUnit: string,
  density?: number | string | Decimal | null
): number {
  const qty = typeof quantity === "object" ? quantity.toNumber() : Number(quantity);
  const configOrdered = UNIT_CONFIG[orderedUnit];
  const configProduct = UNIT_CONFIG[productBaseUnit];

  if (!configOrdered || !configProduct) {
    throw new Error(`Unsupported units: orderedUnit=${orderedUnit}, productBaseUnit=${productBaseUnit}`);
  }

  // 1. Same group conversion
  if (configOrdered.group === configProduct.group) {
    return convertToBase(qty, orderedUnit);
  }

  // 2. Cross-group conversion using density
  const densVal = density ? (typeof density === "object" ? density.toNumber() : Number(density)) : 1.0;

  if (configOrdered.group === "volume" && configProduct.group === "weight") {
    // Volume (mL) to Weight (grams): grams = mL * density
    const quantityInML = convertToBase(qty, orderedUnit);
    return quantityInML * densVal;
  } else if (configOrdered.group === "weight" && configProduct.group === "volume") {
    // Weight (grams) to Volume (mL): mL = grams / density
    const quantityInGrams = convertToBase(qty, orderedUnit);
    return quantityInGrams / densVal;
  }

  throw new Error(`Incompatible unit groups: ${configOrdered.group} and ${configProduct.group}`);
}

/**
 * Converts a quantity from the internal base unit to a target display unit.
 */
export function convertFromBase(quantityInBase: number | string | Decimal, toUnit: string): number {
  const config = UNIT_CONFIG[toUnit];
  if (!config) {
    throw new Error(`Unsupported unit: ${toUnit}`);
  }
  const baseQty = typeof quantityInBase === "object" ? quantityInBase.toNumber() : Number(quantityInBase);
  return baseQty / config.factor;
}

/**
 * Calculates the total price for an ordered quantity of a product based on its pricing.
 * @param basePrice Price of the product in its base unit (e.g., 60 INR per 1 kg)
 * @param baseUnit The product's base unit (e.g., kg)
 * @param orderedQuantity The quantity ordered (e.g., 3)
 * @param orderedUnit The unit of the quantity ordered (e.g., L)
 * @param density Optional density factor (in g/mL) for weight <-> volume conversion
 */
export function calculateItemPrice(
  basePrice: number | string | Decimal,
  baseUnit: string,
  orderedQuantity: number | string | Decimal,
  orderedUnit: string,
  density?: number | string | Decimal | null
): number {
  const price = typeof basePrice === "object" ? basePrice.toNumber() : Number(basePrice);
  const quantity = typeof orderedQuantity === "object" ? orderedQuantity.toNumber() : Number(orderedQuantity);
  const densVal = density ? (typeof density === "object" ? density.toNumber() : Number(density)) : null;

  if (!areUnitsCompatible(baseUnit, orderedUnit, densVal !== null)) {
    throw new Error(`Incompatible units: Product base unit "${baseUnit}" is incompatible with ordered unit "${orderedUnit}"`);
  }

  // 1. Convert ordered quantity to the product's database base unit
  const baseQtyRequired = convertToProductBase(quantity, orderedUnit, baseUnit, densVal);

  // 2. Convert from product's database base unit to the product's pricing baseUnit
  const qtyInProductBaseUnit = convertFromBase(baseQtyRequired, baseUnit);

  // 3. Multiply quantity in baseUnit by basePrice
  const rawPrice = qtyInProductBaseUnit * price;

  // Round to 6 decimal places to prevent floating point inaccuracies
  return Math.round(rawPrice * 1000000) / 1000000;
}

/**
 * Formats a number or Decimal into INR Currency string (e.g., ₹12,34,567.89)
 */
export function formatINR(amount: number | string | Decimal): string {
  const val = typeof amount === "object" ? amount.toNumber() : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(val);
}

/**
 * Converts a number or Decimal into INR Currency string in words (e.g., Rupees Nine Hundred and Seventy Only)
 */
export function formatINRInWords(amount: number | string | Decimal): string {
  const val = typeof amount === "object" ? amount.toNumber() : Number(amount);
  if (isNaN(val) || val < 0) return "Rupees Zero Only";
  
  // Split into rupees and paise
  const roundedAmount = Math.round(val * 100) / 100;
  const rupees = Math.floor(roundedAmount);
  const paise = Math.round((roundedAmount - rupees) * 100);
  
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];
  
  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }
  
  function convert(n: number): string {
    if (n === 0) return "Zero";
    let str = "";
    
    // Crores (1,00,00,000)
    if (n >= 10000000) {
      str += convertLessThanThousand(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    
    // Lakhs (1,00,000)
    if (n >= 100000) {
      str += convertLessThanThousand(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    
    // Thousands (1,000)
    if (n >= 1000) {
      str += convertLessThanThousand(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    
    str += convertLessThanThousand(n);
    return str.trim();
  }
  
  let rupeeWords = rupees === 0 ? "Zero" : convert(rupees);
  let paiseWords = paise > 0 ? convertLessThanThousand(paise) : "";
  
  let result = "Rupees " + rupeeWords;
  if (paiseWords) {
    result += " and " + paiseWords + " Paise";
  }
  result += " Only";
  
  return result;
}

