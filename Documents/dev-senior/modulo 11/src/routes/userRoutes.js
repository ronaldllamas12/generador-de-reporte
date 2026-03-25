const express = require("express");

module.exports = (userController) => {
  const router = express.Router();

  router.get("/", userController.getAll);
  router.get("/:id", userController.getById);
  router.post("/", userController.create);
  router.delete("/:id", userController.delete);

  return router;
};
