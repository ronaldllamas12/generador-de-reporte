const request = require("supertest");
const express = require("express");
const app = require("../index");

// Nota: Si tu app exporta el objeto app, esto funcionará directamente.
// Si no, hay que exportar app desde index.js

describe("Pruebas de endpoints", () => {
  it("GET /health responde 200 y status ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("GET /api/users responde 200 y es array", async () => {
    const response = await request(app).get("/api/users");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
