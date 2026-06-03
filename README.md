# AasaMedChem - Chemical Inventory & Order Management System

An enterprise-grade, high-precision Chemical Inventory, Order, and Price Quotation management platform built with Next.js 15 (React 19, TypeScript), PostgreSQL (Neon), Prisma ORM, NextAuth, and Tailwind CSS. Designed specifically for industrial chemical distribution with support for fractional purchases, dynamic unit conversions, live rate calculations, and dual numeric/word price translations.

---

## 1. Project Overview

AasaMedChem serves as a specialized chemical inventory management and sales portal. Buyers can browse chemicals and purchase custom quantities (e.g. 9.7g or 0.5L) in their preferred units, with pricing computed in high precision. Sellers can view, modify, and approve orders within a transactional database model that securely tracks stock levels and history logs.

## 2. Features

- **High Precision Calculations**: Full database support utilizing PostgreSQL `NUMERIC(20,6)` mapped through Prisma Decimal types to completely prevent JavaScript floating-point rounding errors.
- **Fractional/Decimal Checkouts**: Buyers can enter custom fractional inputs (e.g., `9.7` g of Sulphur or `0.5` L of Ethanol) on catalog pages, cart drafts, and quote forms.
- **Words Currency Translator**: Automatically translates and displays all calculated prices and order totals in Indian Rupees (INR, ₹) in both decimal numeric and spelled-out words formats (e.g., *Rupees Nine Hundred and Seventy and Fifty Paise Only*).
- **Interactive Inventory Capacity Level**: Color-coded, animated progress meters showing inventory levels (Healthy, Low Stock, or Depleted) based on base storage units.
- **Dual Seller & Admin Control Dashboard**: Both Admins and Sellers can review all buyer purchase orders, perform inline quantity edits, adjust stock levels via transactional logic, and approve/reject requests.
- **Secure Authentication**: Session protection and role-based route access controls (Admin, Seller, Buyer).

---

## 3. System Architecture

AasaMedChem separates concerns between client-side dashboards, server-side data routing, and high-precision transactional storage.

```mermaid
graph TD
    Client[Client Dashboard / Browser]
    Middleware[NextAuth Middleware / Router Protection]
    ServerActions[Next.js API Routes & Server Components]
    DriverAdapter[Prisma PG Driver Adapter pool]
    DB[(Neon PostgreSQL Database)]

    Client -->|HTTP / JSON Requests| Middleware
    Middleware -->|Authorized Session| ServerActions
    ServerActions -->|Query Commands| DriverAdapter
    DriverAdapter -->|TCP SQL Operations| DB
```

---

## 4. Database Design & ER Diagram

The database utilizes relational integrity, transactional safety, and indexes to support fast query operations.

```mermaid
erDiagram
    USER {
        string id PK
        string name
        string email UK
        string password
        Role role
        datetime createdAt
    }
    CATEGORY {
        string id PK
        string name UK
        string description
    }
    PRODUCT {
        string id PK
        string name
        string sku UK
        string description
        string categoryId FK
        Unit baseUnit
        Decimal basePrice
        Decimal inventoryQuantity
        Decimal density
        string imageUrl
    }
    INVENTORY_LOG {
        string id PK
        string productId FK
        Decimal changeQuantity
        InventoryTransactionType type
        string referenceId
        string notes
        datetime createdAt
    }
    ORDER {
        string id PK
        string userId FK
        OrderStatus status
        Decimal totalAmount
        datetime createdAt
    }
    ORDER_ITEM {
        string id PK
        string orderId FK
        string productId FK
        Decimal orderedQuantity
        Unit orderedUnit
        Decimal calculatedQuantityInBase
        Decimal pricePerUnit
        Decimal subtotal
    }
    QUOTATION {
        string id PK
        string userId FK
        QuotationStatus status
        Decimal totalAmount
        datetime createdAt
    }
    QUOTATION_ITEM {
        string id PK
        string quotationId FK
        string productId FK
        Decimal quantity
        Unit unit
        Decimal calculatedQuantityInBase
        Decimal pricePerUnit
        Decimal subtotal
    }

    USER ||--o{ ORDER : "places"
    USER ||--o{ QUOTATION : "requests"
    CATEGORY ||--o{ PRODUCT : "contains"
    PRODUCT ||--o{ INVENTORY_LOG : "records"
    PRODUCT ||--o{ ORDER_ITEM : "belongs_to"
    PRODUCT ||--o{ QUOTATION_ITEM : "belongs_to"
    ORDER ||--|{ ORDER_ITEM : "comprises"
    QUOTATION ||--|{ QUOTATION_ITEM : "comprises"
```

### Table Index Strategy
- `User`: Index on `email` to accelerate authentication lookups.
- `Product`: Index on `sku` (unique search key) and `categoryId` (fast catalog queries).
- `InventoryLog`: Index on `productId` and `createdAt` to pull transaction ledgers sequentially.
- `Order`: Index on `userId` and `status` to filter history lists quickly.
- `Quotation`: Index on `userId` and `status` to filter pending lists quickly.

---

## 5. Unit Conversion Strategy

We enforce a strict unit conversion policy to ensure consistent internal metrics.

