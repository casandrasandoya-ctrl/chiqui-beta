const fs = require('fs');
const path = require('path');

const content = `export default function EliminarCuentaPage() {
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
            fontSize: 28,
            color: '#8C572F',
            marginBottom: 8,
          }}
        >
          Eliminación de cuenta
        </h1>
        <p style={{ fontWeight: 600, marginBottom: 24, color: '#CD7421' }}>
          CHIQUI Entre Señales
        </p>

        <p style={{ lineHeight: 1.6, marginBottom: 20 }}>
          Para solicitar la eliminación de tu cuenta y de los datos asociados en
          CHIQUI Entre Señales, envía un correo a:
        </p>

        <p
          style={{
            backgroundColor: '#F5EDE3',
            borderRadius: 12,
            padding: '12px 16px',
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          chiquientresenales@gmail.com
        </p>

        <p style={{ lineHeight: 1.6, marginBottom: 20 }}>
          Incluye el asunto <strong>"Eliminar mi cuenta"</strong> y envíalo desde el
          mismo correo con el que te registraste en la app.
        </p>

        <p style={{ lineHeight: 1.6, marginBottom: 28 }}>
          Procesaremos tu solicitud dentro de los siguientes 30 días.
        </p>

        <h2
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: '#8C572F',
            marginBottom: 10,
          }}
        >
          Qué se elimina
        </h2>
        <ul style={{ lineHeight: 1.7, marginBottom: 24, paddingLeft: 20 }}>
          <li>Tu perfil de usuario y datos de acceso</li>
          <li>Todos los perfiles de mascotas asociados a tu cuenta</li>
          <li>
            Registros diarios, vacunas, antiparasitarios, medicamentos,
            observaciones, historial de peso y demás datos de salud registrados
          </li>
          <li>Fotos de mascotas subidas</li>
        </ul>

        <h2
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: '#8C572F',
            marginBottom: 10,
          }}
        >
          Qué se puede conservar
        </h2>
        <ul style={{ lineHeight: 1.7, marginBottom: 28, paddingLeft: 20 }}>
          <li>
            Información necesaria para cumplir obligaciones legales o contables,
            cuando corresponda, por el tiempo que exija la ley
          </li>
        </ul>

        <p style={{ lineHeight: 1.6, color: '#3D2B1F' }}>
          Si tienes dudas sobre este proceso, escríbenos al correo indicado
          arriba.
        </p>
      </div>
    </div>
  );
}
`;

const dir = path.join('app', 'eliminar-cuenta');
fs.mkdirSync(dir, { recursive: true });

const filePath = path.join(dir, 'page.tsx');
fs.writeFileSync(filePath, content, 'utf8');

console.log('OK:', filePath);
