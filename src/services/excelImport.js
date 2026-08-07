const ExcelJS = require('exceljs');
const { columnasExcel, normalizarEncabezado, NUM_DEPENDIENTES } = require('./campos');

function esVerdadero(valor) {
  const v = normalizarEncabezado(String(valor ?? ''));
  return ['si', 'sí', 's', 'true', '1', 'x'].includes(v);
}

async function leerExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const hoja = wb.worksheets[0];
  if (!hoja) return { alumnos: [], errores: ['El archivo no tiene hojas.'] };

  const columnas = columnasExcel();
  const porEncabezado = new Map(columnas.map((c) => [normalizarEncabezado(c.etiqueta), c]));

  const filaEncabezado = hoja.getRow(1);
  const indiceAClave = {};
  filaEncabezado.eachCell((celda, colIndex) => {
    const col = porEncabezado.get(normalizarEncabezado(celda.value));
    if (col) indiceAClave[colIndex] = col;
  });

  if (Object.keys(indiceAClave).length === 0) {
    return { alumnos: [], errores: ['No se reconoció ninguna columna. Descarga la plantilla de Excel y usa esos encabezados.'] };
  }

  const alumnos = [];
  const errores = [];

  for (let r = 2; r <= hoja.rowCount; r++) {
    const fila = hoja.getRow(r);
    if (fila.cellCount === 0 || fila.values.every((v) => v === null || v === undefined || v === '')) continue;

    const datos = {};
    fila.eachCell({ includeEmpty: true }, (celda, colIndex) => {
      const col = indiceAClave[colIndex];
      if (!col) return;
      let valor = celda.value;
      if (valor && typeof valor === 'object' && valor.text) valor = valor.text; // hipervinculos/formulas
      if (valor instanceof Date) valor = valor.toISOString().slice(0, 10);
      datos[col.clave] = col.tipo === 'booleano' ? esVerdadero(valor) : (valor === null || valor === undefined ? '' : String(valor).trim());
    });

    if (!datos.nombre || !datos.email) {
      errores.push(`Fila ${r}: falta nombre o correo, se omitió.`);
      continue;
    }

    const dependientes = [];
    for (let i = 1; i <= NUM_DEPENDIENTES; i++) {
      const nombre = datos[`dependiente${i}_nombre`];
      if (nombre) {
        dependientes.push({
          nombre,
          edad: datos[`dependiente${i}_edad`] || '',
          escolaridad: datos[`dependiente${i}_escolaridad`] || '',
        });
      }
      delete datos[`dependiente${i}_nombre`];
      delete datos[`dependiente${i}_edad`];
      delete datos[`dependiente${i}_escolaridad`];
    }
    datos.dependientes = dependientes;

    alumnos.push(datos);
  }

  return { alumnos, errores };
}

module.exports = { leerExcel };
