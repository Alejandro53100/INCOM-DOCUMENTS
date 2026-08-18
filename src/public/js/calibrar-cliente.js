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
  let arrastreCampo = null; // { i, movido }
  let ignorarClicOverlay = false;

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
    campos.forEach((c, i) => {
      if (c.pagina !== paginaActual) return;
      const marca = document.createElement('div');
      marca.textContent = c.clave;
      marca.className = 'marca-campo';
      marca.dataset.i = i;
      marca.style.left = pdfXaCanvas(c.x) + 'px';
      marca.style.top = (pdfYaCanvas(c.y) - 14) + 'px';
      marca.addEventListener('mousedown', (e) => iniciarArrastreCampo(i, e));
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

  function iniciarArrastreCampo(i, e) {
    e.preventDefault();
    e.stopPropagation();
    arrastreCampo = { i, movido: false };
    e.target.classList.add('arrastrando');
    document.addEventListener('mousemove', moverCampoArrastrado);
    document.addEventListener('mouseup', soltarCampoArrastrado);
  }

  function moverCampoArrastrado(e) {
    if (!arrastreCampo) return;
    arrastreCampo.movido = true;
    const rect = overlay.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, viewportActual.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, viewportActual.height));
    const c = campos[arrastreCampo.i];
    c.x = canvasXaPdf(x);
    c.y = canvasYaPdf(y);
    const marca = overlay.querySelector(`.marca-campo[data-i="${arrastreCampo.i}"]`);
    if (marca) {
      marca.style.left = pdfXaCanvas(c.x) + 'px';
      marca.style.top = (pdfYaCanvas(c.y) - 14) + 'px';
    }
  }

  function soltarCampoArrastrado() {
    document.removeEventListener('mousemove', moverCampoArrastrado);
    document.removeEventListener('mouseup', soltarCampoArrastrado);
    if (arrastreCampo && arrastreCampo.movido) ignorarClicOverlay = true;
    arrastreCampo = null;
    redibujarOverlay();
  }

  function actualizarBadgesCampos() {
    const conteo = {};
    campos.forEach((c) => { conteo[c.clave] = (conteo[c.clave] || 0) + 1; });
    document.querySelectorAll('.fila-campo').forEach((div) => {
      const n = conteo[div.dataset.clave] || 0;
      div.classList.toggle('usado', n > 0);
      const badge = div.querySelector('.badge-usado');
      if (badge) badge.textContent = n > 1 ? `✓ ${n}` : '✓';
    });
  }

  function renderTablaUbicados() {
    actualizarBadgesCampos();
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
      document.querySelectorAll('.fila-campo').forEach((d) => d.classList.remove('armado'));
      campoArmado = { clave: div.dataset.clave, etiqueta: div.dataset.etiqueta };
      modoFirma = false;
      document.getElementById('btn-modo-firma').textContent = 'Marcar zona de firma';
      div.classList.add('armado');
    });
  });

  document.getElementById('btn-modo-firma').addEventListener('click', (e) => {
    modoFirma = !modoFirma;
    campoArmado = null;
    document.querySelectorAll('.fila-campo').forEach((d) => d.classList.remove('armado'));
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
    if (ignorarClicOverlay) { ignorarClicOverlay = false; return; }
    if (modoFirma || !campoArmado) return;
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pdfX = canvasXaPdf(x);
    const pdfY = canvasYaPdf(y);
    // Siempre agrega una ubicacion nueva (no reemplaza una existente de la misma clave):
    // varios documentos (ej. Consentimiento de Reglamento) repiten el mismo campo dos veces
    // en la misma hoja porque tienen dos copias. Para ajustar una ubicacion, arrastra su
    // etiqueta en el PDF; para quitarla, usa la ✕ en "Campos mapeados".
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
