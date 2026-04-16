const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

// GET /api/customers
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { search } = req.query;

    let query = 'SELECT * FROM customers WHERE user_id = ?';
    const params = [user_id];

    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id/ledger
router.get('/:id/ledger', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const transactions = db.prepare(`
      SELECT t.id, t.type, t.date, t.total, t.paid, (t.total - t.paid) as balance,
             t.payment_method, t.notes, 'transaction' as entry_type
      FROM transactions t
      WHERE t.customer_id = ? AND t.user_id = ?
      ORDER BY t.date DESC, t.id DESC
    `).all(req.params.id, user_id);

    const payments = db.prepare(`
      SELECT id, 'payment' as type, date, amount, method, notes, 'payment' as entry_type
      FROM payments
      WHERE entity_type = 'customer' AND entity_id = ?
      ORDER BY date DESC, id DESC
    `).all(req.params.id);

    const ledger = [...transactions, ...payments].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.id - a.id;
    });

    res.json({ customer, ledger });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });

    const result = db.prepare(`
      INSERT INTO customers (user_id, name, phone, email, address, credit_balance)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(user_id, name, phone || null, email || null, address || null);

    res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const { name, phone, email, address } = req.body;
    db.prepare('UPDATE customers SET name=?, phone=?, email=?, address=? WHERE id=? AND user_id=?').run(
      name ?? existing.name, phone ?? existing.phone,
      email ?? existing.email, address ?? existing.address,
      req.params.id, user_id
    );

    res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    db.prepare('DELETE FROM customers WHERE id = ? AND user_id = ?').run(req.params.id, user_id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers/:id/payment
router.post('/:id/payment', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { amount, date, method = 'cash', notes } = req.body;
    const customerId = req.params.id;

    if (!amount || !date) return res.status(400).json({ error: 'Amount and date are required' });

    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(customerId, user_id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const result = db.prepare(`
      INSERT INTO payments (entity_type, entity_id, amount, date, method, notes)
      VALUES ('customer', ?, ?, ?, ?, ?)
    `).run(customerId, amount, date, method, notes || null);

    db.prepare('UPDATE customers SET credit_balance = MAX(0, credit_balance - ?) WHERE id = ?')
      .run(amount, customerId);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Payment recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
