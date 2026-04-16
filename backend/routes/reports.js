const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

// GET /api/reports/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const todayStr = new Date().toISOString().split('T')[0];

    const from = req.query.from || todayStr;
    const to = req.query.to || todayStr;

    const periodSales = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COALESCE(COUNT(*), 0) as count
      FROM transactions WHERE user_id=? AND type='sale' AND date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const periodPurchases = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COALESCE(COUNT(*), 0) as count
      FROM transactions WHERE user_id=? AND type='purchase' AND date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const periodProfit = db.prepare(`
      SELECT COALESCE(SUM(ti.qty * (ti.price - ti.cost_price)), 0) as profit
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id=t.id
      WHERE t.user_id=? AND t.type='sale' AND t.date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const periodExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=? AND date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const stockValue = db.prepare(`
      SELECT COALESCE(SUM(stock_qty * cost_price), 0) as cost_value,
             COALESCE(SUM(stock_qty * selling_price), 0) as selling_value
      FROM products WHERE user_id=?
    `).get(user_id);

    const pendingUdhaar = db.prepare(`
      SELECT COALESCE(SUM(credit_balance), 0) as total FROM customers WHERE user_id=?
    `).get(user_id);

    const supplierPayable = db.prepare(`
      SELECT COALESCE(SUM(credit_balance), 0) as total FROM suppliers WHERE user_id=?
    `).get(user_id);

    const lowStock = db.prepare(`
      SELECT * FROM products WHERE user_id=? AND stock_qty <= min_stock_alert ORDER BY stock_qty ASC LIMIT 5
    `).all(user_id);

    const recentTransactions = db.prepare(`
      SELECT t.*, c.name as customer_name, s.name as supplier_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id=c.id
      LEFT JOIN suppliers s ON t.supplier_id=s.id
      WHERE t.user_id=? AND t.date BETWEEN ? AND ?
      ORDER BY t.date DESC, t.id DESC LIMIT 10
    `).all(user_id, from, to);

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
    const chartDays = Math.min(diffDays, 31);

    const chartData = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const date = new Date(toDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySales = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total FROM transactions WHERE user_id=? AND type='sale' AND date=?
      `).get(user_id, dateStr);

      const dayProfit = db.prepare(`
        SELECT COALESCE(SUM(ti.qty * (ti.price - ti.cost_price)), 0) as profit
        FROM transaction_items ti JOIN transactions t ON ti.transaction_id=t.id
        WHERE t.user_id=? AND t.type='sale' AND t.date=?
      `).get(user_id, dateStr);

      const dayExpenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=? AND date=?
      `).get(user_id, dateStr);

      const labelOptions = chartDays <= 7
        ? { weekday: 'short', day: 'numeric' }
        : { day: 'numeric', month: 'short' };

      chartData.push({
        date: dateStr,
        label: new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', labelOptions),
        sales: daySales.total,
        profit: dayProfit.profit - dayExpenses.total,
        gross_profit: dayProfit.profit,
        expenses: dayExpenses.total,
      });
    }

    res.json({
      from, to,
      today: {
        sales: periodSales.total,
        sales_count: periodSales.count,
        purchases: periodPurchases.total,
        purchases_count: periodPurchases.count,
        gross_profit: periodProfit.profit,
        expenses: periodExpenses.total,
        net_profit: periodProfit.profit - periodExpenses.total,
      },
      stock: { cost_value: stockValue.cost_value, selling_value: stockValue.selling_value },
      pending_udhaar: pendingUdhaar.total,
      supplier_payable: supplierPayable.total,
      low_stock: lowStock,
      recent_transactions: recentTransactions,
      chart_data: chartData,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/profit-loss
router.get('/profit-loss', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { from, to } = req.query;

    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

    const revenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COALESCE(COUNT(*), 0) as count
      FROM transactions WHERE user_id=? AND type='sale' AND date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const cogs = db.prepare(`
      SELECT COALESCE(SUM(ti.qty * ti.cost_price), 0) as total
      FROM transaction_items ti JOIN transactions t ON ti.transaction_id=t.id
      WHERE t.user_id=? AND t.type='sale' AND t.date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const purchases = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COALESCE(COUNT(*), 0) as count
      FROM transactions WHERE user_id=? AND type='purchase' AND date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const expenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=? AND date BETWEEN ? AND ?
    `).get(user_id, from, to);

    const grossProfit = revenue.total - cogs.total;
    const netProfit = grossProfit - expenses.total;
    const grossMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;

    res.json({
      from, to,
      revenue: revenue.total, sales_count: revenue.count,
      cogs: cogs.total, gross_profit: grossProfit,
      gross_margin: grossMargin.toFixed(2),
      expenses: expenses.total, net_profit: netProfit,
      purchases: purchases.total, purchases_count: purchases.count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/best-sellers
router.get('/best-sellers', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const { from, to, limit = 10 } = req.query;

    let query = `
      SELECT p.id, p.name, p.sku, p.category, p.unit,
        SUM(ti.qty) as total_qty,
        SUM(ti.qty * ti.price) as total_revenue,
        SUM(ti.qty * (ti.price - ti.cost_price)) as total_profit,
        AVG(ti.price) as avg_price
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id=t.id
      JOIN products p ON ti.product_id=p.id
      WHERE t.user_id=? AND t.type='sale'
    `;
    const params = [user_id];

    if (from) { query += ' AND t.date >= ?'; params.push(from); }
    if (to) { query += ' AND t.date <= ?'; params.push(to); }

    query += ' GROUP BY p.id ORDER BY total_revenue DESC LIMIT ?';
    params.push(parseInt(limit));

    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/inventory-value
router.get('/inventory-value', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;

    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as product_count,
        SUM(stock_qty) as total_qty,
        SUM(stock_qty * cost_price) as cost_value,
        SUM(stock_qty * selling_price) as selling_value
      FROM products WHERE user_id=?
      GROUP BY category ORDER BY cost_value DESC
    `).all(user_id);

    const totals = db.prepare(`
      SELECT COUNT(*) as total_products, SUM(stock_qty) as total_qty,
        SUM(stock_qty * cost_price) as total_cost_value,
        SUM(stock_qty * selling_price) as total_selling_value
      FROM products WHERE user_id=?
    `).get(user_id);

    res.json({ by_category: byCategory, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/monthly-trend
router.get('/monthly-trend', (req, res) => {
  try {
    const db = getDb();
    const { id: user_id } = req.user;
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const monthStr = `${year}-${month}`;

      const sales = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total, COALESCE(COUNT(*), 0) as count
        FROM transactions WHERE user_id=? AND type='sale' AND strftime('%Y-%m', date)=?
      `).get(user_id, monthStr);

      const profit = db.prepare(`
        SELECT COALESCE(SUM(ti.qty * (ti.price - ti.cost_price)), 0) as total
        FROM transaction_items ti JOIN transactions t ON ti.transaction_id=t.id
        WHERE t.user_id=? AND t.type='sale' AND strftime('%Y-%m', t.date)=?
      `).get(user_id, monthStr);

      const expenses = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=? AND strftime('%Y-%m', date)=?
      `).get(user_id, monthStr);

      const purchases = db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total FROM transactions
        WHERE user_id=? AND type='purchase' AND strftime('%Y-%m', date)=?
      `).get(user_id, monthStr);

      months.push({
        month: monthStr,
        label: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        sales: sales.total, sales_count: sales.count,
        gross_profit: profit.total,
        net_profit: profit.total - expenses.total,
        expenses: expenses.total, purchases: purchases.total,
      });
    }

    res.json(months);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
