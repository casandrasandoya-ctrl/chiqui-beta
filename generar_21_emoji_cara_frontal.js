// Script: generar_21_emoji_cara_frontal.js
// Que hace: ajusta los emojis de Perro y Gato a la version de cara
// frontal (\ud83d\udc36 y \ud83d\udc31) en vez de la version de cuerpo de perfil que se
// habia usado antes (\ud83d\udc15 y \ud83d\udc08), segun preferencia de Casandra.
//
// Como TODAS las pantallas (dashboard, perfil, registro diario, selector
// de mascota) ya usan esta unica utilidad compartida en vez de tener
// copias propias del mapeo, este cambio se aplica automaticamente a toda
// la app con un solo archivo.
//
// Como correrlo: node generar_21_emoji_cara_frontal.js
// Confirma "OK: utils/iconoEspecie.ts"

const fs = require('fs');
const path = require('path');

const filePath = path.join('utils', 'iconoEspecie.ts');
const b64 = "Ly8gTWFwZW8gZGUgZXNwZWNpZSAtPiBlbW9qaSwgdXNhZG8gZW4gY3VhbHF1aWVyIHBhbnRhbGxhIHF1ZSBtdWVzdHJlIHVuCi8vIGF2YXRhciBvIGljb25vIHJlcHJlc2VudGFuZG8gYSB1bmEgbWFzY290YSAoZGFzaGJvYXJkLCBwZXJmaWwsIHNlbGVjdG9yLAovLyBldGMuKSwgcGFyYSBxdWUgZWwgaWNvbm8gY29ycmVzcG9uZGEgYSBsYSBlc3BlY2llIHJlYWwgZW4gdmV6IGRlIG1vc3RyYXIKLy8gc2llbXByZSBlbCBtaXNtbyBwZXJyaXRvIHNpbiBpbXBvcnRhciBzaSBlcyB1biBnYXRvLCBjb25lam8sIG8gYXZlLgoKZXhwb3J0IGNvbnN0IElDT05PX0VTUEVDSUU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7CiAgUGVycm86ICfwn5C2JywKICBHYXRvOiAn8J+QsScsCiAgQ29uZWpvOiAn8J+QhycsCiAgQXZlOiAn8J+QpicsCn0KCi8vIERldnVlbHZlIGVsIGVtb2ppIGNvcnJlc3BvbmRpZW50ZSBhIGxhIGVzcGVjaWUsIG8gbGEgaHVlbGxhIGdlbsOpcmljYQovLyDwn5C+IGNvbW8gcmVzcGFsZG8gcGFyYSAiT3RybyIgbyBjdWFscXVpZXIgdmFsb3Igbm8gY29udGVtcGxhZG8uCmV4cG9ydCBmdW5jdGlvbiBpY29ub1BvckVzcGVjaWUoZXNwZWNpZT86IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgewogIGlmICghZXNwZWNpZSkgcmV0dXJuICfwn5C+JwogIHJldHVybiBJQ09OT19FU1BFQ0lFW2VzcGVjaWVdIHx8ICfwn5C+Jwp9Cg==";
const content = Buffer.from(b64, 'base64').toString('utf8');

const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(filePath, content, 'utf8');
console.log('OK: ' + filePath);
