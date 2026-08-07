const express = require('express');
const { nanoid } = require('nanoid');
const { pool } = require('../db/pool');
const { generarPdfLlenado } = require('../services/pdfFill');
const { enviarCorreoFirma } = require('../services/mailer');
const { asyncRoute } = require('../middleware/asyncRoute');

const router = express.Router();

router.post('/generar', asyncRoute(async (req, res) => {
  const alumnoId = req.body.alumno_id;
  const plantillaIds = [].concat(req.body.plantilla_ids || []);
  if (plantillaIds.length === 0) return res.redirect(`/alumnos/${alumnoId}`);

  const { rows: alumnoRows } = await pool.query('SELECT * FROM alumnos WHERE id = $1', [alumnoId]);
  const alumno = alumnoRows[0];
  if (!alumno) return res.status(404).send('Alumno no encontrado');

  let omitidos = 0;
  for (const plantillaId of plantillaIds) {
    const { rows: plantillaRows } = await pool.query('SELECT * FROM plantillas WHERE id = $1', [plantillaId]);
    const plantilla = plantillaRows[0];
    if (!plantilla) continue;

    const { rows: existentes } = await pool.query(
      'SELECT id, estatus FROM documentos WHERE alumno_id = $1 AND plantilla_id = $2',
      [alumnoId, plantillaId]
    );

    if (existentes[0] && existentes[0].estatus === 'firmado') { omitidos++; continue; }

    const pdfBytes = await generarPdfLlenado(plantilla, alumno);

    if (existentes[0]) {
      await pool.query('UPDATE documentos SET pdf_generado = $1, estatus = $2 WHERE id = $3', [
        Buffer.from(pdfBytes), 'borrador', existentes[0].id,
      ]);
    } else {
      await pool.query(
        'INSERT INTO documentos (alumno_id, plantilla_id, estatus, pdf_generado) VALUES ($1, $2, $3, $4)',
        [alumnoId, plantillaId, 'borrador', Buffer.from(pdfBytes)]
      );
    }
  }

  res.redirect(`/alumnos/${alumnoId}${omitidos ? '?omitidos=' + omitidos : ''}`);
}));

router.get('/:id/pdf', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM documentos WHERE id = $1', [req.params.id]);
  const documento = rows[0];
  if (!documento) return res.status(404).send('Documento no encontrado');

  const bytes = req.query.version === 'firmado' ? documento.pdf_firmado : documento.pdf_generado;
  if (!bytes) return res.status(404).send('Ese PDF todavía no existe');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');
  res.send(bytes);
}));

router.post('/enviar', asyncRoute(async (req, res) => {
  const alumnoId = req.body.alumno_id;
  const documentoIds = [].concat(req.body.documento_ids || []);
  if (documentoIds.length === 0) return res.redirect(`/alumnos/${alumnoId}`);

  const { rows: alumnoRows } = await pool.query('SELECT * FROM alumnos WHERE id = $1', [alumnoId]);
  const alumno = alumnoRows[0];
  if (!alumno || !alumno.email) return res.redirect(`/alumnos/${alumnoId}?error=sin_correo`);

  let enviados = 0;
  let fallidos = 0;

  for (const documentoId of documentoIds) {
    const { rows } = await pool.query(
      `SELECT d.*, p.nombre AS plantilla_nombre FROM documentos d JOIN plantillas p ON p.id = d.plantilla_id WHERE d.id = $1 AND d.alumno_id = $2`,
      [documentoId, alumnoId]
    );
    const documento = rows[0];
    if (!documento || documento.estatus !== 'borrador') continue;

    const token = nanoid(32);
    try {
      // Se manda el correo antes de marcar el documento como enviado: si el correo falla,
      // el documento se queda en "borrador" para poder reintentarlo, en vez de quedar
      // marcado como enviado sin que el alumno haya recibido nada.
      await enviarCorreoFirma({
        alumno,
        nombreDocumento: documento.plantilla_nombre,
        enlace: `${process.env.BASE_URL}/firmar/${token}`,
      });
    } catch (err) {
      console.error(`No se pudo enviar el correo del documento ${documentoId}:`, err.message);
      fallidos++;
      continue;
    }

    await pool.query(
      "UPDATE documentos SET estatus = 'enviado', token_firma = $1, enviado_en = now() WHERE id = $2",
      [token, documentoId]
    );
    enviados++;
  }

  const params = new URLSearchParams();
  if (enviados) params.set('enviado', '1');
  if (fallidos) params.set('fallidos', String(fallidos));
  res.redirect(`/alumnos/${alumnoId}?${params.toString()}`);
}));

module.exports = router;
