const git = require("simple-git")();
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const log = (msg) => console.log(msg);

async function deploy(repoUrl) {
  const projectPath = path.join(__dirname, "temp-repo");

  try {
    // 1. clean previous clone
    fs.rmSync(projectPath, { recursive: true, force: true });

    // 2. clone
    log("Cloning repository...");
    await git.clone(repoUrl, projectPath);

    // 3. generate Dockerfile (Node.js projects)
    const dockerfile = `FROM node:18
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
`;
    fs.writeFileSync(path.join(projectPath, "Dockerfile"), dockerfile);

    // 4. build image
    log("Building Docker image...");
    execFileSync("docker", ["build", "-t", "clouddev-app", projectPath], { stdio: "inherit" });

    // 5. run on a random host port (3000-3999)
    const port = 3000 + Math.floor(Math.random() * 1000);
    log("Starting container...");
    execFileSync("docker", ["run", "-d", "-p", `${port}:3000`, "clouddev-app"], { stdio: "inherit" });

    log("Deployment completed");
    log(`APP_RUNNING:${port}`);
    process.exit(0);
  } catch (err) {
    log("Deployment failed: " + err.message);
    process.exit(1);
  }
}

const repoUrl = process.argv[2];
if (!repoUrl) {
  log("Repo URL missing");
  process.exit(1);
}
deploy(repoUrl);
