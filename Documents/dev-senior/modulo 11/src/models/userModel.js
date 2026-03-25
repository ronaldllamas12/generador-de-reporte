const { Client } = require("pg");

// Recibe un cliente de PG ya conectado
module.exports = (client) => ({
  async getAll() {
    const result = await client.query(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    return result.rows;
  },
  async getById(id) {
    const result = await client.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  },
  async create(name, email) {
    const result = await client.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
      [name, email],
    );
    return result.rows[0];
  },
  async delete(id) {
    const result = await client.query("DELETE FROM users WHERE id = $1", [id]);
    return result.rowCount;
  },
});