- **Internal Storage Base Units**:
  - **Weight**: Stored internally in **grams** (g). Compatible options: `kg` (kilograms), `g` (grams).
  - **Volume**: Stored internally in **milliliters** (mL). Compatible options: `L` (liters), `mL` (milliliters).
  - **Count**: Stored internally in **items**. Compatible options: `items`.

### Calculations & Formulas:
1.  **Conversion to Base**:
    $$\text{Quantity in Base} = \text{Ordered Quantity} \times \text{Unit Factor}$$
    *(E.g. $1.5\text{ kg} \times 1000 = 1500\text{ grams}$)*
2.  **Conversion from Base**:
    $$\text{Display Quantity} = \frac{\text{Quantity in Base}}{\text{Unit Factor}}$$
    *(E.g. $\frac{1500\text{ grams}}{1000} = 1.5\text{ kg}$)*
3.  **Pricing Calculation**:
    $$\text{Subtotal} = \left( \text{Ordered Quantity} \times \frac{\text{Ordered Unit Factor}}{\text{Product Base Unit Factor}} \right) \times \text{Product Base Price}$$
    *(E.g., Product Rice baseUnit is `kg`, basePrice is `₹60`. Ordered: `500 g`. Subtotal: $(500 \times \frac{1}{1000}) \times 60 = 0.5 \times 60 = ₹30$.)*

---

## 6. Price Storage Strategy

To eliminate standard JavaScript floating-point errors (e.g. `0.1 + 0.2 = 0.30000000000000004`):
1.  **Database Precision**: Prices and quantities are stored as `Decimal` types mapping to PostgreSQL `NUMERIC(20,6)`.
2.  **Server Scaling**: Quantities are calculated via decimal metrics on the server, rounding results to $6$ decimal places.
3.  **Display Formatting**: Currency is formatted to standard Indian Rupee (INR) format:
    - `formatINR(amount: 1234567.89)` $\rightarrow$ `₹12,34,567.89`

---

## 7. Installation Guide & Local Setup

### Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
DATABASE_URL="postgresql://neondb_owner:password@ep-cool-butterfly-a5.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:password@ep-cool-butterfly-a5.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="your_nextauth_secret_key"
NEXTAUTH_URL="http://localhost:3000"
```

### Neon Database Setup
1. Create a serverless PostgreSQL instance on [Neon](https://neon.tech/).
2. Grab the connection string for your database credentials.
3. Apply schema migrations and seed initial data:
   ```bash
   # Apply migrations to database
   npx prisma db push

   # Seed the database with mock chemicals and images
   npx prisma db seed
   ```

### Running Locally
```bash
# Install dependencies
npm install --legacy-peer-deps

# Run the Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the system.

---

## 8. Vercel Deployment

1. Push your code repository to GitHub.
2. Link your repository inside [Vercel](https://vercel.com).
3. Set your production environment variables (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
4. Set the **Build Command** to `npm run build` and **Output Directory** to `.next`.
5. Trigger deployment. Database updates will automatically run using Prisma client generation.

---

## 9. Test Credentials

The database seed script sets up the following credentials:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@inventory.com` | `Admin@123` | Control Panel, CRUD, verify orders & quotes |
| **Seller** | `seller@inventory.com` | `Seller@123` | Product catalog view, modify quantities, approve/reject POs |
| **Buyer** | `buyer@inventory.com` | `Buyer@123` | Browse catalog, place orders, draft quotations |

---

## 10. API Documentation

### Authentication
- **POST** `/api/auth/register` - Registers a new user.
- **POST** `/api/auth/signin` - (Handled via NextAuth).

### Products
- **GET** `/api/products` - List products with optional search query params.
- **POST** `/api/products` - Create new product (Admin Only).
- **PUT** `/api/products/[id]` - Update product details (Admin Only).
- **DELETE** `/api/products/[id]` - Remove product (Admin Only).

### Inventory Logs
- **GET** `/api/inventory` - Get all stock shifts (Admin Only).
- **POST** `/api/inventory` - Post manual stock adjustment (Admin Only).

### Purchase Orders
- **GET** `/api/orders` - View order list (Admins and Sellers see all, Buyers see their own).
- **POST** `/api/orders` - Place new purchase order (Deducts stock automatically).
- **PATCH** `/api/orders/[id]` - Update order status (Admin and Seller).
- **PUT** `/api/orders/[id]` - Modify order items and recalculate totals transactionally (Admin and Seller).

### Quotations
- **GET** `/api/quotations` - View quotations list.
- **POST** `/api/quotations` - Request custom quote price.
- **PATCH** `/api/quotations/[id]` - Approve/Reject quote (Admin Only).

---

## 11. Screenshots Section

- **Attractive Split Sign-In Screen**: Displayed with glowing chemical research banner, brand headers, and glassmorphic card forms.
- **Product Details & Calculator**: Chemical preview side-by-side with live conversion calculations, low stock warnings, and spelled-out pricing.
- **Seller Order Management Grid**: Full tabular overview showing order updates, status badges, inline edit modal, and total amounts spelled out in Rupee text.

---

## 12. Future Improvements

1. **Automated Quotation Negotiations**: Enable buyers and sellers to negotiate custom prices directly within the thread.
2. **Barcode Scanner Integration**: Allow warehouse managers to scan physical chemical barrels using device cameras to update stock.
3. **Advanced Analytics Dashboard**: Track monthly revenue trends, inventory turnover speeds, and most-demanded chemicals via visual charts.
