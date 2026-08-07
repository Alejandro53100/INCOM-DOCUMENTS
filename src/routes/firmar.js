const express = require('express');
const { pool } = require('../db/pool');
const { estamparFirma } = require('../services/pdfFill');
const { notificarDocumentoFirmado } = require('../services/mailer');
const { asyncRoute } = require('../middleware/asyncRoute');

const router = express.Router();

async function buscarDocumentoPorToken(token) {
  const { rows } = await pool.query(
    `SELECT d.*, p.nombre AS plantilla_nombre, p.zonas_firma, a.nombre AS alumno_nombre,
            a.apellido_paterno, a.apellido_materno, a.email AS alumno_email, a.id AS alumno_id
     FROM documentos d
     JOIN plantillas p ON p.id = d.plantilla_id
     JOIN alumnos a ON a.id = d.alumno_id
     WHERE d.token_firma = $1`,
    [token]
  );
  return rows[0];
}

router.get('/:token', asyncRoute(async (req, res) => {
  const documento = await buscarDocumentoPorToken(req.params.token);
  if (!documento) return res.status(404).render('firmar-invalido', { ocultarNav: true });

  res.render('firmar', {
    ocultarNav: true,
    documento,
    yaFirmado: documento.estatus === 'firmado',
  });
}));

router.get('/:token/pdf', asyncRoute(async (req, res) => {
  const documento = await buscarDocumentoPorToken(req.params.token);
  if (!documento) return res.status(404).send('Enlace inválido');

  const bytes = documento.estatus === 'firmado' ? documento.pdf_firmado : documento.pdf_generado;
  if (!bytes) return res.status(404).send('El documento todavía no está disponible');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');
  res.send(bytes);
}));

router.post('/:token', asyncRoute(async (req, res) => {
  const documento = await buscarDocumentoPorToken(req.params.token);
  if (!documento) return res.status(404).json({ error: 'Enlace inválido' });
  if (documento.estatus === 'firmado') return res.status(409).json({ error: 'Este documento ya fue firmado' });

  const { firmaPngBase64 } = req.body;
  if (!firmaPngBase64 || !/^data:image\/png;base64,/.test(firmaPngBase64)) {
    return res.status(400).json({ error: 'Firma inválida' });
  }
  if (!documento.zonas_firma || documento.zonas_firma.length === 0) {
    return res.status(500).json({ error: 'Esta plantilla todavía no tiene calibrada la zona de firma. Contacta al instituto.' });
  }

  const pdfFirmado = await estamparFirma(documento.pdf_generado, documento.zonas_firma, firmaPngBase64);

  await pool.query(
    "UPDATE documentos SET pdf_firmado = $1, estatus = 'firmado', firmado_en = now(), firmado_ip = $2 WHERE id = $3",
    [Buffer.from(pdfFirmado), req.ip, documento.id]
  );

  notificarDocumentoFirmado({
    alumno: { nombre: documento.alumno_nombre, apellido_paterno: documento.apellido_paterno, email: documento.alumno_email },
    nombreDocumento: documento.plantilla_nombre,
    enlaceAdmin: `${process.env.BASE_URL}/alumnos/${documento.alumno_id}`,
  }).catch((err) => console.error('No se pudo enviar la notificación de firma:', err));

  res.json({ ok: true });
}));

module.exports = router;
