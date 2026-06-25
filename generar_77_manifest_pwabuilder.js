// Script: generar_77_manifest_pwabuilder.js
// Que hace: mejora el manifest.ts para resolver los warnings de
// PWABuilder antes de generar el paquete para Google Play:
//
//   - Agrega 'id' unico para que browsers y OSes identifiquen la app
//     correctamente aunque cambie la URL en el futuro.
//   - Agrega 'categories' (health, lifestyle, utilities) para enriquecer
//     la experiencia de instalacion de la PWA.
//   - Agrega 'prefer_related_applications: false' para que Android
//     prefiera instalar la PWA en vez de buscar una app nativa.
//   - Agrega 'screenshots' apuntando a /screenshots/ en public/ --
//     necesitas crear esa carpeta y subir 3 capturas de pantalla
//     reales de la app (1080x1920px) con esos nombres:
//       public/screenshots/dashboard.png
//       public/screenshots/registro.png
//       public/screenshots/prevencion.png
//
//   1) app/manifest.ts (REEMPLAZA el existente)
//
// Como correrlo: node generar_77_manifest_pwabuilder.js
// Confirma "OK: app/manifest.ts"

const fs = require('fs');
const path = require('path');

const filePath = path.join('app', 'manifest.ts');
const b64 = "aW1wb3J0IHR5cGUgeyBNZXRhZGF0YVJvdXRlIH0gZnJvbSAnbmV4dCcKCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG1hbmlmZXN0KCk6IE1ldGFkYXRhUm91dGUuTWFuaWZlc3QgewogIHJldHVybiB7CiAgICBpZDogJ2NsLmNoaXF1aS5lbnRyZXNlbmhhbGVzJywKICAgIG5hbWU6ICdDSElRVUkgRW50cmUgU2XDsWFsZXMnLAogICAgc2hvcnRfbmFtZTogJ0NISVFVSScsCiAgICBkZXNjcmlwdGlvbjogJ1R1IGNvbXBhw7Flcm8gZGUgb2JzZXJ2YWNpw7NuIHkgY3VpZGFkbyBwYXJhIGxhIHNhbHVkIGRlIHR1IG1hc2NvdGEuIFJlZ2lzdHJhIHPDrW50b21hcywgdmFjdW5hcywgcGFzZW9zIHkgbcOhcy4nLAogICAgc3RhcnRfdXJsOiAnL2Rhc2hib2FyZCcsCiAgICBzY29wZTogJy8nLAogICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLAogICAgYmFja2dyb3VuZF9jb2xvcjogJyNGNUVERTMnLAogICAgdGhlbWVfY29sb3I6ICcjOEM1NzJGJywKICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLAogICAgY2F0ZWdvcmllczogWydoZWFsdGgnLCAnbGlmZXN0eWxlJywgJ3V0aWxpdGllcyddLAogICAgcHJlZmVyX3JlbGF0ZWRfYXBwbGljYXRpb25zOiBmYWxzZSwKICAgIGljb25zOiBbCiAgICAgIHsKICAgICAgICBzcmM6ICcvaWNvbi0xOTJ4MTkyLnBuZycsCiAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJywKICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJywKICAgICAgICBwdXJwb3NlOiAnYW55JywKICAgICAgfSwKICAgICAgewogICAgICAgIHNyYzogJy9pY29uLTUxMng1MTIucG5nJywKICAgICAgICBzaXplczogJzUxMng1MTInLAogICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLAogICAgICAgIHB1cnBvc2U6ICdhbnknLAogICAgICB9LAogICAgICB7CiAgICAgICAgc3JjOiAnL2ljb24tbWFza2FibGUtNTEyeDUxMi5wbmcnLAogICAgICAgIHNpemVzOiAnNTEyeDUxMicsCiAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsCiAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJywKICAgICAgfSwKICAgIF0sCiAgICBzY3JlZW5zaG90czogWwogICAgICB7CiAgICAgICAgc3JjOiAnL3NjcmVlbnNob3RzL2Rhc2hib2FyZC5wbmcnLAogICAgICAgIHNpemVzOiAnMTA4MHgxOTIwJywKICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJywKICAgICAgICBsYWJlbDogJ0Rhc2hib2FyZCBwcmluY2lwYWwgZGUgQ0hJUVVJJywKICAgICAgICBmb3JtX2ZhY3RvcjogJ25hcnJvdycsCiAgICAgIH0sCiAgICAgIHsKICAgICAgICBzcmM6ICcvc2NyZWVuc2hvdHMvcmVnaXN0cm8ucG5nJywKICAgICAgICBzaXplczogJzEwODB4MTkyMCcsCiAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsCiAgICAgICAgbGFiZWw6ICdSZWdpc3RybyBkaWFyaW8gZGUgc8OtbnRvbWFzJywKICAgICAgICBmb3JtX2ZhY3RvcjogJ25hcnJvdycsCiAgICAgIH0sCiAgICAgIHsKICAgICAgICBzcmM6ICcvc2NyZWVuc2hvdHMvcHJldmVuY2lvbi5wbmcnLAogICAgICAgIHNpemVzOiAnMTA4MHgxOTIwJywKICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJywKICAgICAgICBsYWJlbDogJ1ByZXZlbmNpw7NuIHkgdmFjdW5hcycsCiAgICAgICAgZm9ybV9mYWN0b3I6ICduYXJyb3cnLAogICAgICB9LAogICAgXSwKICB9Cn0K";
const content = Buffer.from(b64, 'base64').toString('utf8');
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(filePath, content, 'utf8');
console.log('OK: ' + filePath);
console.log('');
console.log('IMPORTANTE: Crea la carpeta public/screenshots/ y sube');
console.log('3 capturas de pantalla de la app con estos nombres:');
console.log('  - dashboard.png  (1080x1920px)');
console.log('  - registro.png   (1080x1920px)');
console.log('  - prevencion.png (1080x1920px)');
