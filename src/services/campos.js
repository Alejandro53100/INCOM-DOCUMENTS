// Definicion central de los campos del alumno: la usan el importador/plantilla de Excel,
// la ficha del alumno y la herramienta de calibracion de plantillas PDF.
// Mantenerla en un solo lugar evita que el Excel, el formulario y el llenado de PDF se desalineen.

const CAMPOS = [
  { clave: 'apellido_paterno', etiqueta: 'Apellido Paterno', grupo: 'Identidad' },
  { clave: 'apellido_materno', etiqueta: 'Apellido Materno', grupo: 'Identidad' },
  { clave: 'nombre', etiqueta: 'Nombre(s)', grupo: 'Identidad' },
  { clave: 'email', etiqueta: 'Correo del alumno', grupo: 'Identidad' },
  { clave: 'telefono', etiqueta: 'Teléfono', grupo: 'Identidad' },
  { clave: 'edad', etiqueta: 'Edad', grupo: 'Identidad' },
  { clave: 'sexo', etiqueta: 'Sexo', grupo: 'Identidad', opciones: ['Femenino', 'Masculino'] },
  { clave: 'curp', etiqueta: 'CURP', grupo: 'Identidad' },
  { clave: 'lugar_nacimiento', etiqueta: 'Lugar de Nacimiento', grupo: 'Identidad' },
  { clave: 'fecha_nacimiento', etiqueta: 'Fecha de Nacimiento (AAAA-MM-DD)', grupo: 'Identidad' },
  { clave: 'nacionalidad', etiqueta: 'Nacionalidad', grupo: 'Identidad' },

  { clave: 'domicilio_calle', etiqueta: 'Domicilio: Calle y Número', grupo: 'Domicilio' },
  { clave: 'domicilio_numero', etiqueta: 'Domicilio: Número', grupo: 'Domicilio' },
  { clave: 'domicilio_colonia', etiqueta: 'Domicilio: Colonia', grupo: 'Domicilio' },
  { clave: 'domicilio_municipio', etiqueta: 'Domicilio: Municipio', grupo: 'Domicilio' },

  { clave: 'escuela_procedencia', etiqueta: 'Escuela de Procedencia', grupo: 'Escolar' },
  { clave: 'matricula', etiqueta: 'Matrícula', grupo: 'Escolar' },
  { clave: 'grado', etiqueta: 'Grado (ej. 1er semestre)', grupo: 'Escolar' },
  { clave: 'grupo', etiqueta: 'Grupo', grupo: 'Escolar' },
  { clave: 'ciclo_escolar', etiqueta: 'Ciclo Escolar', grupo: 'Escolar' },
  { clave: 'fecha_inscripcion', etiqueta: 'Fecha de Inscripción (AAAA-MM-DD)', grupo: 'Escolar' },
  { clave: 'fecha_reinscripcion', etiqueta: 'Fecha de Reinscripción (AAAA-MM-DD)', grupo: 'Escolar' },
  { clave: 'promedio', etiqueta: 'Promedio', grupo: 'Escolar' },
  { clave: 'posgrado', etiqueta: 'Posgrado / Especialidad', grupo: 'Escolar' },
  { clave: 'fecha_reglamento', etiqueta: 'Fecha del Consentimiento de Reglamento (AAAA-MM-DD)', grupo: 'Escolar' },
  { clave: 'visto_bueno', etiqueta: 'Visto Bueno (Consentimiento de Reglamento)', grupo: 'Escolar', soloLectura: true, valorPredeterminado: 'ARTURO CERON VAZQUEZ' },

  { clave: 'trabaja_empresa', etiqueta: 'Trabaja en: Empresa', grupo: 'Laboral' },
  { clave: 'trabaja_direccion', etiqueta: 'Trabaja en: Dirección', grupo: 'Laboral' },
  { clave: 'trabaja_telefono', etiqueta: 'Trabaja en: Teléfono', grupo: 'Laboral' },
  { clave: 'ocupacion', etiqueta: 'Ocupación', grupo: 'Laboral' },
  { clave: 'contrato_laboral', etiqueta: 'Contrato Laboral', grupo: 'Laboral', opciones: ['Fijo', 'Temporal', 'Independiente', 'Otros'] },
  { clave: 'contrato_otros', etiqueta: 'Contrato Laboral: especifique otros', grupo: 'Laboral' },
  { clave: 'ingreso_mensual', etiqueta: 'Ingreso Mensual', grupo: 'Laboral' },

  { clave: 'estado_civil', etiqueta: 'Estado Civil', grupo: 'Beca', opciones: ['Soltero', 'Casado'] },
  { clave: 'vivienda', etiqueta: 'Vivienda', grupo: 'Beca', opciones: ['Propia', 'Rentada', 'Prestada'] },
  { clave: 'egresos_renta', etiqueta: 'Egresos: Renta', grupo: 'Beca' },
  { clave: 'egresos_alimentacion', etiqueta: 'Egresos: Alimentación', grupo: 'Beca' },
  { clave: 'egresos_servicios', etiqueta: 'Egresos: Servicios', grupo: 'Beca' },
  { clave: 'egresos_hipoteca', etiqueta: 'Egresos: Hipoteca', grupo: 'Beca' },
  { clave: 'egresos_otros', etiqueta: 'Egresos: Otros', grupo: 'Beca' },
  { clave: 'egresos_total', etiqueta: 'Egresos: Total', grupo: 'Beca' },
  { clave: 'tiene_auto', etiqueta: 'Cuenta con Automóvil (Si/No)', grupo: 'Beca' },
  { clave: 'num_autos', etiqueta: 'Número de Automóviles', grupo: 'Beca' },
  { clave: 'auto_marca_modelo', etiqueta: 'Automóvil: Marca y Modelo', grupo: 'Beca' },
  { clave: 'porcentaje_beca', etiqueta: 'Porcentaje de Beca Asignado', grupo: 'Beca' },
  { clave: 'fecha_dictamen', etiqueta: 'Fecha del Dictamen de Beca (AAAA-MM-DD)', grupo: 'Beca' },

  { clave: 'doc_fotografias_tamano', etiqueta: 'Fotografías: Tamaño', grupo: 'Documentos entregados' },
  { clave: 'doc_otros', etiqueta: 'Otros documentos (especifique)', grupo: 'Documentos entregados' },
];

