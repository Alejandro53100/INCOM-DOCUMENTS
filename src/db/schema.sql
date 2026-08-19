-- Esquema del sistema de generacion y firma de documentos de INCOM.
-- Se ejecuta automaticamente al arrancar el servidor (ver src/db/pool.js -> ensureSchema).

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alumnos (
  id SERIAL PRIMARY KEY,
  email TEXT,
  apellido_paterno TEXT,
  apellido_materno TEXT,
  nombre TEXT,
  telefono TEXT,
  edad TEXT,
  sexo TEXT,
  curp TEXT,
  lugar_nacimiento TEXT,
  fecha_nacimiento TEXT,
  nacionalidad TEXT,
  domicilio_calle TEXT,
  domicilio_numero TEXT,
  domicilio_colonia TEXT,
  domicilio_municipio TEXT,
  escuela_procedencia TEXT,
  matricula TEXT,
  grado TEXT,
  grupo TEXT,
  ciclo_escolar TEXT,
  promedio TEXT,
  posgrado TEXT DEFAULT 'Especialidad de Ortodoncia',
  trabaja_empresa TEXT,
  trabaja_direccion TEXT,
  trabaja_telefono TEXT,
  ocupacion TEXT,
  contrato_laboral TEXT,
  contrato_otros TEXT,
  ingreso_mensual TEXT,
  estado_civil TEXT,
  vivienda TEXT,
  egresos_renta TEXT,
  egresos_alimentacion TEXT,
  egresos_servicios TEXT,
  egresos_hipoteca TEXT,
  egresos_otros TEXT,
  egresos_total TEXT,
  tiene_auto TEXT,
  num_autos TEXT,
  auto_marca_modelo TEXT,
  dependientes JSONB DEFAULT '[]',
  porcentaje_beca TEXT DEFAULT '25%',
  doc_acta_nacimiento BOOLEAN DEFAULT false,
  doc_curp BOOLEAN DEFAULT false,
  doc_certificado_licenciatura BOOLEAN DEFAULT false,
  doc_titulo_profesional BOOLEAN DEFAULT false,
  doc_cedula_profesional BOOLEAN DEFAULT false,
  doc_fotografias_tamano TEXT,
  doc_otros TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La fecha del Dictamen de Beca la decide el periodo de becas, no el dia en que se genera
-- el PDF, asi que se guarda por alumno en vez de usar la fecha de hoy.
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_dictamen TEXT;

-- Mismo caso para el Consentimiento de Reglamento: la fecha es la del periodo, no la de generacion.
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS fecha_reglamento TEXT;

-- El Vo.Bo. del Consentimiento de Reglamento siempre lo firma la misma persona; se deja como
-- columna (editable via Excel si algun dia cambia) pero bloqueada en el formulario manual.
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS visto_bueno TEXT DEFAULT 'ARTURO CERON VAZQUEZ';

CREATE TABLE IF NOT EXISTS plantillas (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  archivo_pdf TEXT NOT NULL,
  mapa_campos JSONB NOT NULL DEFAULT '[]',
  zonas_firma JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  alumno_id INTEGER NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  plantilla_id INTEGER NOT NULL REFERENCES plantillas(id),
  estatus TEXT NOT NULL DEFAULT 'borrador', -- borrador | enviado | firmado
  pdf_generado BYTEA,
  pdf_firmado BYTEA,
  token_firma TEXT UNIQUE,
  enviado_en TIMESTAMPTZ,
  firmado_en TIMESTAMPTZ,
  firmado_ip TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_alumno ON documentos(alumno_id);
CREATE INDEX IF NOT EXISTS idx_documentos_token ON documentos(token_firma);
