// Controlador de usuarios
module.exports = (userModel) => ({
  async getAll(req, res) {
    try {
      const users = await userModel.getAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async getById(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    try {
      const user = await userModel.getById(id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async create(req, res) {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name y email son requeridos" });
    }
    try {
      const user = await userModel.create(name, email);
      res.status(201).json({ id: user.id, name, email });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "El email ya existe" });
      }
      res.status(500).json({ error: err.message });
    }
  },
  async delete(req, res) {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }
    try {
      const deleted = await userModel.delete(id);
      if (deleted === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json({ message: "Usuario eliminado" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
});
