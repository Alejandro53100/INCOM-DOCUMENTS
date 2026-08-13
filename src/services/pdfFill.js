const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { TEMPLATES_DIR } = require('../config');
const { CAMPOS_BOOLEANOS } = require('./campos');

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CLAVES_BOOLEANAS = new Set(CAMPOS_BOOLEANOS.map((b) => b.clave));

function resolverValorCampo(clave, alumno) {
  if (CLAVES_BOOLEANAS.has(clave)) return alumno[clave] ? 'X' : '';

  if (clave === 'nombre_completo') {
    return [alumno.apellido_paterno, alumno.apellido_materno, alumno.nombre].filter(Boolean).join(' ');
  }

  // El campo "sexo" se guarda como F/Femenino o M/Masculino (el select de la ficha del
  // alumno ya solo deja elegir esas dos opciones), pero el formato de beca pide marcar
  // una casilla F( ) / M( ) en vez de escribir la letra. Por eso se exponen dos campos
  // calibrables y solo uno de los dos trae la "X".
  if (clave === 'sexo_f' || clave === 'sexo_m') {
    const valor = String(alumno.sexo || '').trim().toUpperCase();
    const esFemenino = valor === 'F' || valor.startsWith('FEM') || valor.startsWith('MUJER');
    const esMasculino = valor === 'M' || valor.startsWith('MASC') || valor.startsWith('HOMBRE') || valor === 'H';
    if (clave === 'sexo_f') return esFemenino ? 'X' : '';
    return esMasculino ? 'X' : '';
  }

  // Mismo patron que sexo_f/sexo_m: el alumno trae un texto libre (estado_civil,
  // contrato_laboral, vivienda) y el formato de beca pide marcar una de varias casillas.
  if (clave === 'estado_civil_soltero' || clave === 'estado_civil_casado') {
    const valor = String(alumno.estado_civil || '').trim().toUpperCase();
    if (clave === 'estado_civil_soltero') return valor.startsWith('SOLTER') ? 'X' : '';
    return valor.startsWith('CASAD') ? 'X' : '';
  }

  if (clave.startsWith('contrato_laboral_')) {
    const valor = String(alumno.contrato_laboral || '').trim().toUpperCase();
    if (clave === 'contrato_laboral_fijo') return valor.startsWith('FIJO') ? 'X' : '';
    if (clave === 'contrato_laboral_temporal') return valor.startsWith('TEMPORAL') ? 'X' : '';
    if (clave === 'contrato_laboral_independiente') return valor.startsWith('INDEPENDIENTE') ? 'X' : '';
    if (clave === 'contrato_laboral_otros') return valor.startsWith('OTRO') ? 'X' : '';
  }

  if (clave.startsWith('vivienda_')) {
    const valor = String(alumno.vivienda || '').trim().toUpperCase();
    if (clave === 'vivienda_propia') return valor.startsWith('PROPIA') ? 'X' : '';
    if (clave === 'vivienda_rentada') return valor.startsWith('RENTADA') ? 'X' : '';
    if (clave === 'vivienda_prestada') return valor.startsWith('PRESTADA') ? 'X' : '';
  }

  if (clave === 'grado_numero') {
    const match = String(alumno.grado || '').match(/\d+/);
    return match ? match[0] : (alumno.grado || '');
  }

  if (clave === 'domicilio_completo') {
    return [alumno.domicilio_calle, alumno.domicilio_numero, alumno.domicilio_colonia, alumno.domicilio_municipio]
      .filter(Boolean).join(', ');
  }

  if (clave === 'lugar_fecha_nacimiento') {
    return [alumno.lugar_nacimiento, alumno.fecha_nacimiento].filter(Boolean).join(' — ');
  }

  if (clave.startsWith('fecha_nacimiento_')) {
    const partes = String(alumno.fecha_nacimiento || '').split('-'); // se guarda como AAAA-MM-DD
    if (partes.length !== 3) return '';
    const [anio, mes, dia] = partes;
    if (clave === 'fecha_nacimiento_dia') return String(Number(dia));
    if (clave === 'fecha_nacimiento_mes') return MESES[Number(mes) - 1] || mes;
    if (clave === 'fecha_nacimiento_anio') return anio;
  }

  // Fecha del Dictamen de Beca: la decide el periodo de becas (se captura en la ficha del
  // alumno / Excel), no es la fecha en que se genera el PDF, por eso no usa "hoy" como fecha_*.
  if (clave.startsWith('fecha_dictamen_')) {
    const partes = String(alumno.fecha_dictamen || '').split('-'); // se guarda como AAAA-MM-DD
    if (partes.length !== 3) return '';
    const [anio, mes, dia] = partes;
    if (clave === 'fecha_dictamen_dia') return String(Number(dia));
    if (clave === 'fecha_dictamen_mes') return MESES[Number(mes) - 1] || mes;
    if (clave === 'fecha_dictamen_anio') return anio;
    if (clave === 'fecha_dictamen_anio_1_digito') return anio.slice(-1);
  }

  // Fecha del Consentimiento de Reglamento: mismo caso que fecha_dictamen_, la decide el
  // periodo, no el dia de generacion. El año va a 2 digitos porque asi estaba calibrado
  // el PDF cuando usaba la fecha de hoy (fecha_anio).
  if (clave.startsWith('fecha_reglamento_')) {
    const partes = String(alumno.fecha_reglamento || '').split('-'); // se guarda como AAAA-MM-DD
    if (partes.length !== 3) return '';
    const [anio, mes, dia] = partes;
    if (clave === 'fecha_reglamento_dia') return String(Number(dia));
    if (clave === 'fecha_reglamento_mes') return MESES[Number(mes) - 1] || mes;
    if (clave === 'fecha_reglamento_anio') return anio.slice(-2);
  }

  if (clave.startsWith('fecha_')) {
    const hoy = new Date();
    if (clave === 'fecha_dia') return String(hoy.getDate());
    if (clave === 'fecha_mes') return MESES[hoy.getMonth()];
    if (clave === 'fecha_anio') return String(hoy.getFullYear()).slice(-2);
    if (clave === 'fecha_anio_1_digito') return String(hoy.getFullYear()).slice(-1);
    if (clave === 'fecha_larga') return `${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  }

  const matchDependiente = clave.match(/^dependiente(\d)_(nombre|edad|escolaridad)$/);
  if (matchDependiente) {
    const idx = Number(matchDependiente[1]) - 1;
    const sub = matchDependiente[2];
    const dependientes = Array.isArray(alumno.dependientes) ? alumno.dependientes : [];
    return (dependientes[idx] && dependientes[idx][sub]) || '';
  }

  const valor = alumno[clave];
  return valor === null || valor === undefined ? '' : String(valor);
}

async function generarPdfLlenado(plantilla, alumno) {
  const rutaPdf = path.join(TEMPLATES_DIR, plantilla.archivo_pdf);
  const bytesOriginal = fs.readFileSync(rutaPdf);
  const pdfDoc = await PDFDocument.load(bytesOriginal);
  const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const paginas = pdfDoc.getPages();

  for (const campo of plantilla.mapa_campos || []) {
    const pagina = paginas[campo.pagina - 1];
    if (!pagina) continue;
    const texto = resolverValorCampo(campo.clave, alumno);
    if (!texto) continue;
    pagina.drawText(texto, {
      x: campo.x,
      y: campo.y,
      size: campo.tamano_fuente || 9,
      font: fuente,
      color: rgb(0.05, 0.05, 0.15),
    });
  }

  return pdfDoc.save();
}

// Estampa la imagen de la firma (PNG en base64) en todas las zonas de firma definidas para la plantilla
// (normalmente una, pero el Consentimiento de Reglamento tiene dos copias en la misma pagina).
async function estamparFirma(bytesPdfGenerado, zonasFirma, firmaPngBase64) {
  const pdfDoc = await PDFDocument.load(bytesPdfGenerado);
  const paginas = pdfDoc.getPages();
  const pngImage = await pdfDoc.embedPng(firmaPngBase64);

  for (const zona of zonasFirma || []) {
    const pagina = paginas[zona.pagina - 1];
    if (!pagina) continue;
    pagina.drawImage(pngImage, { x: zona.x, y: zona.y, width: zona.ancho, height: zona.alto });
  }

  return pdfDoc.save();
}

module.exports = { generarPdfLlenado, estamparFirma, resolverValorCampo };
