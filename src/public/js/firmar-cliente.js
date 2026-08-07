(function () {
  const canvas = document.getElementById('firma-canvas');
  const mensaje = document.getElementById('firma-mensaje');
  const btnFirmar = document.getElementById('btn-firmar');
  const btnBorrar = document.getElementById('btn-borrar');

  function ajustarTamano() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rectangulo = canvas.getBoundingClientRect();
    canvas.width = rectangulo.width * ratio;
    canvas.height = rectangulo.height * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
    pad.clear();
  }

  const pad = new SignaturePad(canvas);
  window.addEventListener('resize', ajustarTamano);
  ajustarTamano();

  btnBorrar.addEventListener('click', () => {
    pad.clear();
    mensaje.textContent = '';
  });

  btnFirmar.addEventListener('click', async () => {
    if (pad.isEmpty()) {
      mensaje.textContent = 'Dibuja tu firma antes de confirmar.';
      return;
    }
    btnFirmar.disabled = true;
    mensaje.textContent = '';

    try {
      const resp = await fetch(`/firmar/${window.TOKEN_FIRMA}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmaPngBase64: pad.toDataURL('image/png') }),
      });
      const datos = await resp.json();
      if (!resp.ok) throw new Error(datos.error || 'No se pudo guardar la firma');
      window.location.reload();
    } catch (err) {
      mensaje.textContent = err.message + '. Puedes borrar e intentar de nuevo.';
      btnFirmar.disabled = false;
    }
  });
})();
