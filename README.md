# ApnaInventory - Retail Copilot & Digital Ledger

A complete full-stack retail management application with AI-powered copilot built specifically for Indian small businesses — kirana stores, general stores, FMCG retailers, and neighbourhood shops.

---

## What Is ApnaInventory?

ApnaInventory is a digital shop management system that replaces the traditional **paper register (bahi-khata)** and manual stock tracking with a smart, real-time platform. It helps shop owners run their business more efficiently by bringing all operations — sales, purchases, stock, customer credit (udhaar), expenses, and reporting — into one place, with an AI assistant that understands Indian retail.

---

## What Can You Achieve With ApnaInventory?

### 1. Never Run Out of Stock
- Track every product with real-time quantity updates after every sale and purchase.
- Set minimum stock alert levels per product (e.g., alert when salt drops below 20 packets).
- Get notified immediately when any item is running low.
- **Outcome**: No lost sales due to stockouts. No over-purchasing due to guesswork.

### 2. Know Your Profit Every Day
- Every sale automatically calculates gross profit (selling price minus cost price).
- View today's profit, this month's profit, and net profit after expenses — all in real time.
- Identify your most and least profitable products instantly.
- **Outcome**: Shop owner knows exactly how much money is being made, not just how much is being collected.

### 3. Replace the Udhaar Register Digitally
- Track credit given to each customer (udhaar) with full history.
- Record partial payments and UPI settlements.
- See total pending udhaar at a glance, sorted by amount.
- **Outcome**: No more disputes, no forgotten debts, no awkward conversations — everything is recorded with dates and amounts.

### 4. Manage Supplier Dues & Purchases
- Record every purchase from suppliers with items, quantities, and prices.
- Track how much is owed to each supplier (credit balance).
- Log partial payments made to suppliers.
- Store GSTIN details for formal suppliers.
- **Outcome**: Clear picture of what you owe and to whom — no missed payments, no surprise demands from suppliers.

### 5. Track All Business Expenses
- Log daily expenses by category: Rent, Electricity, Salary, Transport, Other.
- See how expenses impact your net profit.
- **Outcome**: Understand where money is going outside of purchases and stock, and find areas to cut costs.

### 6. Business Reports That Actually Matter
- **Profit & Loss (P&L)**: Revenue, cost of goods, gross profit, expenses, and net profit.
- **Best Sellers**: Top products by revenue and profit margin.
- **Monthly Trends**: Sales and profit trends over time with visual charts.
- **Outcome**: Make data-driven decisions instead of gut-feel decisions for stocking, pricing, and promotions.

### 7. AI Copilot — Your 24/7 Business Advisor
- Ask questions in plain language or Hinglish: *"Aaj kitna profit hua?"*, *"Which items are low on stock?"*, *"Who owes me the most money?"*
- The AI has live access to your shop's data — it answers with real numbers, not generic advice.
- Get actionable suggestions: reorder alerts, margin improvement tips, udhaar recovery reminders.
- **Outcome**: Every shop owner gets the benefit of a business analyst — without hiring one.

### 8. Multi-Shop Authentication
- Each shop owner registers their own account with their name, shop name, and email.
- All data (products, customers, transactions, expenses) is completely isolated per shop.
- JWT-based login — secure, stateless, and works across devices.
- **Outcome**: Multiple shop owners can use the same platform with zero data overlap.

---

## Business Outcomes for Retailers & Shop Owners

### Financial Clarity
| Before ApnaInventory | After ApnaInventory |
|---|---|
| End-of-day cash count to guess profit | Real-time profit after every sale |
| Monthly guesswork on best-selling items | Ranked product report with margins |
| Unknown total udhaar across customers | Dashboard shows total pending credit instantly |
| Supplier dues tracked in a notebook | Digital ledger with payment history |

### Operational Efficiency
- **Save 1-2 hours daily** that were spent on manual entry in paper registers.
- **Reduce stock errors** — no more counting shelves; every sale/purchase updates stock automatically.
- **Faster billing** — product lookup by name/SKU, auto price fill, discount application.
- **Payment flexibility** — supports cash, UPI, and credit (udhaar) in one transaction.

