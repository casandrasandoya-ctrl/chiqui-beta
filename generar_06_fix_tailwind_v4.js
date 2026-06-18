// Script: generar_06_fix_tailwind_v4.js
// Que hace: corrige app/globals.css para que use la sintaxis correcta de
// Tailwind v4. Tu proyecto tiene instalado Tailwind v4 (ver package.json:
// "tailwindcss": "^4"), pero globals.css todavia usaba la sintaxis vieja
// de v3 (@tailwind base; @tailwind components; @tailwind utilities;).
// Esto causaba que clases como bg-[#8C572F] no se generaran correctamente,
// dejando tarjetas sin fondo y el grid descuadrado -- el bug que viste en
// el celular.
//
// El fix: cambia esas 3 lineas por la unica linea que pide v4:
// @import "tailwindcss";
// El resto del archivo (variables, animaciones, clase .bandana) queda igual,
// salvo --bg y --text que se actualizan al nuevo tono claro/cafe para que
// el fondo del body combine con la nueva paleta (antes que cargue cada
// pagina, para evitar un destello oscuro).
//
// IMPORTANTE: postcss.config.js ya estaba correcto (usa @tailwindcss/postcss),
// asi que no se toca ese archivo.
//
// Como correrlo: node generar_06_fix_tailwind_v4.js
// Confirma que diga "OK: app/globals.css"

const fs = require('fs');
const path = require('path');

const filePath = path.join('app', 'globals.css');
const b64 = "QGltcG9ydCAidGFpbHdpbmRjc3MiOwoKOnJvb3QgewogIC0tYmc6ICNGNUVERTM7CiAgLS1iZzI6ICMxODFDMjY7CiAgLS1iZzM6ICMxRTIzMzM7CiAgLS1jYXJkOiAjMjMyODQwOwogIC0tYm9yZGVyOiByZ2JhKDI1NSwyNTUsMjU1LDAuMDcpOwogIC0tdGV4dDogIzNEMkIxRjsKICAtLW11dGVkOiAjOEE4RkE4OwogIC0tYWNjZW50OiAjRThBODRDOwogIC0tZ3JlZW46ICM0Q0FGN0Q7CiAgLS15ZWxsb3c6ICNGNUM4NDI7CiAgLS1vcmFuZ2U6ICNGMDdBMzA7CiAgLS1yZWQ6ICNFMDUyNTI7CiAgLS1ibHVlOiAjNEFBQkRCOwogIC0tdGVhbDogIzNERDZCNTsKICAtLXJhZGl1czogMTZweDsKICAtLXJhZGl1cy1zbTogMTBweDsKfQoKKiB7CiAgYm94LXNpemluZzogYm9yZGVyLWJveDsKICAtd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6IHRyYW5zcGFyZW50Owp9Cgpib2R5IHsKICBmb250LWZhbWlseTogdmFyKC0tZm9udC1udW5pdG8tc2FucyksIHNhbnMtc2VyaWY7CiAgYmFja2dyb3VuZDogdmFyKC0tYmcpOwogIGNvbG9yOiB2YXIoLS10ZXh0KTsKICBtYXgtd2lkdGg6IDQyMHB4OwogIG1hcmdpbjogMCBhdXRvOwogIG1pbi1oZWlnaHQ6IDEwMHZoOwogIC13ZWJraXQtZm9udC1zbW9vdGhpbmc6IGFudGlhbGlhc2VkOwogIHBhZGRpbmctYm90dG9tOiA4MHB4Owp9CgouZm9udC1oZWFkaW5nIHsKICBmb250LWZhbWlseTogdmFyKC0tZm9udC1udW5pdG8pLCBzYW5zLXNlcmlmOwp9CgovKiBTY3JvbGxiYXIgaW52aXNpYmxlICovCjo6LXdlYmtpdC1zY3JvbGxiYXIgeyBkaXNwbGF5OiBub25lOyB9CiogeyBzY3JvbGxiYXItd2lkdGg6IG5vbmU7IH0KCi8qIElucHV0IGJhc2UgKi8KaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEgewogIGZvbnQtZmFtaWx5OiB2YXIoLS1mb250LW51bml0by1zYW5zKSwgc2Fucy1zZXJpZjsKfQoKLyogQW5pbWFjaW9uZXMgKi8KQGtleWZyYW1lcyBmYWRlSW4gewogIGZyb20geyBvcGFjaXR5OiAwOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoOHB4KTsgfQogIHRvICAgeyBvcGFjaXR5OiAxOyB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoMCk7IH0KfQouZmFkZS1pbiB7IGFuaW1hdGlvbjogZmFkZUluIDAuMjVzIGVhc2Utb3V0OyB9CgpAa2V5ZnJhbWVzIHB1bHNlLWRvdCB7CiAgMCUsIDEwMCUgeyBvcGFjaXR5OiAxOyB9CiAgNTAlICAgICAgIHsgb3BhY2l0eTogMC40OyB9Cn0KLnB1bHNlLWRvdCB7IGFuaW1hdGlvbjogcHVsc2UtZG90IDJzIGVhc2UtaW4tb3V0IGluZmluaXRlOyB9CgovKiBCYW5kYW5hIGRlY29yYXRpdmEgKGF2YXRhciBkZSBtYXNjb3RhKSAqLwouYmFuZGFuYSB7CiAgcG9zaXRpb246IGFic29sdXRlOyBib3R0b206IC0ycHg7IGxlZnQ6IDUwJTsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC01MCUpOwogIHdpZHRoOiAyOHB4OyBoZWlnaHQ6IDhweDsKICBib3JkZXItcmFkaXVzOiAwIDAgNHB4IDRweDsKICBjbGlwLXBhdGg6IHBvbHlnb24oMCAwLCAxMDAlIDAsIDg1JSAxMDAlLCA1MCUgNzAlLCAxNSUgMTAwJSk7Cn0K";
const content = Buffer.from(b64, 'base64').toString('utf8');

const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(filePath, content, 'utf8');
console.log('OK: ' + filePath);
