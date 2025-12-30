require('dotenv').config();  // Carga el .env

const { defineConfig } = require('@prisma/cli');

module.exports = defineConfig({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});