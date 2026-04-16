const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

// GET /api/expenses
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { from, to, category } = req.query;

    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params = [user_id];

    if (from) { query += ' AND date >= ?'; params.push(from); }
    if (to) { query += ' AND date <= ?'; params.push(to); }
    if (category) { query += ' AND category = ?'; params.push(category); }

    query += ' ORDER BY date DESC, id DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/summary
router.get('/summary', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { from, to } = req.query;

    let query = 'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ?';
    const params = [user_id];

    if (from) { query += ' AND date >= ?'; params.push(from); }
    if (to) { query += ' AND date <= ?'; params.push(to); }

    query += ' GROUP BY category ORDER BY total DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { date, category, amount, description } = req.body;

    if (!date || !category || !amount) {
      return res.status(400).json({ error: 'date, category, and amount are required' });
    }

    const result = db.prepare(`
      INSERT INTO expenses (user_id, date, category, amount, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(user_id, date, category, amount, description || null);

    res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    const { date, category, amount, description } = req.body;
    db.prepare('UPDATE expenses SET date=?, category=?, amount=?, description=? WHERE id=? AND user_id=?').run(
      date ?? existing.date, category ?? existing.category,
      amount ?? existing.amount, description ?? existing.description,
      req.params.id, user_id
    );

    res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, user_id);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });

    db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(req.params.id, user_id);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
