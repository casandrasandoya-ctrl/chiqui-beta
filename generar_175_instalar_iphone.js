const fs = require('fs');
const path = require('path');

const content = `export default function InstalarIphonePage() {
  const pasos = [
    {
      numero: 1,
      titulo: 'Abre CHIQUI en Safari',
      texto: 'Este truco solo funciona en el navegador Safari (no en Chrome ni otros). Entra a chiqui-beta-lilac.vercel.app desde Safari en tu iPhone.',
    },
    {
      numero: 2,
      titulo: 'Toca el botón de compartir',
      texto: 'En la parte inferior de la pantalla, toca el ícono del cuadrito con la flecha hacia arriba (el botón de "Compartir").',
    },
    {
      numero: 3,
      titulo: 'Busca "Añadir a pantalla de inicio"',
      texto: 'Desliza hacia abajo en el menú que aparece y toca la opción "Añadir a pantalla de inicio" (Add to Home Screen).',
    },
    {
      numero: 4,
      titulo: 'Confirma el nombre y toca "Añadir"',
      texto: 'Aparecerá el nombre "CHIQUI" listo para confirmar. Toca "Añadir" en la esquina superior derecha.',
    },
    {
      numero: 5,
      titulo: '¡Listo! Ya tienes tu ícono de CHIQUI',
      texto: 'Ahora vas a ver el ícono de CHIQUI en tu pantalla de inicio, igual que cualquier otra app. Se abre en pantalla completa, sin barra de navegador.',
    },
  ];

  return (
    <div style={{ backgroundColor: '#F5EDE3', minHeight: '100vh', padding: '24px 16px' }}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          backgroundColor: '#FFFCF8',
          borderRadius: 20,
          padding: '32px 24px',
          fontFamily: "'Nunito Sans', sans-serif",
          color: '#3D2B1F',
        }}
      >
        <h1
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
            fontSize: 26,
            color: '#8C572F',
            marginBottom: 8,
          }}
        >
          Instala CHIQUI en tu iPhone
        </h1>
        <p style={{ fontWeight: 600, marginBottom: 28, color: '#CD7421' }}>
          Sin App Store, gratis, en menos de 1 minuto 🐾
        </p>

        {pasos.map((paso) => (
          <div
            key={paso.numero}
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#FFBD59',
                color: '#3D2B1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {paso.numero}
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: '#8C572F',
                  marginBottom: 4,
                }}
              >
                {paso.titulo}
              </p>
              <p style={{ lineHeight: 1.6, color: '#3D2B1F' }}>{paso.texto}</p>
            </div>
          </div>
        ))}

        <div
          style={{
            backgroundColor: '#F5EDE3',
            borderRadius: 12,
            padding: '16px',
            marginTop: 8,
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#8C572F' }}>
            💡 Importante
          </p>
          <p style={{ lineHeight: 1.6, fontSize: 14 }}>
            Este método debe hacerse desde Safari, no desde Chrome ni otro
            navegador — es una función exclusiva de Safari en iPhone. Una vez
            instalado, CHIQUI funciona igual que cualquier otra app: puedes
            abrirla desde tu pantalla de inicio y usarla sin conexión para
            registros ya guardados.
          </p>
        </div>
      </div>
    </div>
  );
}
`;

const dir = path.join('app', 'instalar-iphone');
fs.mkdirSync(dir, { recursive: true });

const filePath = path.join(dir, 'page.tsx');
fs.writeFileSync(filePath, content, 'utf8');

console.log('OK:', filePath);
