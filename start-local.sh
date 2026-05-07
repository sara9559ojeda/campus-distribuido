#!/bin/bash
# campus-alert/start-local.sh
# Inicia todos los microservicios localmente (requiere Node.js y MQTT broker corriendo)
# Para el broker: docker run -d -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2.0

set -e

echo "=== CampusAlert — Iniciando servicios locales ==="
echo ""

# Instalar dependencias si no existen
for svc in api-gateway incident-service notification-service analytics-service; do
  if [ ! -d "$svc/node_modules" ]; then
    echo "📦 Instalando dependencias: $svc"
    (cd "$svc" && npm install)
  fi
done

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Instalando dependencias: frontend"
  (cd frontend && npm install)
fi

echo ""
echo "🚀 Iniciando servicios..."

# Función para matar todos los procesos al salir
cleanup() {
  echo ""
  echo "🛑 Deteniendo todos los servicios..."
  kill $GATEWAY_PID $INCIDENT_PID $NOTIF_PID $ANALYTICS_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# Iniciar cada servicio
(cd api-gateway && node index.js) &
GATEWAY_PID=$!
echo "✅ API Gateway        → http://localhost:3001  (PID: $GATEWAY_PID)"

sleep 0.5

(cd incident-service && node index.js) &
INCIDENT_PID=$!
echo "✅ Incident Service   → http://localhost:3002  (PID: $INCIDENT_PID)"

(cd notification-service && node index.js) &
NOTIF_PID=$!
echo "✅ Notification Svc   → http://localhost:3003  (PID: $NOTIF_PID)"

(cd analytics-service && node index.js) &
ANALYTICS_PID=$!
echo "✅ Analytics Service  → http://localhost:3004  (PID: $ANALYTICS_PID)"

sleep 1

(cd frontend && npm run dev) &
FRONTEND_PID=$!
echo "✅ Frontend (React)   → http://localhost:5173  (PID: $FRONTEND_PID)"

echo ""
echo "=== Sistema activo. Ctrl+C para detener todo ==="
echo ""

wait