const CAMPOS_BOOLEANOS = [
  { clave: 'doc_acta_nacimiento', etiqueta: 'Acta de Nacimiento (original y copia)' },
  { clave: 'doc_curp', etiqueta: 'CURP (original y copia)' },
  { clave: 'doc_certificado_licenciatura', etiqueta: 'Certificado de Licenciatura (original y copia)' },
  { clave: 'doc_titulo_profesional', etiqueta: 'Título Profesional (original y copia)' },
  { clave: 'doc_cedula_profesional', etiqueta: 'Cédula Profesional (original y copia)' },
];

// Campos "calculados" que no vienen directo de una columna del alumno, pero se pueden
// ubicar en un PDF durante la calibracion (ej. nombre completo en una sola linea, o la fecha de hoy).
const CAMPOS_VIRTUALES = [
  { clave: 'nombre_completo', etiqueta: 'Nombre completo (Apellidos + Nombre)', grupo: 'Calculados' },
  { clave: 'sexo_f', etiqueta: 'Sexo: casilla F / Femenino (marca X si es Mujer)', grupo: 'Calculados' },
  { clave: 'sexo_m', etiqueta: 'Sexo: casilla M / Masculino (marca X si es Hombre)', grupo: 'Calculados' },
  { clave: 'estado_civil_soltero', etiqueta: 'Estado Civil: casilla Soltero', grupo: 'Calculados' },
  { clave: 'estado_civil_casado', etiqueta: 'Estado Civil: casilla Casado', grupo: 'Calculados' },
  { clave: 'contrato_laboral_fijo', etiqueta: 'Contrato Laboral: casilla Fijo', grupo: 'Calculados' },
  { clave: 'contrato_laboral_temporal', etiqueta: 'Contrato Laboral: casilla Temporal', grupo: 'Calculados' },
  { clave: 'contrato_laboral_independiente', etiqueta: 'Contrato Laboral: casilla Independiente', grupo: 'Calculados' },
  { clave: 'contrato_laboral_otros', etiqueta: 'Contrato Laboral: casilla Otros', grupo: 'Calculados' },
  { clave: 'vivienda_propia', etiqueta: 'Vivienda: casilla Propia', grupo: 'Calculados' },
  { clave: 'vivienda_rentada', etiqueta: 'Vivienda: casilla Rentada', grupo: 'Calculados' },
  { clave: 'vivienda_prestada', etiqueta: 'Vivienda: casilla Prestada', grupo: 'Calculados' },
  { clave: 'grado_numero', etiqueta: 'Grado, solo el número (ej. "1" en vez de "1er semestre")', grupo: 'Calculados' },
  { clave: 'domicilio_completo', etiqueta: 'Domicilio completo (calle, número, colonia, municipio)', grupo: 'Calculados' },
  { clave: 'lugar_fecha_nacimiento', etiqueta: 'Lugar y fecha de nacimiento (una sola línea)', grupo: 'Calculados' },
  { clave: 'fecha_nacimiento_dia', etiqueta: 'Fecha de nacimiento: día', grupo: 'Calculados' },
  { clave: 'fecha_nacimiento_mes', etiqueta: 'Fecha de nacimiento: mes', grupo: 'Calculados' },
  { clave: 'fecha_nacimiento_anio', etiqueta: 'Fecha de nacimiento: año', grupo: 'Calculados' },
  { clave: 'fecha_dictamen_dia', etiqueta: 'Fecha del Dictamen de Beca: día', grupo: 'Calculados' },
  { clave: 'fecha_dictamen_mes', etiqueta: 'Fecha del Dictamen de Beca: mes', grupo: 'Calculados' },
  { clave: 'fecha_dictamen_anio', etiqueta: 'Fecha del Dictamen de Beca: año', grupo: 'Calculados' },
  { clave: 'fecha_dictamen_anio_1_digito', etiqueta: 'Fecha del Dictamen de Beca: año (solo el último dígito)', grupo: 'Calculados' },
  { clave: 'fecha_reglamento_dia', etiqueta: 'Fecha del Consentimiento de Reglamento: día', grupo: 'Calculados' },
  { clave: 'fecha_reglamento_mes', etiqueta: 'Fecha del Consentimiento de Reglamento: mes', grupo: 'Calculados' },
  { clave: 'fecha_reglamento_anio', etiqueta: 'Fecha del Consentimiento de Reglamento: año (2 dígitos)', grupo: 'Calculados' },
  { clave: 'fecha_dia', etiqueta: 'Fecha de hoy: día', grupo: 'Calculados' },
  { clave: 'fecha_mes', etiqueta: 'Fecha de hoy: mes', grupo: 'Calculados' },
  { clave: 'fecha_anio', etiqueta: 'Fecha de hoy: año (2 dígitos)', grupo: 'Calculados' },
  { clave: 'fecha_anio_1_digito', etiqueta: 'Fecha de hoy: año (solo el último dígito, ej. "6" en 2026)', grupo: 'Calculados' },
  { clave: 'fecha_larga', etiqueta: 'Fecha de hoy (larga, ej. 23 de julio de 2026)', grupo: 'Calculados' },
];