### Business Growth Insights
- Know which products give you the **highest margin** so you can promote or stock more of them.
- Spot **seasonal demand trends** from monthly sales charts.
- Identify customers with **large outstanding dues** and follow up proactively.
- Compare monthly expenses to find months when profitability dipped and understand why.

---

## Who Is This For?

| Type of Shop | How ApnaInventory Helps |
|---|---|
| **Kirana / General Store** | Full inventory + udhaar management, fast billing, daily P&L |
| **FMCG Retailer** | Multi-category stock tracking, supplier purchase management, best-seller reports |
| **Stationery / Hardware Shop** | SKU-based product management, low stock alerts, customer ledger |
| **Medical / Pharmacy** (basic) | Product management, purchase tracking, expense logging |
| **Any Small Neighbourhood Shop** | Digital replacement for paper bahi-khata with AI insights |

---

## Real-World Example: A Day in the Life

**Morning**: Shopkeeper opens the Dashboard — sees yesterday's total sales (₹4,800), pending udhaar (₹2,400 from 3 customers), and 2 low stock alerts (Parle-G and Maggi running low).

**During the Day**: Records 15 sales — each sale updates stock automatically. Two customers pay on credit (udhaar recorded instantly). One customer pays back ₹500 of old udhaar via UPI (settlement logged).

**Evening**: Asks the AI Copilot — *"Aaj ka net profit kya tha?"* — gets the answer instantly with today's sales, cost, and expense breakdown. Checks the best-sellers report and decides to order more Aashirvaad Atta and Fortune Oil before tomorrow.

**End of Month**: Runs the P&L report to see if expenses (rent ₹15,000, salary ₹8,000, electricity ₹2,800) are in line with profit. Compares to last month. Plans pricing for next month.

---

## Features

- **Dashboard**: Real-time sales, profit, stock value, and udhaar (credit) tracking with date range filter (Today / Yesterday / Last 7 Days / This Month / Last Month / Custom)
- **Transactions**: Sales and purchase management with auto stock updates, discount support, and payment method tracking (cash / UPI / credit)
- **Inventory**: Product management with SKU, category, unit, cost price, selling price, and configurable low stock alerts
- **Customers**: Customer ledger with udhaar tracking, payment history, and contact details
- **Suppliers**: Supplier management, purchase ledger, GSTIN storage, and payment settlement tracking
- **Expenses**: Business expense tracking by category (Rent, Electricity, Salary, Transport, Other)
- **Reports**: P&L statement, best sellers by revenue and margin, monthly sales/profit trends
- **AI Copilot**: Chat with Claude AI for live business insights — supports Hinglish, answers with real shop data
- **Authentication**: Per-shop login and registration — each owner's data is fully isolated

---

## Tech Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3) + JWT (jsonwebtoken) + bcryptjs
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Recharts
- **AI**: Anthropic Claude API (claude-sonnet-4-6)

---

## Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Configure environment:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add:
#   ANTHROPIC_API_KEY=your_key_here
#   JWT_SECRET=your_long_random_secret
```

3. Start both servers:
```bash
npm start
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

---

## Demo Account

The app ships with a pre-loaded demo account for a Delhi-based kirana store with 30 days of realistic data.

| Field | Value |
|---|---|
| Email | parija00@gmail.com |
| Password | parija123 |

**What's included in the demo:**
- 15 products across Grocery, Dairy, Snacks, Beverages, Home Care, and Personal Care
- 5 customers with udhaar balances
- 3 suppliers with outstanding dues
- 30 days of sales, purchases, and expenses
- Payment settlement records

Log in with the demo account to explore the full app immediately without entering any data manually. To create your own shop, click **Create account** on the login screen.

---

## Project Structure

