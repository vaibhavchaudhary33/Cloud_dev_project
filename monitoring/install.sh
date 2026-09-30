#!/usr/bin/env bash
# Installs Prometheus + Grafana into the "monitoring" namespace (Minikube or any cluster)
set -euo pipefail

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install prometheus prometheus-community/prometheus -n monitoring
helm upgrade --install grafana grafana/grafana -n monitoring

echo "Waiting for pods..."
kubectl rollout status deploy/prometheus-server -n monitoring --timeout=300s
kubectl get pods -n monitoring

cat <<'MSG'

Grafana admin password:
  kubectl get secret grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 --decode; echo

Open the UIs (run each in its own terminal):
  kubectl port-forward -n monitoring svc/prometheus-server 9090:80
  kubectl port-forward -n monitoring svc/grafana 3000:80

In Grafana: Connections > Data sources > Prometheus, URL http://prometheus-server.monitoring.svc.cluster.local
Then Dashboards > Import > ID 315 (Kubernetes cluster monitoring via Prometheus).
MSG
