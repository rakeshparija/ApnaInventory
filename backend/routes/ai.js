const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../db/schema');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY not configured. Please add it to backend/.env file.' });
    }

    const db = getDb();
    const { id: user_id } = req.user;
    const today = new Date().toISOString().split('T')[0];

    // Gather business context scoped to this user
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM transactions WHERE user_id=? AND type='sale' AND date=?
    `).get(user_id, today);

    const todayProfit = db.prepare(`
      SELECT COALESCE(SUM(ti.qty * (ti.price - ti.cost_price)), 0) as profit
      FROM transaction_items ti JOIN transactions t ON ti.transaction_id=t.id
      WHERE t.user_id=? AND t.type='sale' AND t.date=?
    `).get(user_id, today);

    const todayExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=? AND date=?
    `).get(user_id, today);

    const lowStock = db.prepare(`
      SELECT name, stock_qty, min_stock_alert, unit FROM products
      WHERE user_id=? AND stock_qty <= min_stock_alert ORDER BY stock_qty ASC LIMIT 10
    `).all(user_id);

    const topProducts = db.prepare(`
      SELECT p.name, SUM(ti.qty * ti.price) as revenue,
             SUM(ti.qty * (ti.price - ti.cost_price)) as profit,
             (SUM(ti.qty * (ti.price - ti.cost_price)) / SUM(ti.qty * ti.price) * 100) as margin
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id=t.id
      JOIN products p ON ti.product_id=p.id
      WHERE t.user_id=? AND t.type='sale'
      GROUP BY p.id ORDER BY revenue DESC LIMIT 5
    `).all(user_id);

    const pendingUdhaar = db.prepare(`
      SELECT name, credit_balance FROM customers WHERE user_id=? AND credit_balance > 0 ORDER BY credit_balance DESC
    `).all(user_id);

    const stockValue = db.prepare(`
      SELECT SUM(stock_qty * cost_price) as cost_value,
             SUM(stock_qty * selling_price) as selling_value
      FROM products WHERE user_id=?
    `).get(user_id);

    const currentMonth = today.substring(0, 7);
    const monthlySales = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM transactions WHERE user_id=? AND type='sale' AND strftime('%Y-%m', date)=?
    `).get(user_id, currentMonth);

    const monthlyProfit = db.prepare(`
      SELECT COALESCE(SUM(ti.qty * (ti.price - ti.cost_price)), 0) as profit
      FROM transaction_items ti JOIN transactions t ON ti.transaction_id=t.id
      WHERE t.user_id=? AND t.type='sale' AND strftime('%Y-%m', t.date)=?
    `).get(user_id, currentMonth);

    const monthlyExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id=? AND strftime('%Y-%m', date)=?
    `).get(user_id, currentMonth);

    const businessContext = `
BUSINESS CONTEXT (Live Data from ApnaInventory):
Date: ${today}

TODAY's SUMMARY:
- Sales: ₹${todaySales.total.toFixed(2)} (${todaySales.count} transactions)
- Gross Profit: ₹${todayProfit.profit.toFixed(2)}
- Expenses: ₹${todayExpenses.total.toFixed(2)}
- Net Profit: ₹${(todayProfit.profit - todayExpenses.total).toFixed(2)}

THIS MONTH (${currentMonth}):
- Sales: ₹${monthlySales.total.toFixed(2)} (${monthlySales.count} transactions)
- Gross Profit: ₹${monthlyProfit.profit.toFixed(2)}
- Expenses: ₹${monthlyExpenses.total.toFixed(2)}
- Net Profit: ₹${(monthlyProfit.profit - monthlyExpenses.total).toFixed(2)}

INVENTORY:
- Stock Cost Value: ₹${(stockValue.cost_value || 0).toFixed(2)}
- Stock Selling Value: ₹${(stockValue.selling_value || 0).toFixed(2)}

LOW STOCK ALERTS (${lowStock.length} items):
${lowStock.map(p => `- ${p.name}: ${p.stock_qty} ${p.unit} (min: ${p.min_stock_alert})`).join('\n') || 'None'}

TOP 5 PRODUCTS BY REVENUE:
${topProducts.map((p, i) => `${i + 1}. ${p.name}: ₹${p.revenue.toFixed(0)} revenue, ₹${p.profit.toFixed(0)} profit, ${p.margin.toFixed(1)}% margin`).join('\n') || 'No data'}

PENDING UDHAAR (Customer Credit):
${pendingUdhaar.map(c => `- ${c.name}: ₹${c.credit_balance}`).join('\n') || 'None'}

${context ? `\nADDITIONAL CONTEXT FROM APP:\n${JSON.stringify(context, null, 2)}` : ''}
`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are ApnaInventory Copilot, a retail business assistant for Indian small retailers. You have access to live business data from the user's retail shop management system.

Your personality:
- Friendly, helpful, and concise
- You understand Indian retail business context (kirana stores, FMCG, udhaar/credit system)
- You can respond in Hinglish (Hindi + English mix) naturally when appropriate
- Use ₹ symbol for all currency values
- Be practical and actionable in your suggestions
- Keep responses concise but complete

${businessContext}`,
      messages: [{ role: 'user', content: message }],
    });

    res.json({
      reply: response.content[0].text,
      usage: response.usage,
    });
  } catch (err) {
    console.error('AI chat error:', err);
    if (err.status === 401) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY is invalid. Please check your backend/.env file and add a valid key.' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
