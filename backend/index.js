const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");
const pool = require("./db");

const { spawn } = require("child_process");
const path = require("path");

// -------------------------------
// WebSocket (LIVE LOGS) on :8080
// -------------------------------
const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 });

let clients = [];

wss.on("connection", (ws) => {
  clients.push(ws);
  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
  });
});

function broadcast(message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
}

// -------------------------------
// CORS
// -------------------------------
fastify.register(cors, { origin: true });

// -------------------------------
// HEALTH
// -------------------------------
fastify.get("/", async () => ({ status: "Backend running" }));

// -------------------------------
// DEPLOY
// -------------------------------
fastify.post(
  "/deploy",
  {
    schema: {
      body: {
        type: "object",
        required: ["repoUrl"],
        properties: {
          // only plain https GitHub URLs: blocks option/command injection
          repoUrl: { type: "string", pattern: "^https://github\\.com/[\\w.-]+/[\\w.-]+/?$" },
        },
      },
    },
  },
  async (request) => {
    const { repoUrl } = request.body;

    const result = await pool.query(
      "INSERT INTO deployments(repo_url, status) VALUES($1,$2) RETURNING *",
      [repoUrl, "building"]
    );
    const deployment = result.rows[0];

    const workerPath = path.join(__dirname, "../worker/deploy.js");
    const worker = spawn("node", [workerPath, repoUrl]);

    // stream logs to every connected browser
    worker.stdout.on("data", (d) => {
      const msg = d.toString();
      console.log(msg);
      broadcast(msg);
    });
    worker.stderr.on("data", (d) => {
      const msg = d.toString();
      console.error(msg);
      broadcast(msg);
    });

    // update status when the worker exits
    worker.on("close", async (code) => {
      const status = code === 0 ? "success" : "failed";
      await pool.query("UPDATE deployments SET status=$1 WHERE id=$2", [status, deployment.id]);
      broadcast(`STATUS:${status}`);
    });

    return deployment;
  }
);

// -------------------------------
// DEPLOYMENTS LIST
// -------------------------------
fastify.get("/deployments", async () => {
  const result = await pool.query("SELECT * FROM deployments ORDER BY created_at DESC");
  return result.rows;
});

// -------------------------------
// START
// -------------------------------
fastify.listen({ port: 5000, host: "0.0.0.0" }, (err) => {
  if (err) throw err;
  console.log("Backend running on port 5000");
});
