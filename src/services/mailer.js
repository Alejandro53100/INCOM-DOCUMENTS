const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    // Gmail SMTP directo se cuelga sin error en hosts como Render/Railway
    // (Google bloquea/descarta silenciosamente conexiones desde IPs de nube).
    // Se usa el relay SMTP de Brevo en su lugar.
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000,
      auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
    });
  }
  return transporter;
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

  await getTransporter().sendMail({
    from: `INCOM Documentos <${process.env.MAIL_FROM}>`,
    to: alumno.email,
    subject: plural ? `Firma requerida: ${documentos.length} documentos` : `Firma requerida: ${documentos[0].nombreDocumento}`,
    html: `
      <p>Hola ${nombre || ''},</p>
      <p>El Instituto de Capacitación Odontológico de Morelos te envía ${plural ? 'los siguientes documentos' : 'el siguiente documento'} para tu firma. Los adjuntamos en PDF para que los revises, y puedes firmarlos desde el enlace correspondiente:</p>
      <ul>${listaEnlaces}</ul>
      <p>Al abrir un enlace vas a poder ver el documento y dibujar tu firma. Puedes borrar y volver a intentar tu firma las veces que necesites antes de confirmarla.</p>
      <p>Si tú no solicitaste estos documentos, ignora este correo.</p>
    `,
    attachments: documentos.map((d) => ({ filename: nombreArchivo(d.nombreDocumento), content: d.pdfBuffer })),
  });
}

async function notificarDocumentoFirmado({ alumno, nombreDocumento, enlaceAdmin }) {
  const destinatario = process.env.ADMIN_EMAIL;
  if (!destinatario) return;
  const nombre = [alumno.nombre, alumno.apellido_paterno].filter(Boolean).join(' ');
  await getTransporter().sendMail({
    from: `INCOM Documentos <${process.env.MAIL_FROM}>`,
    to: destinatario,
    subject: `Documento firmado: ${nombreDocumento} — ${nombre}`,
    html: `
      <p>${nombre} (${alumno.email}) acaba de firmar <strong>${nombreDocumento}</strong>.</p>
      <p><a href="${enlaceAdmin}">Ver la ficha del alumno y descargar el PDF firmado</a></p>
    `,
  });
}

module.exports = { enviarCorreoFirma, notificarDocumentoFirmado };
