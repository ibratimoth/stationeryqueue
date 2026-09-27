const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize } = require('./models');
const { authenticateAdmin } = require('./middleware/auth'); // Adjust path to your auth middleware
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Standard Express Setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configure EJS View Engine & Layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // Directs express to use views/layout.ejs as wrapper
if (process.env.NODE_ENV === 'development') {
  // Detailed output for local development: GET /api/admin/jobs 200 12.345 ms - 452
  app.use(morgan('dev'));
} else {
  // Compact Apache-style output for production
  app.use(morgan('combined'));
}

// Web View Routes
app.get('/', (req, res) => {
  res.render('kiosk', { title: 'Delle Ventures - Print Kiosk' });
});

// Public Auth Page Views
app.get('/login', (req, res) => {
  res.render('login', { title: 'Delle Ventures - Login' });
});

app.get('/register', (req, res) => {
  res.render('register', { title: 'Delle Ventures - Register' });
});

// Logout Handler
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Protected Admin Portal View
app.get('/admin', authenticateAdmin, (req, res) => {
  res.render('admin', { 
    title: 'Delle Ventures - Admin Portal',
    admin: req.admin 
  });
});

// API Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3003;

sequelize.sync({ alter: false }).then(() => {
  console.log('Database connected & models synchronized.');
  app.listen(PORT, () => console.log(`Delle Ventures Server listening on port ${PORT}`));
});