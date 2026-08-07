const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function enviarCorreoFirma({ alumno, nombreDocumento, enlace }) {
  const nombre = [alumno.nombre, alumno.apellido_paterno].filter(Boolean).join(' ');
  await getTransporter().sendMail({
    from: `INCOM Documentos <${process.env.GMAIL_USER}>`,
    to: alumno.email,
    subject: `Firma requerida: ${nombreDocumento}`,
    html: `
      <p>Hola ${nombre || ''},</p>
      <p>El Instituto de Capacitación Odontológico de Morelos te envía el documento <strong>${nombreDocumento}</strong> para tu firma.</p>
      <p>Abre el siguiente enlace, revisa el documento y fírmalo. Puedes borrar y volver a intentar tu firma las veces que necesites antes de confirmarla:</p>
      <p><a href="${enlace}">${enlace}</a></p>
      <p>Si tú no solicitaste este documento, ignora este correo.</p>
    `,
  });
}

async function notificarDocumentoFirmado({ alumno, nombreDocumento, enlaceAdmin }) {
  const destinatario = process.env.ADMIN_EMAIL;
  if (!destinatario) return;
  const nombre = [alumno.nombre, alumno.apellido_paterno].filter(Boolean).join(' ');
  await getTransporter().sendMail({
    from: `INCOM Documentos <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: `Documento firmado: ${nombreDocumento} — ${nombre}`,
    html: `
      <p>${nombre} (${alumno.email}) acaba de firmar <strong>${nombreDocumento}</strong>.</p>
      <p><a href="${enlaceAdmin}">Ver la ficha del alumno y descargar el PDF firmado</a></p>
    `,
  });
}

module.exports = { enviarCorreoFirma, notificarDocumentoFirmado };
