# INCOM · Generación y firma de documentos

Sistema sencillo para llenar automáticamente los formatos escolares del INCOM (Instituto de
Capacitación Odontológico de Morelos) a partir de un Excel y enviarlos por correo para que el
alumno los firme electrónicamente con un pad de firma.

## Flujo

1. El administrador sube un Excel con los datos de los alumnos (`/alumnos/plantilla-excel` da la
   plantilla con las columnas correctas).
2. Desde la ficha de cada alumno, genera los formatos que necesite (los datos se insertan
   automáticamente sobre el PDF original).
3. Revisa el PDF generado antes de enviarlo.
4. Selecciona los documentos ya revisados y los envía por correo al alumno; cada documento lleva
   un enlace único de firma.
5. El alumno abre el enlace, revisa el documento y firma con el mouse/dedo. Puede borrar y
   reintentar su firma las veces que quiera antes de confirmarla.
6. Al confirmar la firma, el documento queda sellado (no se puede volver a firmar) y el
   administrador recibe un correo de notificación con el enlace para ver el PDF firmado.

## Antes de generar documentos: calibrar las plantillas

Los 7 PDF originales (en `templates_pdf/`) no tienen campos de formulario, así que hay que
indicarle al sistema en qué coordenadas va cada dato. Esto se hace **una sola vez por plantilla**
desde `/plantillas → Calibrar`: se elige un campo de la lista y se hace clic sobre el PDF en el
lugar donde debe imprimirse; para la firma se dibuja un rectángulo (el Consentimiento de
Reglamento necesita dos rectángulos, uno por cada copia en la misma hoja).

## Requisitos

- Node.js 18 o superior
- Una base de datos Postgres (recomendado: [Neon](https://neon.tech), capa gratuita permanente)
- Una cuenta de Gmail con una [contraseña de aplicación](https://myaccount.google.com/apppasswords)
  para enviar correo por SMTP

## Configuración local

```bash
npm install
cp .env.example .env   # y llena los valores (ver abajo)
npm run dev
```

Variables de entorno (`.env`):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Postgres (con `sslmode=require` si usas Neon) |
| `SESSION_SECRET` | Cualquier cadena larga y aleatoria |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_INICIAL` | Cuenta admin que se crea sola en el primer arranque |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Cuenta de Gmail y su contraseña de aplicación |
| `BASE_URL` | URL pública del sitio (se usa para armar los enlaces de firma en los correos) |
| `PORT` | Puerto local (por defecto 3000) |

Al arrancar, el servidor crea automáticamente las tablas necesarias y la cuenta admin inicial si
no existen (ver `src/db/schema.sql` y `src/db/pool.js`).

## Despliegue gratuito (Render + Neon)

1. **Base de datos**: crea un proyecto gratuito en [neon.tech](https://neon.tech) y copia el
   `DATABASE_URL` que te dan (incluye `?sslmode=require`).
2. **Correo**: activa la verificación en dos pasos en la cuenta de Gmail que vas a usar y genera
   una "contraseña de aplicación" en https://myaccount.google.com/apppasswords.
3. **Repositorio**: sube este proyecto a un repositorio de GitHub.
4. **Render**: crea un "Web Service" gratuito en [render.com](https://render.com) apuntando a ese
   repositorio.
   - Build command: `npm install`
   - Start command: `npm start`
   - Agrega las variables de entorno de la tabla de arriba (usa el `DATABASE_URL` de Neon, y
     `BASE_URL` con la URL que Render te asigne, ej. `https://tu-servicio.onrender.com`).
5. Al desplegar, la primera petición crea las tablas y el admin inicial automáticamente.

**Nota sobre el plan gratuito de Render**: el disco local no es persistente entre despliegues,
por eso todos los PDF generados y firmados se guardan directamente en Postgres (Neon), no en el
disco del servidor — así no se pierden aunque Render reinicie o vuelva a desplegar el servicio.
El plan gratuito de Render también "duerme" el servicio tras un rato sin tráfico; la primera
petición después de eso tarda unos segundos en responder mientras despierta.

## Seguridad

- El enlace de firma de cada documento es un token aleatorio largo, específico de ese documento;
  una vez firmado, el token pasa a modo solo-lectura.
- El panel administrativo requiere iniciar sesión; solo existe una cuenta admin (se gestiona por
  variables de entorno al primer arranque).
- Es un sistema pensado para un solo administrador/instituto; no incluye protección CSRF ni
  límite de intentos de login, algo razonable para este alcance pero a tener en cuenta si el uso
  crece.
