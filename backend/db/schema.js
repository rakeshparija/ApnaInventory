const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initializeSchema() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      shop_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      sku TEXT,
      category TEXT,
      unit TEXT DEFAULT 'pcs',
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock_qty REAL NOT NULL DEFAULT 0,
      min_stock_alert REAL DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, sku)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      credit_balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('sale','purchase','return_sale','return_purchase')),
      date TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      supplier_id INTEGER REFERENCES suppliers(id),
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      paid REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      qty REAL NOT NULL,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('customer','supplier')),
      entity_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return database;
}

function seedData() {
  const database = getDb();

  const userCount = database.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount.cnt > 0) return;

  console.log('Seeding database with demo data...');

  // Create demo user
  const passwordHash = bcrypt.hashSync('parija123', 10);
  const userResult = database.prepare(`
    INSERT INTO users (name, email, password_hash, shop_name)
    VALUES (?, ?, ?, ?)
  `).run('Demo Owner', 'parija00@gmail.com', passwordHash, 'Parija Kirana Store');
  const userId = userResult.lastInsertRowid;

  // Insert products
  const insertProduct = database.prepare(`
    INSERT INTO products (user_id, name, sku, category, unit, cost_price, selling_price, stock_qty, min_stock_alert)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['Tata Salt 1kg', 'TATA-SALT-1KG', 'Grocery', 'pkt', 18, 22, 120, 20],
    ['Amul Butter 500g', 'AMUL-BUT-500G', 'Dairy', 'pkt', 230, 270, 45, 10],
    ['Parle-G Biscuit 800g', 'PARLE-G-800G', 'Snacks', 'pkt', 78, 95, 80, 15],
    ['Aashirvaad Atta 5kg', 'AASH-ATTA-5KG', 'Grocery', 'bag', 195, 235, 60, 10],
    ['Fortune Sunflower Oil 1L', 'FORT-OIL-1L', 'Grocery', 'btl', 125, 148, 90, 15],
    ['Maggi Noodles 70g', 'MAGGI-70G', 'Snacks', 'pkt', 12, 15, 200, 30],
    ['Surf Excel 1kg', 'SURF-EXC-1KG', 'Home Care', 'pkt', 195, 235, 55, 10],
    ['Colgate Toothpaste 200g', 'COLG-TP-200G', 'Personal Care', 'tube', 78, 95, 70, 15],
    ['Lifebuoy Soap 100g', 'LIFE-SOAP-100G', 'Personal Care', 'pcs', 28, 35, 150, 25],
    ['Bru Coffee 100g', 'BRU-COFFEE-100G', 'Beverages', 'jar', 145, 175, 40, 8],
    ['Tata Tea Gold 250g', 'TATA-TEA-250G', 'Beverages', 'pkt', 110, 135, 65, 12],
    ['Dettol Soap 75g', 'DETT-SOAP-75G', 'Personal Care', 'pcs', 38, 48, 100, 20],
    ['Britannia Bread 400g', 'BRIT-BREAD-400G', 'Bakery', 'pkt', 38, 48, 35, 8],
    ['Haldirams Bhujia 400g', 'HALD-BHUJ-400G', 'Snacks', 'pkt', 95, 120, 50, 10],
    ['Kissan Jam 500g', 'KISS-JAM-500G', 'Grocery', 'jar', 88, 110, 30, 5],
  ];

  const insertedProducts = [];
  for (const p of products) {
    const result = insertProduct.run(userId, ...p);
    insertedProducts.push(result.lastInsertRowid);
  }

  // Insert customers
  const insertCustomer = database.prepare(`
    INSERT INTO customers (user_id, name, phone, email, address, credit_balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const customers = [
    ['Ramesh Sharma', '9876543210', 'ramesh@gmail.com', 'Gandhi Nagar, Delhi', 450],
    ['Priya Patel', '9988776655', 'priya.patel@yahoo.com', 'Lajpat Nagar, Delhi', 0],
    ['Mohammed Iqbal', '9123456789', null, 'Karol Bagh, Delhi', 1200],
    ['Sunita Devi', '9456789012', null, 'Dwarka Sector 12, Delhi', 750],
    ['Ankit Verma', '9654321098', 'ankit.v@outlook.com', 'Rohini, Delhi', 0],
  ];

  const insertedCustomers = [];
  for (const c of customers) {
    const result = insertCustomer.run(userId, ...c);
    insertedCustomers.push(result.lastInsertRowid);
  }

  // Insert suppliers
  const insertSupplier = database.prepare(`
    INSERT INTO suppliers (user_id, name, phone, email, gstin, credit_balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const suppliers = [
    ['Sharma Wholesale Traders', '9111222333', 'sharma.wholesale@gmail.com', '07AAAAA0000A1Z5', 5600],
    ['Delhi FMCG Distributors', '9222333444', 'delhi.fmcg@trade.in', '07BBBBB1111B2Z6', 12000],
    ['Kumar & Sons Suppliers', '9333444555', null, null, 3200],
  ];

  const insertedSuppliers = [];
  for (const s of suppliers) {
    const result = insertSupplier.run(userId, ...s);
    insertedSuppliers.push(result.lastInsertRowid);
  }

  // Generate 30 days of transactions
  const insertTransaction = database.prepare(`
    INSERT INTO transactions (user_id, type, date, customer_id, supplier_id, subtotal, discount, total, paid, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = database.prepare(`
    INSERT INTO transaction_items (transaction_id, product_id, qty, price, cost_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const updateStock = database.prepare(`
    UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?
  `);

  const today = new Date();
  const paymentMethods = ['cash', 'upi', 'credit'];

  for (let day = 29; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];

    if (day % 5 === 0) {
      const supplierId = insertedSuppliers[day % 3];
      const numItems = 3 + (day % 3);
      let subtotal = 0;
      const purchaseItems = [];

      for (let i = 0; i < numItems; i++) {
        const prodIdx = (day + i * 3) % insertedProducts.length;
        const prodId = insertedProducts[prodIdx];
        const product = database.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
        const qty = 20 + (i * 5);
        const price = product.cost_price;
        subtotal += qty * price;
        purchaseItems.push({ prodId, qty, price, costPrice: product.cost_price });
      }

      const total = subtotal;
      const paid = day % 2 === 0 ? total : total * 0.7;
      const result = insertTransaction.run(
        userId, 'purchase', dateStr, null, supplierId,
        subtotal, 0, total, paid, paid < total ? 'credit' : 'cash', null
      );

      for (const item of purchaseItems) {
        insertItem.run(result.lastInsertRowid, item.prodId, item.qty, item.price, item.costPrice);
        updateStock.run(item.qty, item.prodId);
      }
    }

    const numSales = 2 + (day % 3);
    for (let s = 0; s < numSales; s++) {
      const customerId = insertedCustomers[(day + s) % insertedCustomers.length];
      const numItems = 1 + (s % 3);
      let subtotal = 0;
      const saleItems = [];

      for (let i = 0; i < numItems; i++) {
        const prodIdx = (day + s + i * 2) % insertedProducts.length;
        const prodId = insertedProducts[prodIdx];
        const product = database.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
        const qty = 1 + (i % 4);
        const price = product.selling_price;
        subtotal += qty * price;
        saleItems.push({ prodId, qty, price, costPrice: product.cost_price });
      }

      const discount = s % 5 === 0 ? Math.round(subtotal * 0.05) : 0;
      const total = subtotal - discount;
      const method = paymentMethods[(day + s) % 3];
      const paid = method === 'credit' ? 0 : total;

      const result = insertTransaction.run(
        userId, 'sale', dateStr, customerId, null,
        subtotal, discount, total, paid, method, null
      );

      for (const item of saleItems) {
        insertItem.run(result.lastInsertRowid, item.prodId, item.qty, item.price, item.costPrice);
        updateStock.run(-item.qty, item.prodId);
      }
    }
  }

  // Insert expenses
  const insertExpense = database.prepare(`
    INSERT INTO expenses (user_id, date, category, amount, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const expenseData = [
    [30, 'Rent', 15000, 'Monthly shop rent'],
    [28, 'Electricity', 2800, 'Electricity bill'],
    [25, 'Salary', 8000, 'Staff salary - Raju'],
    [22, 'Transport', 1200, 'Goods transport charges'],
    [20, 'Other', 500, 'Shop cleaning supplies'],
    [15, 'Electricity', 350, 'Extra electricity charges'],
    [10, 'Transport', 800, 'Local transport'],
    [7, 'Other', 250, 'Stationery'],
    [5, 'Salary', 2000, 'Advance salary'],
    [3, 'Transport', 600, 'Delivery charges'],
  ];

  for (const [daysAgo, category, amount, description] of expenseData) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];
    insertExpense.run(userId, dateStr, category, amount, description);
  }

  // Insert payment settlements
  const insertPayment = database.prepare(`
    INSERT INTO payments (entity_type, entity_id, amount, date, method, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const paymentDate1 = new Date(today);
  paymentDate1.setDate(paymentDate1.getDate() - 10);
  insertPayment.run('customer', insertedCustomers[0], 300, paymentDate1.toISOString().split('T')[0], 'cash', 'Partial udhaar payment');

  const paymentDate2 = new Date(today);
  paymentDate2.setDate(paymentDate2.getDate() - 5);
  insertPayment.run('customer', insertedCustomers[2], 500, paymentDate2.toISOString().split('T')[0], 'upi', 'UPI payment received');

  const paymentDate3 = new Date(today);
  paymentDate3.setDate(paymentDate3.getDate() - 3);
  insertPayment.run('supplier', insertedSuppliers[0], 2000, paymentDate3.toISOString().split('T')[0], 'cash', 'Supplier payment');

  console.log('Seed data inserted. Demo login: parija00@gmail.com / parija123');
}

module.exports = { getDb, initializeSchema, seedData };
