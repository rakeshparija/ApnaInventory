require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeSchema, seedData } = require('./db/schema');
const requireAuth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB
initializeSchema();
seedData();

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (JWT required)
app.use('/api/products', requireAuth, require('./routes/products'));
app.use('/api/transactions', requireAuth, require('./routes/transactions'));
app.use('/api/customers', requireAuth, require('./routes/customers'));
app.use('/api/suppliers', requireAuth, require('./routes/suppliers'));
app.use('/api/expenses', requireAuth, require('./routes/expenses'));
app.use('/api/reports', requireAuth, require('./routes/reports'));
app.use('/api/ai', requireAuth, require('./routes/ai'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ApnaInventory backend running on http://localhost:${PORT}`);
});
