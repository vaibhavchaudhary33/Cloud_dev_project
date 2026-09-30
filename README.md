# CloudDev: Cloud-Native Deployment Platform

Paste a GitHub repo URL. CloudDev clones it, generates a Dockerfile, builds the image,
runs the container on a free host port and streams live logs to the browser.

```
React (Vite) --REST--> Fastify API --spawn--> Worker (git + docker CLI)
      ^                    |  |                        |
      +---- WebSocket :8080 +  +--> PostgreSQL         +--> Docker container (host port 3000-3999)
```

## Layout
| Folder | Purpose |
|---|---|
| `frontend/` | React UI (repo input, deployments table, live logs) |
| `backend/` | Fastify API :5000, WebSocket log server :8080, PostgreSQL access |
| `worker/` | `deploy.js`: clone, Dockerfile, `docker build`, `docker run` |
| `k8s/` | Deployment + NodePort Service (30007) |
| `devops/terraform/` | EC2 + security group on AWS |
| `devops/ansible/` | Installs Docker etc. on the EC2 host |
| `monitoring/` | Helm install of Prometheus + Grafana |

## Run locally
```bash
docker compose up -d db                       # Postgres + schema
cd backend  && npm install && npm start       # API :5000, WS :8080
cd frontend && npm install && npm run dev     # UI  :5173
```
Requirements: Node 18+, Docker, Git. Only `https://github.com/<user>/<repo>` URLs are accepted;
the target repo must be a Node.js app with a `start` script that listens on `process.env.PORT` (3000).

## Cloud
```bash
cd devops/terraform && cp terraform.tfvars.example terraform.tfvars   # set ssh_cidr
terraform init && terraform apply
cd ../ansible && cp inventory.ini.example inventory.ini               # put the IP in
ansible-playbook -i inventory.ini setup.yml
```
Then on the server: `minikube start --driver=docker`, `kubectl apply -f k8s/`, `./monitoring/install.sh`.

## Security notes
Never commit `*.pem`, `*.tfstate` or `.env` (already in `.gitignore`). The worker executes
`npm install` from arbitrary repos on the host: run CloudDev only on a disposable machine.
