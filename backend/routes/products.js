const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

// GET /api/products
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { low_stock, category, search } = req.query;

    let query = 'SELECT * FROM products WHERE user_id = ?';
    const params = [user_id];

    if (low_stock === 'true') query += ' AND stock_qty <= min_stock_alert';
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/low-stock
router.get('/low-stock', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    res.json(db.prepare(
      'SELECT * FROM products WHERE user_id = ? AND stock_qty <= min_stock_alert ORDER BY stock_qty ASC'
    ).all(user_id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/categories
router.get('/categories', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const cats = db.prepare(
      'SELECT DISTINCT category FROM products WHERE user_id = ? AND category IS NOT NULL ORDER BY category'
    ).all(user_id);
    res.json(cats.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { name, sku, category, unit, cost_price, selling_price, stock_qty, min_stock_alert } = req.body;

    if (!name) return res.status(400).json({ error: 'Product name is required' });
    if (cost_price == null || selling_price == null) {
      return res.status(400).json({ error: 'Cost price and selling price are required' });
    }

    const result = db.prepare(`
      INSERT INTO products (user_id, name, sku, category, unit, cost_price, selling_price, stock_qty, min_stock_alert)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, name, sku || null, category || null, unit || 'pcs',
           cost_price, selling_price, stock_qty || 0, min_stock_alert || 5);

    res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const { name, sku, category, unit, cost_price, selling_price, stock_qty, min_stock_alert } = req.body;
    db.prepare(`
      UPDATE products SET name=?, sku=?, category=?, unit=?, cost_price=?, selling_price=?, stock_qty=?, min_stock_alert=?
      WHERE id = ? AND user_id = ?
    `).run(
      name ?? existing.name, sku ?? existing.sku, category ?? existing.category, unit ?? existing.unit,
      cost_price ?? existing.cost_price, selling_price ?? existing.selling_price,
      stock_qty ?? existing.stock_qty, min_stock_alert ?? existing.min_stock_alert,
      req.params.id, user_id
    );

    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, user_id);
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
