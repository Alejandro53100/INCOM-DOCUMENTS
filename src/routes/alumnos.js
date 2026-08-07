const express = require('express');
const multer = require('multer');
const { pool } = require('../db/pool');
const { leerExcel } = require('../services/excelImport');
const { generarPlantillaExcel } = require('../services/excelTemplate');
const { CAMPOS, CAMPOS_BOOLEANOS, columnasDependientes, clavesTexto } = require('../services/campos');
const { asyncRoute } = require('../middleware/asyncRoute');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const esXlsx = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.originalname.toLowerCase().endsWith('.xlsx');
    cb(esXlsx ? null : new Error('El archivo debe ser un .xlsx'), esXlsx);
  },
});
const router = express.Router();

function valoresParaGuardar(datos) {
  const columnasTexto = clavesTexto().filter((c) => c !== 'email');
  const columnasBool = CAMPOS_BOOLEANOS.map((b) => b.clave);
  const campos = ['email', ...columnasTexto, ...columnasBool, 'dependientes'];
  const valores = campos.map((c) => {
    if (c === 'dependientes') return JSON.stringify(datos.dependientes || []);
    if (columnasBool.includes(c)) return !!datos[c];
    return datos[c] || null;
  });
  return { campos, valores };
}

// Usado por la importacion de Excel y el alta manual: empareja por correo para no duplicar
// al alumno si se vuelve a importar el mismo archivo.
async function upsertAlumnoPorEmail(datos) {
  const { campos, valores } = valoresParaGuardar(datos);
  const { rows: existentes } = await pool.query('SELECT id FROM alumnos WHERE email = $1', [datos.email]);

  if (existentes[0]) {
    const asignaciones = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
    await pool.query(
      `UPDATE alumnos SET ${asignaciones}, actualizado_en = now() WHERE id = $${campos.length + 1}`,
      [...valores, existentes[0].id]
    );
    return { id: existentes[0].id, creado: false };
  }

  const marcadores = campos.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO alumnos (${campos.join(', ')}) VALUES (${marcadores}) RETURNING id`,
    valores
  );
  return { id: rows[0].id, creado: true };
}

// Usado al editar la ficha de un alumno ya existente: siempre actualiza por id,
// para permitir incluso corregir el correo sin arriesgarse a duplicar el registro.
async function actualizarAlumnoPorId(id, datos) {
  const { campos, valores } = valoresParaGuardar(datos);
  const asignaciones = campos.map((c, i) => `${c} = $${i + 1}`).join(', ');
  await pool.query(
    `UPDATE alumnos SET ${asignaciones}, actualizado_en = now() WHERE id = $${campos.length + 1}`,
    [...valores, id]
  );
}

router.get('/', asyncRoute(async (req, res) => {
  const busqueda = (req.query.q || '').trim();
  let sql = `SELECT a.*,
      (SELECT count(*) FROM documentos d WHERE d.alumno_id = a.id AND d.estatus = 'firmado') AS firmados,
      (SELECT count(*) FROM documentos d WHERE d.alumno_id = a.id) AS total_documentos
    FROM alumnos a`;
  const params = [];
  if (busqueda) {
    params.push(`%${busqueda}%`);
    sql += ` WHERE a.nombre ILIKE $1 OR a.apellido_paterno ILIKE $1 OR a.apellido_materno ILIKE $1 OR a.email ILIKE $1 OR a.matricula ILIKE $1`;
  }
  sql += ' ORDER BY a.creado_en DESC LIMIT 200';
  const { rows: alumnos } = await pool.query(sql, params);
  res.render('alumnos-lista', { alumnos, busqueda });
}));

router.get('/alumnos/plantilla-excel', asyncRoute(async (req, res) => {
  const buffer = await generarPlantillaExcel();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-alumnos-incom.xlsx"');
  res.send(Buffer.from(buffer));
}));

router.get('/alumnos/importar', (req, res) => {
  res.render('alumnos-importar', { resultado: null, error: null });
});

router.post('/alumnos/importar', upload.single('excel'), asyncRoute(async (req, res) => {
  if (!req.file) return res.render('alumnos-importar', { resultado: null, error: 'Selecciona un archivo .xlsx' });

  try {
    const { alumnos, errores } = await leerExcel(req.file.buffer);
    let creados = 0;
    let actualizados = 0;
    for (const datos of alumnos) {
      const r = await upsertAlumnoPorEmail(datos);
      if (r.creado) creados++; else actualizados++;
    }
    res.render('alumnos-importar', { resultado: { creados, actualizados, total: alumnos.length, errores }, error: null });
  } catch (err) {
    console.error(err);
    res.render('alumnos-importar', { resultado: null, error: 'No se pudo leer el archivo. Verifica que sea un .xlsx válido generado con la plantilla.' });
  }
}));

router.get('/alumnos/nuevo', (req, res) => {
  res.render('alumno-ficha', { alumno: null, documentos: [], plantillas: [], CAMPOS, CAMPOS_BOOLEANOS, columnasDependientes: columnasDependientes(), guardado: false });
});

router.post('/alumnos/nuevo', asyncRoute(async (req, res) => {
  const datos = extraerDatosFormulario(req.body);
  const r = await upsertAlumnoPorEmail(datos);
  res.redirect(`/alumnos/${r.id}`);
}));

router.get('/alumnos/:id', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM alumnos WHERE id = $1', [req.params.id]);
  const alumno = rows[0];
  if (!alumno) return res.status(404).send('Alumno no encontrado');

  const { rows: documentos } = await pool.query(
    `SELECT d.*, p.nombre AS plantilla_nombre, p.clave AS plantilla_clave
     FROM documentos d JOIN plantillas p ON p.id = d.plantilla_id
     WHERE d.alumno_id = $1 ORDER BY p.id`,
    [alumno.id]
  );
  const { rows: plantillas } = await pool.query('SELECT id, clave, nombre FROM plantillas ORDER BY id');

  res.render('alumno-ficha', {
    alumno,
    documentos,
    plantillas,
    CAMPOS,
    CAMPOS_BOOLEANOS,
    columnasDependientes: columnasDependientes(),
    guardado: req.query.guardado === '1',
    avisoEnviado: req.query.enviado === '1',
    avisoOmitidos: req.query.omitidos ? Number(req.query.omitidos) : 0,
    avisoSinCorreo: req.query.error === 'sin_correo',
  });
}));

router.post('/alumnos/:id', asyncRoute(async (req, res) => {
  const datos = extraerDatosFormulario(req.body);
  await actualizarAlumnoPorId(req.params.id, datos);
  res.redirect(`/alumnos/${req.params.id}?guardado=1`);
}));

function extraerDatosFormulario(body) {
  const datos = { email: (body.email || '').trim() };
  for (const c of clavesTexto()) if (c !== 'email') datos[c] = (body[c] || '').trim();
  for (const b of CAMPOS_BOOLEANOS) datos[b.clave] = body[b.clave] === 'on';

  const dependientes = [];
  for (let i = 1; i <= 4; i++) {
    const nombre = (body[`dependiente${i}_nombre`] || '').trim();
    if (nombre) {
      dependientes.push({
        nombre,
        edad: (body[`dependiente${i}_edad`] || '').trim(),
        escolaridad: (body[`dependiente${i}_escolaridad`] || '').trim(),
      });
    }
  }
  datos.dependientes = dependientes;
  return datos;
}

module.exports = router;
