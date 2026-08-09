// SMTP directo (Gmail o via relay) se cuelga sin error en el hosting actual:
// bloquea el protocolo SMTP saliente por completo. Se manda el correo por la
// API HTTPS de Gmail con OAuth2 en su lugar (puerto 443, nunca bloqueado),
// usando la cuenta de Gmail real de INCOM como remitente.
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

let cachedToken = null;
let cachedExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedExpiry) return cachedToken;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const tok = await res.json();
  if (!tok.access_token) throw new Error(`No se pudo refrescar el token de Gmail: ${JSON.stringify(tok)}`);

  cachedToken = tok.access_token;
  cachedExpiry = Date.now() + (tok.expires_in - 60) * 1000;
  return cachedToken;
}

function nombreArchivo(nombreDocumento) {
  return `${nombreDocumento.replace(/[\\/:*?"<>|]/g, '')}.pdf`;
}

function asuntoCodificado(asunto) {
  return `=?UTF-8?B?${Buffer.from(asunto, 'utf8').toString('base64')}?=`;
}

function envolverBase64(base64) {
  return base64.replace(/(.{76})/g, '$1\r\n');
}

function construirMime({ from, to, subject, html, attachments = [] }) {
  const boundary = `incom_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const partes = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${asuntoCodificado(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
  ];

  for (const adjunto of attachments) {
    partes.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${adjunto.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${adjunto.filename}"`,
      '',
      envolverBase64(adjunto.content.toString('base64'))
    );
  }

  partes.push(`--${boundary}--`, '');
  return partes.join('\r\n');
}

async function enviarGmail({ to, subject, html, attachments }) {
  const mime = construirMime({
    from: `INCOM Documentos <${process.env.MAIL_FROM}>`,
    to,
    subject,
    html,
    attachments,
  });
  const raw = Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const accessToken = await getAccessToken();
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const detalle = await res.text();
    throw new Error(`Gmail API respondio ${res.status}: ${detalle}`);
  }
}

// documentos: [{ nombreDocumento, enlace, pdfBuffer }] — uno o varios documentos en un solo correo.
async function enviarCorreoFirma({ alumno, documentos }) {
  const nombre = [alumno.nombre, alumno.apellido_paterno].filter(Boolean).join(' ');
  const plural = documentos.length > 1;
  const listaEnlaces = documentos
    .map((d) => `<li><strong>${d.nombreDocumento}</strong> — <a href="${d.enlace}">Ver y firmar</a></li>`)
    .join('');

  await enviarGmail({
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
  await enviarGmail({
    to: destinatario,
    subject: `Documento firmado: ${nombreDocumento} — ${nombre}`,
    html: `
      <p>${nombre} (${alumno.email}) acaba de firmar <strong>${nombreDocumento}</strong>.</p>
      <p><a href="${enlaceAdmin}">Ver la ficha del alumno y descargar el PDF firmado</a></p>
    `,
  });
}

module.exports = { enviarCorreoFirma, notificarDocumentoFirmado };
