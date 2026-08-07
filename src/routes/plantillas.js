const express = require('express');
const { pool } = require('../db/pool');
const { camposCalibrables } = require('../services/campos');
const { asyncRoute } = require('../middleware/asyncRoute');

const router = express.Router();

router.get('/', asyncRoute(async (req, res) => {
  const { rows: plantillas } = await pool.query('SELECT * FROM plantillas ORDER BY id');
  res.render('plantillas-lista', { plantillas });
}));

router.get('/:id/calibrar', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM plantillas WHERE id = $1', [req.params.id]);
  const plantilla = rows[0];
  if (!plantilla) return res.status(404).send('Plantilla no encontrada');
  res.render('plantilla-calibrar', { plantilla, CAMPOS: camposCalibrables() });
}));

router.post('/:id/mapa', express.json(), asyncRoute(async (req, res) => {
  const { mapa_campos, zonas_firma } = req.body;
  await pool.query('UPDATE plantillas SET mapa_campos = $1, zonas_firma = $2 WHERE id = $3', [
    JSON.stringify(mapa_campos || []),
    JSON.stringify(zonas_firma || []),
    req.params.id,
  ]);
  res.json({ ok: true });
}));

module.exports = router;
