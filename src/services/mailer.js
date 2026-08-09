// SMTP (Gmail directo o via relay de Brevo) se queda colgado sin error en el
// hosting actual: bloquea el protocolo SMTP saliente por completo. Se manda
// el correo por la API HTTPS de Mailjet en su lugar (puerto 443, nunca bloqueado).
const MAILJET_API_URL = 'https://api.mailjet.com/v3.1/send';

function authHeader() {
  const token = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_API_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

async function enviarMailjet(payload) {
  const res = await fetch(MAILJET_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Mailjet respondio ${res.status}: ${detalle}`);
  }
}

function nombreArchivo(nombreDocumento) {
  return `${nombreDocumento.replace(/[\\/:*?"<>|]/g, '')}.pdf`;
}

// documentos: [{ nombreDocumento, enlace, pdfBuffer }] — uno o varios documentos en un solo correo.
async function enviarCorreoFirma({ alumno, documentos }) {
  const nombre = [alumno.nombre, alumno.apellido_paterno].filter(Boolean).join(' ');
  const plural = documentos.length > 1;
  const listaEnlaces = documentos
    .map((d) => `<li><strong>${d.nombreDocumento}</strong> — <a href="${d.enlace}">Ver y firmar</a></li>`)
    .join('');

  await enviarMailjet({
    Messages: [
      {
        From: { Email: process.env.MAIL_FROM, Name: 'INCOM Documentos' },
        To: [{ Email: alumno.email, Name: nombre || alumno.email }],
        Subject: plural ? `Firma requerida: ${documentos.length} documentos` : `Firma requerida: ${documentos[0].nombreDocumento}`,
        HTMLPart: `
          <p>Hola ${nombre || ''},</p>
          <p>El Instituto de Capacitación Odontológico de Morelos te envía ${plural ? 'los siguientes documentos' : 'el siguiente documento'} para tu firma. Los adjuntamos en PDF para que los revises, y puedes firmarlos desde el enlace correspondiente:</p>
          <ul>${listaEnlaces}</ul>
          <p>Al abrir un enlace vas a poder ver el documento y dibujar tu firma. Puedes borrar y volver a intentar tu firma las veces que necesites antes de confirmarla.</p>
          <p>Si tú no solicitaste estos documentos, ignora este correo.</p>
        `,
        Attachments: documentos.map((d) => ({
          ContentType: 'application/pdf',
          Filename: nombreArchivo(d.nombreDocumento),
          Base64Content: d.pdfBuffer.toString('base64'),
        })),
      },
    ],
  });
}

async function notificarDocumentoFirmado({ alumno, nombreDocumento, enlaceAdmin }) {
  const destinatario = process.env.ADMIN_EMAIL;
  if (!destinatario) return;
  const nombre = [alumno.nombre, alumno.apellido_paterno].filter(Boolean).join(' ');
  await enviarMailjet({
    Messages: [
      {
        From: { Email: process.env.MAIL_FROM, Name: 'INCOM Documentos' },
        To: [{ Email: destinatario }],
        Subject: `Documento firmado: ${nombreDocumento} — ${nombre}`,
        HTMLPart: `
          <p>${nombre} (${alumno.email}) acaba de firmar <strong>${nombreDocumento}</strong>.</p>
          <p><a href="${enlaceAdmin}">Ver la ficha del alumno y descargar el PDF firmado</a></p>
        `,
      },
    ],
  });
}

module.exports = { enviarCorreoFirma, notificarDocumentoFirmado };
