const { Client } = require("pg");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "admin",
  database: process.env.DB_NAME || "modulo11db",
};

let client;

async function connectDB() {
  if (!client) {
    client = new Client(dbConfig);
    await client.connect();
  }
  return client;
}

module.exports = {
  connectDB,
  getClient: () => client,
  dbConfig,
};
