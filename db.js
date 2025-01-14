const { Pool } = require('pg');
require('dotenv').config();  // Cargar variables del archivo .env

// Conexión usando la URL completa de la base de datos
const pool = new Pool({
  connectionString: "postgresql://postgres:VEyoLInxbimjnBPLGqjscRVrGSciHpVM@monorail.proxy.rlwy.net:51553/railway",  // La URL que proporcionaste
  ssl: {
    rejectUnauthorized: false,  // Si es necesario para Railway
  },
});

// Verificar conexión
async function verifyConnection() {
  try {
    const client = await pool.connect();
    console.log('Conexión exitosa a la base de datos.');
    client.release();
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
  }
}

module.exports = { verifyConnection, pool };


