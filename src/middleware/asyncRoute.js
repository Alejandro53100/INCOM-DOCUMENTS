// Express 4 no captura errores lanzados/rechazados dentro de handlers async: si una
// consulta a la base de datos falla y nadie la envuelve, el proceso completo se cae.
// Este wrapper reenvia cualquier error al middleware de errores en vez de tumbar el servidor.
function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncRoute };
