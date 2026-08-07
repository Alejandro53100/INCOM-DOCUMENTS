require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const { pool, ensureSchema } = require('./db/pool');
const { TEMPLATES_DIR } = require('./config');
const { requireAuth } = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const alumnosRoutes = require('./routes/alumnos');
const plantillasRoutes = require('./routes/plantillas');
const documentosRoutes = require('./routes/documentos');
const firmarRoutes = require('./routes/firmar');

// Red de seguridad final: si algo se rechaza fuera del ciclo request/response de Express
// (por ejemplo una promesa disparada sin esperar su resultado), se registra en vez de
// tumbar el servidor completo.
process.on('unhandledRejection', (err) => {
  console.error('Promesa no manejada:', err);
});

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '5mb' })); // suficiente para la imagen PNG de la firma
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'desarrollo-inseguro',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 }, // 12 horas
}));

app.use((req, res, next) => {
  res.locals.adminEmail = req.session ? req.session.adminEmail : null;
  next();
});

// Rutas publicas (login y firma de documentos por token, sin sesion admin)
app.use('/', authRoutes);
app.use('/firmar', firmarRoutes);

// Rutas del panel administrativo (requieren sesion)
app.use('/plantillas-pdf', requireAuth, express.static(TEMPLATES_DIR));
app.use('/', requireAuth, alumnosRoutes);
app.use('/plantillas', requireAuth, plantillasRoutes);
app.use('/documentos', requireAuth, documentosRoutes);

app.use((req, res) => {
  res.status(404).send('Página no encontrada.');
});

// Ultimo recurso: cualquier error que llegue aqui (via asyncRoute) se registra y se responde
// con un error controlado, en vez de dejar que tumbe todo el proceso Node.
app.use((err, req, res, next) => {
  console.error(err);
  const mensaje = 'Ocurrió un error inesperado. Intenta de nuevo en unos segundos.';
  if (req.is('application/json')) {
    return res.status(500).json({ error: mensaje });
  }
  res.status(500).send(mensaje);
});

const PORT = process.env.PORT || 3000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`INCOM Documentos escuchando en http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('No se pudo preparar la base de datos:', err);
    process.exit(1);
  });
