const path = require('path');

// Carpeta con los 7 PDF originales (fuera de src/, junto a package.json).
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates_pdf');

module.exports = { TEMPLATES_DIR };
