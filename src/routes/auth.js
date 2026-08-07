const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db/pool');
const { asyncRoute } = require('../middleware/asyncRoute');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
  const admin = rows[0];

  if (!admin || !(await bcrypt.compare(password || '', admin.password_hash))) {
    return res.status(401).render('login', { error: 'Correo o contraseña incorrectos.' });
  }

  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  res.redirect('/');
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
