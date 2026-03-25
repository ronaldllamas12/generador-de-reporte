const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const db = require("./db");
const initDb = require("./models/initDb");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Swagger config
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Módulo 11 - API de Usuarios",
      version: "1.0.0",
      description: "Backend Node.js con Express y PostgreSQL",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: [__filename],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirigir raíz a Swagger
app.get("/", (req, res) => res.redirect("/api-docs"));

async function initDB() {
  const client = await db.connectDB();
  app.locals.userModel = createUserModel(client);
  app.locals.userController = createUserController(app.locals.userModel);
  await initDb(client);
}

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check del servidor
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor y DB funcionando
 *       500:
 *         description: Error de conexión
 */
app.get("/health", async (req, res) => {
  try {
    const client = db.getClient();
    await client.query("SELECT 1 AS status");
    res.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", db: "disconnected", message: err.message });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
app.get("/api/users", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Crear un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pedro Sánchez
 *               email:
 *                 type: string
 *                 example: pedro@email.com
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Datos faltantes
 *       409:
 *         description: Email duplicado
 */
app.post("/api/users", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "name y email son requeridos" });
  }
  try {
    const result = await client.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
      [name, email],
    );
    res.status(201).json({ id: result.rows[0].id, name, email });
  } catch (err) {
    if (err.code === "23505") {
      // unique_violation
      return res.status(409).json({ error: "El email ya existe" });
    }
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos del usuario
 *       404:
 *         description: Usuario no encontrado
 */
app.get("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const result = await client.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar usuario por ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario eliminado
 *       404:
 *         description: Usuario no encontrado
 */
app.delete("/api/users/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "ID inválido" });
  }
  try {
    const result = await client.query("DELETE FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Usar rutas de usuario
app.use("/api/users", (req, res, next) => {
  if (!app.locals.userController) {
    return res.status(500).json({ error: "Controlador no inicializado" });
  }
  return createUserRoutes(app.locals.userController)(req, res, next);
});

async function waitForDB(retries = 15, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const testClient = new Client(dbConfig);
      await testClient.connect();
      await testClient.end();
      console.log("Conexión a PostgreSQL establecida");
      return;
    } catch (err) {
      console.log(`Esperando PostgreSQL... intento ${i}/${retries}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(
    "No se pudo conectar a PostgreSQL después de varios intentos",
  );
}

async function start() {
  try {
    await waitForDB();
    await initDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error al iniciar:", err.message);
    process.exit(1);
  }
}

start();

module.exports = app;
