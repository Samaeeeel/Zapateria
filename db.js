const { Pool } = require('pg');

// Configuración de conexión
const pool = new Pool({
  user: 'postgres', // Usuario de PostgreSQL
  host: 'localhost', // Host de la base de datos
  database: 'cosedora_calzado', // Nombre de tu base de datos
  password: 'Ltic24', // Contraseña de PostgreSQL
  port: 5432, // Puerto predeterminado de PostgreSQL
});

pool.connect((err, client, release) => {
    if (err) {
      console.error('Error al conectar a la base de datos:', err.stack);
    } else {
      console.log('Conexión exitosa a la base de datos');
    }
    release();
  });

module.exports = pool;
