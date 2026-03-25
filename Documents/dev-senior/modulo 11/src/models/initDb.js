// Inicialización y datos de ejemplo para la base de datos
module.exports = async function initDB(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insertar datos iniciales si la tabla está vacía
  const res = await client.query("SELECT COUNT(*) AS total FROM users");
  if (res.rows[0].total === 0) {
    await client.query(`
      INSERT INTO users (name, email) VALUES
        ('Juan Pérez', 'juan.perez@email.com'),
        ('María García', 'maria.garcia@email.com'),
        ('Carlos López', 'carlos.lopez@email.com'),
        ('Ana Martínez', 'ana.martinez@email.com'),
        ('Luis Rodríguez', 'luis.rodriguez@email.com')
    `);
    console.log("Datos iniciales insertados (5 usuarios)");
  }

  console.log("Base de datos inicializada correctamente");
};
