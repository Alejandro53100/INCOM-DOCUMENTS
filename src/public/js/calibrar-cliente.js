(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const SCALE = 1.5;
  const { id: plantillaId, pdfUrl, mapaCampos, zonasFirma } = window.PLANTILLA;

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const indicadorPagina = document.getElementById('indicador-pagina');
  const tbodyUbicados = document.querySelector('#tabla-ubicados tbody');
  const estadoGuardado = document.getElementById('estado-guardado');

  let pdfDoc = null;
  let paginaActual = 1;
  let viewportActual = null;
  let campoArmado = null; // { clave, etiqueta }
  let modoFirma = false;
  let campos = mapaCampos.slice();
  let firmas = zonasFirma.slice();
  let arrastre = null;

  function pdfXaCanvas(x) { return x * SCALE; }
  function pdfYaCanvas(y) { return viewportActual.height - y * SCALE; }
  function canvasXaPdf(x) { return x / SCALE; }
  function canvasYaPdf(y) { return (viewportActual.height - y) / SCALE; }

  async function renderPagina(num) {
    const page = await pdfDoc.getPage(num);
    viewportActual = page.getViewport({ scale: SCALE });
    canvas.width = viewportActual.width;
    canvas.height = viewportActual.height;
    overlay.style.width = viewportActual.width + 'px';
    overlay.style.height = viewportActual.height + 'px';
    await page.render({ canvasContext: ctx, viewport: viewportActual }).promise;
    indicadorPagina.textContent = `Página ${num} de ${pdfDoc.numPages}`;
    redibujarOverlay();
  }

  function redibujarOverlay() {
    overlay.innerHTML = '';
    campos.filter((c) => c.pagina === paginaActual).forEach((c) => {
      const marca = document.createElement('div');
      marca.textContent = c.clave;
      marca.style.cssText = `position:absolute; left:${pdfXaCanvas(c.x)}px; top:${pdfYaCanvas(c.y) - 14}px;
        background:#1d4e89; color:#fff; font-size:10px; padding:1px 4px; border-radius:3px; white-space:nowrap; pointer-events:none;`;
      overlay.appendChild(marca);
    });
    firmas.filter((f) => f.pagina === paginaActual).forEach((f) => {
      const caja = document.createElement('div');
      caja.style.cssText = `position:absolute; left:${pdfXaCanvas(f.x)}px; top:${pdfYaCanvas(f.y + f.alto)}px;
        width:${f.ancho * SCALE}px; height:${f.alto * SCALE}px; border:2px dashed #b02a37; pointer-events:none;`;
      overlay.appendChild(caja);
    });
    renderTablaUbicados();
  }

  function renderTablaUbicados() {
    tbodyUbicados.innerHTML = '';
    campos.forEach((c, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${c.clave}</td><td>${c.pagina}</td>
        <td><input type="number" value="${c.tamano_fuente}" style="width:50px" data-i="${i}" class="tam-fuente"></td>
        <td><a href="#" data-i="${i}" class="quitar-campo">✕</a></td>`;
      tbodyUbicados.appendChild(tr);
    });
    firmas.forEach((f, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>(firma pág. ${f.pagina})</td><td>${f.pagina}</td><td>—</td>
        <td><a href="#" data-i="${i}" class="quitar-firma">✕</a></td>`;
      tbodyUbicados.appendChild(tr);
    });

    tbodyUbicados.querySelectorAll('.tam-fuente').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        campos[+e.target.dataset.i].tamano_fuente = +e.target.value || 9;
      });
    });
    tbodyUbicados.querySelectorAll('.quitar-campo').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        campos.splice(+e.target.dataset.i, 1);
        redibujarOverlay();
      });
    });
    tbodyUbicados.querySelectorAll('.quitar-firma').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        firmas.splice(+e.target.dataset.i, 1);
        redibujarOverlay();
      });
    });
  }

  document.querySelectorAll('.fila-campo').forEach((div) => {
    div.addEventListener('click', () => {
      document.querySelectorAll('.fila-campo').forEach((d) => (d.style.background = ''));
      campoArmado = { clave: div.dataset.clave, etiqueta: div.dataset.etiqueta };
      modoFirma = false;
      document.getElementById('btn-modo-firma').textContent = 'Marcar zona de firma';
      div.style.background = '#dbe7f5';
    });
  });

  document.getElementById('btn-modo-firma').addEventListener('click', (e) => {
    modoFirma = !modoFirma;
    campoArmado = null;
    document.querySelectorAll('.fila-campo').forEach((d) => (d.style.background = ''));
    e.target.textContent = modoFirma ? 'Cancelar zona de firma' : 'Marcar zona de firma';
  });

  overlay.addEventListener('mousedown', (e) => {
    if (!modoFirma) return;
    const rect = overlay.getBoundingClientRect();
    arrastre = { x1: e.clientX - rect.left, y1: e.clientY - rect.top };
  });
  overlay.addEventListener('mouseup', (e) => {
    if (!modoFirma || !arrastre) return;
    const rect = overlay.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const izq = Math.min(arrastre.x1, x2);
    const der = Math.max(arrastre.x1, x2);
    const arriba = Math.min(arrastre.y1, y2);
    const abajo = Math.max(arrastre.y1, y2);
    arrastre = null;
    if (der - izq < 5 || abajo - arriba < 5) return;
    firmas.push({
      pagina: paginaActual,
      x: canvasXaPdf(izq),
      y: canvasYaPdf(abajo),
      ancho: (der - izq) / SCALE,
      alto: (abajo - arriba) / SCALE,
    });
    redibujarOverlay();
  });

  overlay.addEventListener('click', (e) => {
    if (modoFirma || !campoArmado) return;
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pdfX = canvasXaPdf(x);
    const pdfY = canvasYaPdf(y);
    // Siempre agrega una ubicacion nueva (no reemplaza una existente de la misma clave):
    // varios documentos (ej. Consentimiento de Reglamento) repiten el mismo campo dos veces
    // en la misma hoja porque tienen dos copias. Para corregir una ubicacion mal puesta,
    // bórrala con la ✕ en "Campos ya ubicados" y vuelve a hacer clic.
    campos.push({ clave: campoArmado.clave, pagina: paginaActual, x: pdfX, y: pdfY, tamano_fuente: 9 });
    redibujarOverlay();
  });

  document.getElementById('btn-pagina-prev').addEventListener('click', () => {
    if (paginaActual > 1) { paginaActual--; renderPagina(paginaActual); }
  });
  document.getElementById('btn-pagina-next').addEventListener('click', () => {
    if (paginaActual < pdfDoc.numPages) { paginaActual++; renderPagina(paginaActual); }
  });

  document.getElementById('btn-guardar').addEventListener('click', async () => {
    estadoGuardado.textContent = 'Guardando...';
    const resp = await fetch(`/plantillas/${plantillaId}/mapa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapa_campos: campos, zonas_firma: firmas }),
    });
    estadoGuardado.textContent = resp.ok ? 'Guardado ✓' : 'Error al guardar';
    setTimeout(() => (estadoGuardado.textContent = ''), 3000);
  });

  pdfjsLib.getDocument(pdfUrl).promise.then((doc) => {
    pdfDoc = doc;
    renderPagina(1);
  });
})();
