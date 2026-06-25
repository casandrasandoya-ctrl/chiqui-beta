// Script: generar_79_manifest_sin_screenshots.js
// Que hace: quita la seccion 'screenshots' del manifest que causaba
// los warnings en PWABuilder (404 porque las imagenes no existen en
// /public/screenshots/). Los screenshots en el manifest son opcionales
// -- no los necesita ni PWABuilder ni Google Play para generar el .aab.
// Las capturas de pantalla para Google Play se suben directamente en
// la Google Play Console, no via manifest.
//
//   1) app/manifest.ts (REEMPLAZA el existente)
//
// Como correrlo: node generar_79_manifest_sin_screenshots.js
// Confirma "OK: app/manifest.ts"

const fs = require('fs');
const path = require('path');

const filePath = path.join('app', 'manifest.ts');
const b64 = "aW1wb3J0IHR5cGUgeyBNZXRhZGF0YVJvdXRlIH0gZnJvbSAnbmV4dCcKCmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG1hbmlmZXN0KCk6IE1ldGFkYXRhUm91dGUuTWFuaWZlc3QgewogIHJldHVybiB7CiAgICBpZDogJ2NsLmNoaXF1aS5lbnRyZXNlbmhhbGVzJywKICAgIG5hbWU6ICdDSElRVUkgRW50cmUgU2XDsWFsZXMnLAogICAgc2hvcnRfbmFtZTogJ0NISVFVSScsCiAgICBkZXNjcmlwdGlvbjogJ1R1IGNvbXBhw7Flcm8gZGUgb2JzZXJ2YWNpw7NuIHkgY3VpZGFkbyBwYXJhIGxhIHNhbHVkIGRlIHR1IG1hc2NvdGEuIFJlZ2lzdHJhIHPDrW50b21hcywgdmFjdW5hcywgcGFzZW9zIHkgbcOhcy4nLAogICAgc3RhcnRfdXJsOiAnL2Rhc2hib2FyZCcsCiAgICBzY29wZTogJy8nLAogICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLAogICAgYmFja2dyb3VuZF9jb2xvcjogJyNGNUVERTMnLAogICAgdGhlbWVfY29sb3I6ICcjOEM1NzJGJywKICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLAogICAgY2F0ZWdvcmllczogWydoZWFsdGgnLCAnbGlmZXN0eWxlJywgJ3V0aWxpdGllcyddLAogICAgcHJlZmVyX3JlbGF0ZWRfYXBwbGljYXRpb25zOiBmYWxzZSwKICAgIGljb25zOiBbCiAgICAgIHsKICAgICAgICBzcmM6ICcvaWNvbi0xOTJ4MTkyLnBuZycsCiAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJywKICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJywKICAgICAgICBwdXJwb3NlOiAnYW55JywKICAgICAgfSwKICAgICAgewogICAgICAgIHNyYzogJy9pY29uLTUxMng1MTIucG5nJywKICAgICAgICBzaXplczogJzUxMng1MTInLAogICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLAogICAgICAgIHB1cnBvc2U6ICdhbnknLAogICAgICB9LAogICAgICB7CiAgICAgICAgc3JjOiAnL2ljb24tbWFza2FibGUtNTEyeDUxMi5wbmcnLAogICAgICAgIHNpemVzOiAnNTEyeDUxMicsCiAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsCiAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJywKICAgICAgfSwKICAgIF0sCiAgfQp9Cg==";
const content = Buffer.from(b64, 'base64').toString('utf8');
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(filePath, content, 'utf8');
console.log('OK: ' + filePath);
