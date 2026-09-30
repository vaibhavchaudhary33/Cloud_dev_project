const { Pool } = require("pg");

// Reads PGUSER, PGPASSWORD, PGHOST, PGDATABASE, PGPORT from the environment.
const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "clouddev",
  password: process.env.PGPASSWORD || "postgres",
  port: Number(process.env.PGPORT) || 5432,
});

module.exports = pool;