```
ApnaInventory/
├── backend/
│   ├── db/schema.js           # SQLite schema + seed data (with demo user)
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js            # Register, login, /me endpoints
│   │   ├── ai.js              # AI Copilot (Claude API integration)
│   │   ├── customers.js       # Customer & udhaar management
│   │   ├── expenses.js        # Expense tracking
│   │   ├── products.js        # Inventory management
│   │   ├── reports.js         # P&L, best sellers, monthly trends, dashboard
│   │   ├── suppliers.js       # Supplier & purchase ledger
│   │   └── transactions.js    # Sales & purchase transactions
│   └── server.js              # Express server
└── frontend/
    ├── src/
    │   ├── api/               # Axios client (with JWT interceptor)
    │   ├── components/        # Layout, StatCard, AICopilot
    │   ├── contexts/
    │   │   └── AuthContext.tsx # Auth state, login/register/logout
    │   └── pages/             # Dashboard, Inventory, Transactions, Login, Register, etc.
    └── index.html
```

---

## Going to Production

### Database

SQLite works well for a single server but is not suitable for cloud deployments or multiple instances. Replace it with:

| Option | Best For |
|---|---|
| **PostgreSQL** | Recommended — robust, free, widely hosted (Supabase, Neon, Railway) |
| **MySQL / PlanetScale** | Good alternative, familiar for many developers |
| **MongoDB** | Only if you want to move away from relational structure |

Steps to migrate:
1. Replace `better-sqlite3` with `pg` (node-postgres) or `mysql2`
2. Update all SQL queries (minor syntax differences)
3. Move connection string to environment variable (`DATABASE_URL`)
4. Run schema migration on first deploy

### Hosting the Backend

| Platform | Notes |
|---|---|
| **Railway** | Easiest — connect GitHub repo, auto-deploy, managed PostgreSQL included |
| **Render** | Free tier available, simple config |
| **AWS EC2 / DigitalOcean** | Full control, requires more setup (PM2, Nginx, SSL) |
| **Fly.io** | Good for containerised Node.js apps |

### Hosting the Frontend

1. Build the frontend:
```bash
cd frontend && npm run build
```
2. Deploy the `dist/` folder to **Vercel**, **Netlify**, or **Cloudflare Pages** (all have free tiers)
3. Or serve it directly from Express:
```js
app.use(express.static(path.join(__dirname, '../frontend/dist')));
```

### Environment Variables for Production

```env
ANTHROPIC_API_KEY=your_anthropic_key
JWT_SECRET=a-long-random-unguessable-string-min-32-chars
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Production Checklist

- [ ] Set a strong `JWT_SECRET` (never use the default dev value)
- [ ] Enable HTTPS — use **Let's Encrypt** via Certbot or your hosting provider's built-in SSL
- [ ] Set `CORS` origin to your actual domain (not `localhost:5173`)
- [ ] Set up automated daily **database backups**
- [ ] Add a process manager like **PM2** if self-hosting (`pm2 start server.js`)
- [ ] Set `NODE_ENV=production` to disable verbose error messages

---

## Mobile App — Next Steps

The current app is a responsive web app that works in mobile browsers. To build a native mobile app:

### Option 1 — Capacitor (Fastest, Recommended)
Wrap the existing Vite/React app into an Android/iOS app with minimal code changes.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap add ios
npm run build && npx cap sync
```

- Replace `localStorage` token storage with `@capacitor/preferences` (secure on-device storage)
- Add push notifications via `@capacitor/push-notifications` for low stock and udhaar reminders
- Use `@capacitor/camera` for barcode scanning on products

### Option 2 — React Native
Rebuild key screens in React Native for better native performance and full access to device APIs.

- Reuse the existing backend API as-is (no changes needed)
- Use `expo-secure-store` instead of `localStorage` for JWT storage
- Use `react-native-charts-wrapper` or `Victory Native` to replace Recharts
- Suitable if you want to publish on the App Store / Play Store with a polished native feel

### Option 3 — Progressive Web App (PWA)
Add a service worker and manifest to the existing frontend — works offline and can be installed on Android home screen without any app store.

```bash
# Add vite-plugin-pwa
npm install vite-plugin-pwa
```

- Lowest effort, no new codebase
- Works on Android well; iOS PWA support is limited

### Mobile Feature Roadmap
- Push notifications for low stock alerts and udhaar recovery reminders
- Barcode / QR code scanner for fast product lookup at billing
- Offline mode — queue transactions when no internet, sync when online
- Biometric login (fingerprint / face) using device auth APIs
