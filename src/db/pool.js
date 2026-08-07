const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
});

const PLANTILLAS_SEED = [
  { clave: 'inscripcion', nombre: 'Solicitud de Inscripcion', archivo_pdf: 'inscripcion.pdf' },
  { clave: 'reinscripcion_2do', nombre: 'Solicitud de 2do Reinscripcion', archivo_pdf: 'reinscripcion_2do.pdf' },
  { clave: 'reinscripcion_3ro', nombre: 'Solicitud de 3er Reinscripcion', archivo_pdf: 'reinscripcion_3ro.pdf' },
  { clave: 'reinscripcion_4to', nombre: 'Solicitud de 4to Reinscripcion', archivo_pdf: 'reinscripcion_4to.pdf' },
  { clave: 'beca_solicitud', nombre: 'Solicitud de Beca', archivo_pdf: 'beca_solicitud.pdf' },
  { clave: 'beca_dictamen', nombre: 'Dictamen de Beca (positivo)', archivo_pdf: 'beca_dictamen.pdf' },
  { clave: 'consentimiento_reglamento', nombre: 'Consentimiento de Reglamento', archivo_pdf: 'consentimiento_reglamento.pdf' },
];

async function ensureSchema() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schemaSql);

  for (const p of PLANTILLAS_SEED) {
    await pool.query(
      `INSERT INTO plantillas (clave, nombre, archivo_pdf)
       VALUES ($1, $2, $3)
       ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, archivo_pdf = EXCLUDED.archivo_pdf`,
      [p.clave, p.nombre, p.archivo_pdf]
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD_INICIAL;
  if (adminEmail && adminPassword) {
    const { rows } = await pool.query('SELECT id FROM admins WHERE email = $1', [adminEmail]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [adminEmail, hash]);
      console.log(`Admin inicial creado: ${adminEmail}`);
    }
  }
}

module.exports = { pool, ensureSchema };
