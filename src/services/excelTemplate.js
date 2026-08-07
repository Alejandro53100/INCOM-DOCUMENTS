const ExcelJS = require('exceljs');
const { columnasExcel } = require('./campos');

const EJEMPLO = {
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
  nombre: 'Ana',
  email: 'ana.perez@ejemplo.com',
  telefono: '7771234567',
  edad: '28',
  sexo: 'F',
  curp: 'PEGA960101MMCXXX01',
  lugar_nacimiento: 'Cuernavaca, Morelos',
  fecha_nacimiento: '1996-01-01',
  nacionalidad: 'Mexicana',
  domicilio_calle: 'Av. Reforma 123',
  domicilio_numero: '123',
  domicilio_colonia: 'Centro',
  domicilio_municipio: 'Cuernavaca',
  escuela_procedencia: 'Universidad X',
  matricula: 'INC-2026-001',
  grado: '1er semestre',
  grupo: 'A',
  ciclo_escolar: '2026-1',
  promedio: '9.2',
  posgrado: 'Especialidad de Ortodoncia',
  doc_fotografias_tamano: 'Infantil x4',
  doc_acta_nacimiento: 'Si',
  doc_curp: 'Si',
  doc_certificado_licenciatura: 'Si',
  doc_titulo_profesional: 'No',
  doc_cedula_profesional: 'No',
};

async function generarPlantillaExcel() {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Alumnos');
  const columnas = columnasExcel();

  hoja.columns = columnas.map((c) => ({ header: c.etiqueta, key: c.clave, width: 26 }));
  hoja.getRow(1).font = { bold: true };

  const filaEjemplo = {};
  for (const c of columnas) filaEjemplo[c.clave] = EJEMPLO[c.clave] || '';
  hoja.addRow(filaEjemplo);

  return wb.xlsx.writeBuffer();
}

module.exports = { generarPlantillaExcel };
