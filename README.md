# 🚨 CampusAlert — Plataforma Distribuida de Emergencias Universitarias

Sistema de reporte y monitoreo de incidentes con arquitectura de microservicios y comunicación asíncrona vía **MQTT**.

---

para levantar 
# 1. MQTT broker
docker run -d --name mosquitto -p 1883:1883 -p 9001:9001 -v %cd%/mosquitto.conf:/mosquitto/config/mosquitto.conf eclipse-mosquitto:2.0

# 2. Servicios (una terminal bash)
chmod +x start-local.sh && ./start-local.sh

# 3. Frontend (otra terminal, ya incluido en start-local.sh)
# abre http://localhost:5173

## Arquitectura del Sistema

```
┌─────────────┐      HTTP       ┌─────────────────┐
│   React UI  │ ─────────────▶  │   API Gateway   │ :3001
│  (Vite)     │                 │   (Express)     │
│  :5173      │◀── WebSocket ── └────────┬────────┘
└─────────────┘   (notif svc)            │ HTTP proxy
                                          │
               ┌──────────────────────────┼──────────────────┐
               │                          │                   │
     ┌─────────▼────────┐      ┌──────────▼───────┐  ┌──────▼──────────┐
     │ Incident Service │      │   Analytics Svc  │  │ Notification Svc│
     │    :3002         │      │     :3004        │  │   :3003 + WS    │
     └─────────┬────────┘      └──────────▲───────┘  └──────▲──────────┘
               │                          │                   │
               │  PUBLISH                 │ SUBSCRIBE         │ SUBSCRIBE
               │  campus/incidents/#      │                   │
               └──────────────┬───────────┘───────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    MQTT Broker      │
                    │  (Mosquitto) :1883  │
                    └─────────────────────┘
```

### Flujo de un incidente:
1. Usuario reporta desde React → POST `/api/incidents`
2. API Gateway lo proxea al **Incident Service**
3. Incident Service lo registra + publica en MQTT topic `campus/incidents/{severity}`
4. **Notification Service** recibe el evento MQTT → broadcast por WebSocket al frontend
5. **Analytics Service** recibe el mismo evento MQTT → actualiza estadísticas en tiempo real
6. El frontend recibe la notificación en vivo y actualiza el dashboard

---

## Prerequisitos

- **Node.js** >= 18
- **Docker** (para el broker MQTT) o Mosquitto instalado localmente
- **Apache jMeter** >= 5.6

---

## Instalación y arranque

### Opción A — Con Docker (recomendado)

```bash
# Iniciar SOLO el broker MQTT con Docker
docker run -d \
  --name campus-mqtt \
  -p 1883:1883 \
  -p 9001:9001 \
  -v $(pwd)/mosquitto.conf:/mosquitto/config/mosquitto.conf \
  eclipse-mosquitto:2.0

# Luego iniciar los servicios Node.js localmente
chmod +x start-local.sh
./start-local.sh
```

### Opción B — Docker Compose completo

```bash
docker-compose up --build
# El frontend NO está en docker-compose, correrlo aparte:
cd frontend && npm install && npm run dev
```

### Opción C — Manual (una terminal por servicio)

```bash
# Terminal 1: MQTT broker
docker run -d -p 1883:1883 eclipse-mosquitto:2.0

# Terminal 2: API Gateway
cd api-gateway && npm install && node index.js

# Terminal 3: Incident Service
cd incident-service && npm install && node index.js

# Terminal 4: Notification Service
cd notification-service && npm install && node index.js

# Terminal 5: Analytics Service
cd analytics-service && npm install && node index.js

# Terminal 6: Frontend
cd frontend && npm install && npm run dev
```

---

## Endpoints para jMeter

### API Gateway (puerto 3001)

| Método | Endpoint              | Descripción                      |
|--------|-----------------------|----------------------------------|
| GET    | /health               | Health check del gateway         |
| GET    | /api/incidents        | Listar todos los incidentes      |
| POST   | /api/incidents        | Crear nuevo incidente            |
| GET    | /api/analytics        | Dashboard analítico              |
| GET    | /api/analytics/zones  | Zonas con más incidentes         |

#### Body para POST /api/incidents (JSON):

```json
{
  "description": "Persona herida en pasillo",
  "location": "Edificio A",
  "severity": "HIGH",
  "reportedBy": "estudiante-001"
}
```

Valores válidos para `severity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

---

## Plan de pruebas jMeter

### Configuración del Test Plan

#### 1. Thread Group (Grupo de usuarios)
- **Number of Threads (users):** 50
- **Ramp-Up Period:** 10 segundos (arranca 5 usuarios/s)
- **Loop Count:** 10 (cada usuario hace 10 iteraciones)
- **Total requests estimadas:** 50 × 10 × 2 = ~1000 requests

#### 2. HTTP Request Defaults
- **Server Name:** `localhost`
- **Port:** `3001`
- **Protocol:** `http`

#### 3. HTTP Header Manager (agregar en todos los requests POST)
- `Content-Type: application/json`

#### 4. Requests HTTP a configurar

**Request 1 — GET Health Check:**
- Method: GET
- Path: `/health`

**Request 2 — GET Listar Incidentes:**
- Method: GET
- Path: `/api/incidents`

**Request 3 — POST Crear Incidente:**
- Method: POST
- Path: `/api/incidents`
- Body:
```json
{
  "description": "Incidente de prueba jMeter #${__counter(false)}",
  "location": "${__RandomFromMultipleVars(loc1|loc2|loc3|loc4,)}",
  "severity": "${__RandomFromMultipleVars(LOW|MEDIUM|HIGH|CRITICAL,)}",
  "reportedBy": "jmeter-user-${__threadNum}"
}
```

**Request 4 — GET Analytics:**
- Method: GET
- Path: `/api/analytics`

#### 5. Listeners a agregar:
- **View Results Tree** — ver request/response individual
- **Summary Report** — métricas agregadas
- **Aggregate Report** — percentiles de tiempo de respuesta
- **Response Time Graph** — gráfica en tiempo real
- **Active Threads Over Time** — concurrencia activa

### Escenarios de prueba recomendados

| Escenario | Usuarios | Ramp-Up | Duración | Objetivo |
|-----------|----------|---------|----------|---------|
| Carga baja | 10 | 5s | 30s | Baseline |
| Carga media | 50 | 10s | 60s | Normal |
| Carga alta | 100 | 20s | 120s | Estrés |
| Pico | 200 | 5s | 30s | Breaking point |

### Métricas a observar
- **Throughput:** requests/segundo sostenidos
- **Average Response Time:** objetivo < 200ms en carga baja
- **90th Percentile:** < 500ms
- **Error Rate:** objetivo < 1%
- **Max Response Time:** detectar outliers

---

## Health checks

```bash
curl http://localhost:3001/health   # API Gateway
curl http://localhost:3002/health   # Incident Service
curl http://localhost:3003/health   # Notification Service
curl http://localhost:3004/health   # Analytics Service
```

---

## Observar MQTT en tiempo real

```bash
# Suscribirse a todos los eventos de incidentes
mosquitto_sub -h localhost -p 1883 -t "campus/incidents/#" -v
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| API Gateway | Node.js + Express |
| Microservicios | Node.js + Express (×3) |
| Mensajería | MQTT  |
| Notificaciones en tiempo real | WebSockets (ws library) |
| Contenerización | Docker + Docker Compose |

---

## Integrantes

- Sara Ojeda

**Curso:** Pruebas de Software  
**Herramienta de prueba:** Apache jMeter  
**Caso de estudio:** Sistema de gestión de emergencias universitarias con arquitectura distribuida
