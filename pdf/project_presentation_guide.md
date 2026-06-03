# AasaMedChem - Project Explanation & Presentation Guide

This guide is designed to help you explain the **AasaMedChem** platform to interviewers, clients, or evaluators. It breaks down the business problem, the technical solutions implemented, and provides a step-by-step script for conducting a live demonstration.

---

## 1. Executive Summary: What is AasaMedChem?

**AasaMedChem** is an enterprise-grade Chemical Inventory, Order, and Price Quotation management platform. It is custom-tailored for chemical distribution and laboratory logistics, where standard e-commerce features are insufficient due to:
- The need for decimal quantities (e.g., buying `0.75 kg` of a powder or `9.5 L` of an acid).
- The requirement for dynamic unit conversions (converting volumes to weight using chemical density, and vice versa).
- The necessity of high-precision calculations to prevent rounding errors on large financial transactions.

---

## 2. The Core Technical "Wow" Factors (What to Highlight)

If someone asks you what makes this project special, explain these **four engineering achievements**:

### 🌟 Achievement 1: High-Precision Decimal Calculations (Rounding-Error Prevention)
*   **The Problem**: In JavaScript/TypeScript, standard numbers are floats, leading to rounding errors (e.g., `0.1 + 0.2` becomes `0.30000000000000004`). In chemical billing, scaling these errors over tons of chemicals causes significant financial discrepancies.
*   **The Solution**: We configured database fields as `Decimal` mapping to `NUMERIC(20,6)` in the schema. In the codebase, all math is calculated using Prisma's high-precision decimal objects rather than float-point numbers, securing accuracy up to 6 decimal places.

### 🌟 Achievement 2: Chemical Density & Dynamic Unit Converter
*   **The Problem**: A chemical might be stored in the warehouse in kilograms (`kg`), but a buyer wants to order it in liters (`L`).
*   **The Solution**: We implemented a smart conversion system that handles:
    - **Solids (g / kg)**.
    - **Liquids (mL / L)**.
    - **Density-based conversions**: Utilizing the chemical's specific density (e.g., Ethanol density of `0.789 g/mL`) to convert ordered volumes into equivalent base storage weights dynamically.

### 🌟 Achievement 3: Dual Numeric & Spelled Rupee Words Translation (INR)
*   **The Problem**: In chemical purchase orders, typing errors (e.g., a seller approving a draft of ₹1,20,000 instead of ₹12,000) are highly costly.
*   **The Solution**: We wrote a custom translation algorithm that converts decimal currency totals into formal Indian Rupees spelled-out text (e.g., *Rupees Twelve Thousand and Fifty Paise Only*). This is displayed on the buyer checkout page, quotations, and seller order grids.

### 🌟 Achievement 4: Serverless-Compliant SQLite Writable Replication (Vercel Fix)
*   **The Problem**: Vercel's serverless function directory is read-only. Standard SQLite deployments crash because they cannot open the database file or fail during write operations (like new user register or checkout).
*   **The Solution**: We implemented a self-replicating database strategy:
    - On serverless cold starts, the application checks if the database exists in the writable `/tmp` directory.
    - If not, it copies the pre-seeded SQLite database file from the bundle to `/tmp/dev.db`.
    - It routes all operations to `/tmp/dev.db` using Next.js standalone file tracing, allowing reads, writes, and authentication to succeed on Vercel without setup.

---

## 3. Technology Stack Breakdown

Explain the tech stack as follows:
*   **Frontend**: React 19, Next.js 16 (App Router), Tailwind CSS.
*   **Backend**: Next.js Server Components, API Route Handlers.
*   **Database ORM**: Prisma ORM with `@prisma/adapter-better-sqlite3` (driver adapter).
*   **Security & Authentication**: NextAuth.js with JWT session strategy, protected by Next.js edge middleware.
*   **Aesthetic UI**: Modern dark-mode layout with responsive grids, animated inventory meters, glassmorphism, and hover transitions.

---

## 4. Database Architecture & Relationships

AasaMedChem uses a clean, relational structure:
*   **User**: Stores names, roles (`BUYER`, `SELLER`, `ADMIN`), and hashed passwords (secured via `bcryptjs`).
*   **Category**: Groupings of chemicals (e.g., solids, liquids, glassware).
*   **Product**: Holds item specs, SKU, unit pricing, density, and local asset image links.
*   **Order & OrderItem**: Records buyer checkouts, quantities, and status updates.
*   **Quotation & QuotationItem**: Tracks price quote drafts submitted by buyers.
*   **InventoryLog**: Traces all adjustments, sales, and returns for audit logs.

---

## 5. Live Presentation Walkthrough Script

Use this step-by-step script when presenting the website:

### Step 1: Show the Redesigned Login Screen
1. Open the `/login` route.
2. **Point out**: The responsive layout featuring the glowing chemical laboratory banner on the left and the glassmorphic sign-in card on the right.
3. Log in as a **Buyer** using `buyer@inventory.com` | `Buyer@123`.

### Step 2: Showcase the Catalog & Decimal Calculator
1. Go to the Catalog page. Point out the interactive visual cards and hover zoom transitions.
2. Click on **Sulphur Powder**.
3. **Showcase the Calculator**: 
   - Change the ordered unit from `kg` to `g`.
   - Enter a decimal quantity (e.g., `9.7` g).
   - Point out that the calculated price updates instantly and shows both the decimal format (e.g., `₹1.46`) and the spelled Rupee words below it (*Rupees One and Forty-Six Paise Only*).
4. Add the items to the Cart and submit the order.

### Step 3: Demonstrate Seller Management & Approvals
1. Log out, and log in as a **Seller** using `seller@inventory.com` | `Seller@123`.
2. Access the **Manage Orders** dashboard.
3. Show the order list. Click on the order you just placed as the Buyer.
4. **Demonstrate inline edit/approve**:
   - As a Seller, edit the item quantity (e.g., increase it) and show how the total price recalculates dynamically in both decimals and words.
   - Click **Approve**. Point out that the inventory level is transactionally updated and logged.

### Step 4: Show the Admin Control Panel
1. Log out, and log in as an **Admin** using `admin@inventory.com` | `Admin@123`.
2. Go to the **Inventory Audit Log** or **Users Management** dashboard to show overall administrative visibility.
