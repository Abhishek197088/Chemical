export enum Role {
  ADMIN = "ADMIN",
  SELLER = "SELLER",
  BUYER = "BUYER",
}

export enum Unit {
  g = "g",
  kg = "kg",
  mL = "mL",
  L = "L",
  items = "items",
}

export enum OrderStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
}

export enum QuotationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum InventoryTransactionType {
  STOCK_IN = "STOCK_IN",
  STOCK_OUT = "STOCK_OUT",
  ADJUSTMENT = "ADJUSTMENT",
  SALE = "SALE",
  RETURN = "RETURN",
}
