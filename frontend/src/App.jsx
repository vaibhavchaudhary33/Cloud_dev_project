import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

// Works on localhost AND in GitHub Codespaces (ports become <name>-<port>.app.github.dev)
const isCodespace = window.location.hostname.endsWith(".app.github.dev");
function urlFor(port, kind = "http") {
  if (isCodespace) {
    const host = window.location.hostname.replace(/-\d+\.app\.github\.dev$/, `-${port}.app.github.dev`);
    return `${kind === "ws" ? "wss" : "https"}://${host}`;
  }
  return `${kind === "ws" ? "ws" : "http"}://localhost:${port}`;
}
const API = import.meta.env.VITE_API_URL || urlFor(5000);
const WS = import.meta.env.VITE_WS_URL || urlFor(8080, "ws");

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [deployments, setDeployments] = useState([]);
  const [logs, setLogs] = useState("");
  const [currentPort, setCurrentPort] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDeployments = async () => {
    try {
      const res = await axios.get(`${API}/deployments`);
      setDeployments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // live logs over WebSocket
  useEffect(() => {
    const ws = new WebSocket(WS);
    ws.onmessage = (event) => {
      const msg = event.data;
      setLogs((prev) => prev + msg);
      const m = msg.match(/APP_RUNNING:(\d+)/);
      if (m) setCurrentPort(m[1]);
    };
    return () => ws.close();
  }, []);

  // initial load + poll every 2s
  useEffect(() => {
    fetchDeployments();
    const t = setInterval(fetchDeployments, 2000);
    return () => clearInterval(t);
  }, []);

  const deploy = async () => {
    if (!repoUrl) return;
    setLoading(true);
    setLogs("Starting deployment...\n");
    try {
      await axios.post(`${API}/deploy`, { repoUrl });
      setRepoUrl("");
    } catch (err) {
      alert("Deployment failed: check the repository URL");
    }
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h1 className="title">CloudDev</h1>
          <p className="subtitle">Deploy any GitHub repository instantly</p>
        </div>

        <div className="input-group">
          <input
            className="input"
            placeholder="https://github.com/user/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
          <button className="button" onClick={deploy}>
            {loading ? "Deploying..." : "Deploy"}
          </button>
        </div>

        <div className="grid">
          <div className="card">
            <div className="card-title">Deployments</div>
            {deployments.map((d) => (
              <div key={d.id} className="row">
                <span>{d.id}</span>
                <span className="repo">{d.repo_url}</span>
                <span className={d.status === "success" ? "success" : d.status === "building" ? "building" : "failed"}>
                  {d.status}
                </span>
                <span>
                  {d.status === "success" && currentPort ? (
                    <a href={urlFor(currentPort)} target="_blank" rel="noreferrer" className="link">
                      Open
                    </a>
                  ) : (
                    "-"
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Logs</div>
            <pre className="logs">{logs || "No logs yet"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