const NUM_DEPENDIENTES = 4;
const CAMPOS_DEPENDIENTE = ['nombre', 'edad', 'escolaridad'];

function columnasDependientes() {
  const columnas = [];
  for (let i = 1; i <= NUM_DEPENDIENTES; i++) {
    for (const c of CAMPOS_DEPENDIENTE) {
      columnas.push({ clave: `dependiente${i}_${c}`, etiqueta: `Dependiente ${i}: ${c}` });
    }
  }
  return columnas;
}

// Todas las claves simples (texto) que van directo de columna de Excel -> columna de la tabla alumnos.
function clavesTexto() {
  return CAMPOS.map((c) => c.clave);
}

// Lista completa y ordenada de columnas que debe tener el Excel: texto + booleanos (Si/No) + dependientes.
function columnasExcel() {
  const columnas = CAMPOS.map((c) => ({ clave: c.clave, etiqueta: c.etiqueta, tipo: 'texto' }));
  for (const b of CAMPOS_BOOLEANOS) columnas.push({ clave: b.clave, etiqueta: b.etiqueta, tipo: 'booleano' });
  for (const d of columnasDependientes()) columnas.push({ clave: d.clave, etiqueta: d.etiqueta, tipo: 'texto' });
  return columnas;
}

const DIACRITICOS = new RegExp('[̀-ͯ]', 'g');

function normalizarEncabezado(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Todos los campos que se pueden asignar a una coordenada en la herramienta de calibracion:
// los campos simples del alumno + las casillas de documentos + los dependientes + los calculados.
function camposCalibrables() {
  const dependientesCal = [];
  for (let i = 1; i <= NUM_DEPENDIENTES; i++) {
    for (const c of CAMPOS_DEPENDIENTE) {
      dependientesCal.push({ clave: `dependiente${i}_${c}`, etiqueta: `Dependiente ${i}: ${c}`, grupo: 'Dependientes (Beca)' });
    }
  }
  const booleanos = CAMPOS_BOOLEANOS.map((b) => ({ clave: b.clave, etiqueta: `${b.etiqueta} (marca X)`, grupo: 'Documentos entregados (casilla)' }));
  return [...CAMPOS, ...booleanos, ...CAMPOS_VIRTUALES, ...dependientesCal];
}

module.exports = {
  CAMPOS,
  CAMPOS_BOOLEANOS,
  CAMPOS_VIRTUALES,
  NUM_DEPENDIENTES,
  CAMPOS_DEPENDIENTE,
  columnasDependientes,
  clavesTexto,
  columnasExcel,
  normalizarEncabezado,
  camposCalibrables,
};
