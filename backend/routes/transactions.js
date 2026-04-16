const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

// GET /api/transactions
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { type, from, to, customer_id, supplier_id, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT t.*, c.name as customer_name, s.name as supplier_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      WHERE t.user_id = ?
    `;
    const params = [user_id];

    if (type) { query += ' AND t.type = ?'; params.push(type); }
    if (from) { query += ' AND t.date >= ?'; params.push(from); }
    if (to) { query += ' AND t.date <= ?'; params.push(to); }
    if (customer_id) { query += ' AND t.customer_id = ?'; params.push(customer_id); }
    if (supplier_id) { query += ' AND t.supplier_id = ?'; params.push(supplier_id); }

    query += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/transactions/:id (with items)
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const transaction = db.prepare(`
      SELECT t.*, c.name as customer_name, c.phone as customer_phone,
             s.name as supplier_name, s.phone as supplier_phone
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      WHERE t.id = ? AND t.user_id = ?
    `).get(req.params.id, user_id);

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    const items = db.prepare(`
      SELECT ti.*, p.name as product_name, p.unit, p.sku
      FROM transaction_items ti
      JOIN products p ON ti.product_id = p.id
      WHERE ti.transaction_id = ?
    `).all(req.params.id);

    res.json({ ...transaction, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const {
      type, date, customer_id, supplier_id,
      items, discount = 0, paid = 0, payment_method = 'cash', notes
    } = req.body;

    if (!type || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'type, date, and items are required' });
    }

    const createTransaction = db.transaction(() => {
      let subtotal = 0;
      const enrichedItems = [];

      for (const item of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(item.product_id, user_id);
        if (!product) throw new Error(`Product ${item.product_id} not found`);

        const price = item.price ?? (type === 'purchase' ? product.cost_price : product.selling_price);
        const costPrice = type === 'purchase' ? price : product.cost_price;
        subtotal += item.qty * price;
        enrichedItems.push({ ...item, price, costPrice, product });
      }

      const total = subtotal - discount;
      const balance = total - paid;

      const txResult = db.prepare(`
        INSERT INTO transactions (user_id, type, date, customer_id, supplier_id, subtotal, discount, total, paid, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(user_id, type, date, customer_id || null, supplier_id || null, subtotal, discount, total, paid, payment_method, notes || null);

      const txId = txResult.lastInsertRowid;

      for (const item of enrichedItems) {
        db.prepare(`
          INSERT INTO transaction_items (transaction_id, product_id, qty, price, cost_price)
          VALUES (?, ?, ?, ?, ?)
        `).run(txId, item.product_id, item.qty, item.price, item.costPrice);

        const stockChange = (type === 'purchase' || type === 'return_sale') ? item.qty : -item.qty;
        db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ? AND user_id = ?')
          .run(stockChange, item.product_id, user_id);
      }

      if (balance > 0) {
        if (type === 'sale' && customer_id) {
          db.prepare('UPDATE customers SET credit_balance = credit_balance + ? WHERE id = ? AND user_id = ?')
            .run(balance, customer_id, user_id);
        } else if (type === 'purchase' && supplier_id) {
          db.prepare('UPDATE suppliers SET credit_balance = credit_balance + ? WHERE id = ? AND user_id = ?')
            .run(balance, supplier_id, user_id);
        }
      }

      return db.prepare(`
        SELECT t.*, c.name as customer_name, s.name as supplier_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN suppliers s ON t.supplier_id = s.id
        WHERE t.id = ?
      `).get(txId);
    });

    res.status(201).json(createTransaction());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    const deleteTransaction = db.transaction(() => {
      const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(req.params.id);

      for (const item of items) {
        const stockChange = (transaction.type === 'purchase' || transaction.type === 'return_sale') ? -item.qty : item.qty;
        db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ? AND user_id = ?')
          .run(stockChange, item.product_id, user_id);
      }

      const balance = transaction.total - transaction.paid;
      if (balance > 0) {
        if (transaction.type === 'sale' && transaction.customer_id) {
          db.prepare('UPDATE customers SET credit_balance = credit_balance - ? WHERE id = ? AND user_id = ?')
            .run(balance, transaction.customer_id, user_id);
        } else if (transaction.type === 'purchase' && transaction.supplier_id) {
          db.prepare('UPDATE suppliers SET credit_balance = credit_balance - ? WHERE id = ? AND user_id = ?')
            .run(balance, transaction.supplier_id, user_id);
        }
      }

      db.prepare('DELETE FROM transaction_items WHERE transaction_id = ?').run(req.params.id);
      db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, user_id);
    });

    deleteTransaction();
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
