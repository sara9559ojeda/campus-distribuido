# CampusAlert — Guía de instalación y ejecución

Plataforma distribuida de emergencias universitarias con analítica predictiva.  
Stack: React + Vite · TailwindCSS · Framer Motion · Recharts · Node.js · MQTT · WebSockets · Docker

---

## Prerequisitos

| Herramienta | Versión mínima | Para qué se usa |
|-------------|---------------|-----------------|
| Node.js     | >= 18         | Todos los servicios y el frontend |
| npm         | >= 9          | Gestor de paquetes |
| Docker      | >= 24         | Broker MQTT (Mosquitto) |
| Docker Compose | >= 2.20    | Opción de arranque completo |

> **Windows:** usa PowerShell o Git Bash para los comandos de shell.

---

## Estructura del proyecto

```
campus-alert/
├── api-gateway/          → Express :3001  — proxy + rate limiting
├── incident-service/     → Express :3002  — almacena y publica MQTT
├── notification-service/ → Express :3003  — WebSocket broker
├── analytics-service/    → Express :3004  — estadísticas en memoria
├── frontend/             → React + Vite :5173 — plataforma de monitoreo
├── docker-compose.yml    → orquestación de todos los servicios
├── mosquitto.conf        → configuración del broker MQTT
└── start-local.sh        → script para arranque local en Unix/Mac
```

---

## Opción A — Docker Compose (recomendada, todo en contenedores)

Levanta el broker MQTT y los 4 microservicios en contenedores.  
El frontend corre fuera de Docker porque usa HMR (hot reload).

```bash
# 1. Desde la raíz del proyecto
docker-compose up --build

# 2. En otra terminal — instalar y arrancar el frontend
cd frontend
npm install
npm run dev
```

Abre el navegador en **http://localhost:5173**

Para detener todo:
```bash
# Ctrl+C en la terminal del frontend
# Luego:
docker-compose down
```

---

## Opción B — Solo MQTT en Docker, servicios en local (más rápido para desarrollo)

```bash
# 1. Arrancar el broker MQTT
docker run -d \
  --name campus-mqtt \
  -p 1883:1883 \
  -p 9001:9001 \
  -v "$(pwd)/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  eclipse-mosquitto:2.0

# 2. Arrancar todos los servicios de una vez (Unix / Git Bash)
chmod +x start-local.sh
./start-local.sh
```

El script `start-local.sh` instala dependencias automáticamente si no existen,  
luego levanta los 4 microservicios y el frontend en procesos paralelos.  
**Ctrl+C** detiene todo junto.

---

## Opción C — Manual, una terminal por servicio

Útil para ver los logs de cada servicio por separado.

```bash
# Terminal 1 — MQTT Broker
docker run -d \
  --name campus-mqtt \
  -p 1883:1883 \
  -p 9001:9001 \
  -v "$(pwd)/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  eclipse-mosquitto:2.0

# Terminal 2 — API Gateway
cd api-gateway
npm install
node index.js

# Terminal 3 — Incident Service
cd incident-service
npm install
node index.js

# Terminal 4 — Notification Service
cd notification-service
npm install
node index.js

# Terminal 5 — Analytics Service
cd analytics-service
npm install
node index.js

# Terminal 6 — Frontend
cd frontend
npm install
npm run dev
```

---

## Opción D — Solo el frontend (sin backend)

Si solo quieres explorar la interfaz sin datos reales:

```bash
cd frontend
npm install
npm run dev
```

La UI carga, el WebSocket intenta reconectarse cada 3 segundos y los paneles muestran estado vacío. No hay errores de consola fatales.

---

## Variables de entorno del frontend

El frontend usa un archivo `.env` que ya está creado.  
Si necesitas cambiar puertos o URLs, edita `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3003/ws
VITE_MQTT_HOST=localhost
VITE_MQTT_PORT=1883
VITE_ANALYTICS_INTERVAL=10000
VITE_HEALTH_INTERVAL=10000
```

El archivo plantilla está en `frontend/.env.example`.

---

## URLs después del arranque

| Servicio             | URL                           | Descripción                     |
|----------------------|-------------------------------|---------------------------------|
| Frontend             | http://localhost:5173         | Plataforma principal            |
| Dashboard            | http://localhost:5173/        | Panel general                   |
| Incident Management  | http://localhost:5173/incidents | Gestión de incidentes          |
| Predictive Analytics | http://localhost:5173/analytics | Analítica predictiva           |
| System Monitoring    | http://localhost:5173/monitoring | Estado de microservicios      |
| Live Alerts Center   | http://localhost:5173/alerts  | Feed en tiempo real             |
| API Gateway          | http://localhost:3001/health  | Health check gateway            |
| Incident Service     | http://localhost:3002/health  | Health check incidentes         |
| Notification Service | http://localhost:3003/health  | Health check notificaciones     |
| Analytics Service    | http://localhost:3004/health  | Health check analítica          |

---

## Páginas del frontend

### 1. Dashboard General `/`
Panel principal con todos los componentes originales más 6 tarjetas de métricas en tiempo real:
- Total de alertas recibidas por WebSocket
- Conteo de incidentes por severidad (CRITICAL / HIGH / MEDIUM)
- Actividad MQTT (tópicos activos)
- Estado del WebSocket
- Formulario de reporte de incidente
- Feed en vivo, registro histórico, analytics y estado de microservicios

### 2. Incident Management `/incidents`
- Tabla completa de incidentes (hasta 100 registros)
- Búsqueda por descripción, ubicación, reportero o ID
- Filtros por severidad, estado y zona
- Ordenamiento por cualquier columna
- Los incidentes nuevos se resaltan en azul al llegar por WebSocket
- Modal de detalle con actualización de estado (ACTIVE → INVESTIGATING → RESOLVED)

### 3. Predictive Analytics `/analytics`
Analítica basada en reglas y estadísticas (sin ML):

**Fórmula de Risk Score:**
```
riskScore = (CRITICAL × 5) + (HIGH × 3) + (MEDIUM × 2) + (LOW × 1)
Normalizado a 0–100

LOW:      0 – 25
MEDIUM:  26 – 50
HIGH:    51 – 75
CRITICAL: 76 – 100
```

Incluye:
- Gauge circular con el risk score global del campus
- Alertas predictivas automáticas (ej: "High probability of incident escalation")
- Detección de tendencia: compara la primera mitad vs segunda mitad del buffer de notificaciones
- Heat zones: tarjetas por zona ordenadas por risk score
- Gráfica de área por hora (últimas 12 horas)
- Pie chart de distribución por severidad
- Bar chart de incidentes por zona

### 4. System Monitoring `/monitoring`
- Tarjetas de health check para cada microservicio (latencia, uptime, métricas específicas)
- Polling automático cada 10 segundos
- Gráfica de historial de latencia
- Gráfica de servicios UP vs DOWN en el tiempo
- Mapa de arquitectura: todos los componentes del sistema con sus roles y puertos

### 5. Live Alerts Center `/alerts`
- Feed en tiempo real ordenado por prioridad (CRITICAL primero)
- Cola de prioridad para incidentes CRÍTICOS con opción de descartar
- Contadores por severidad en tiempo real
- Filtro por severidad en el feed
- Sonido de alerta para incidentes CRITICAL (requiere clic previo en el botón de sonido)
- Las alertas se animan al entrar con Framer Motion

---

## Endpoints de la API

Todos van por el API Gateway en el puerto **3001**.

### Health checks
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

### Incidentes
```bash
# Listar (con filtros opcionales)
curl "http://localhost:3001/api/incidents"
curl "http://localhost:3001/api/incidents?severity=HIGH&limit=10"

# Crear
curl -X POST http://localhost:3001/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Persona herida en pasillo",
    "location": "Edificio A",
    "severity": "HIGH",
    "reportedBy": "estudiante-001"
  }'

# Actualizar estado
curl -X PATCH http://localhost:3001/api/incidents/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "RESOLVED"}'
```

Valores válidos para `severity`: `LOW` `MEDIUM` `HIGH` `CRITICAL`  
Valores válidos para `status`: `ACTIVE` `INVESTIGATING` `RESOLVED`

### Analytics
```bash
curl http://localhost:3001/api/analytics
curl http://localhost:3001/api/analytics/zones
```

---

## Verificar que MQTT está funcionando

```bash
# Suscribirse a todos los tópicos de incidentes (requiere mosquitto_sub instalado)
mosquitto_sub -h localhost -p 1883 -t "campus/incidents/#" -v

# Publicar un incidente de prueba manualmente
mosquitto_pub -h localhost -p 1883 \
  -t "campus/incidents/HIGH" \
  -m '{"id":"test-001","description":"Prueba MQTT","location":"Edificio B","severity":"HIGH"}'
```

---

## Pruebas de carga con jMeter

### Configuración básica del Test Plan

1. **Thread Group**
   - Number of Threads: `50`
   - Ramp-Up: `10` segundos
   - Loop Count: `10`
   - Total estimado: ~1000 requests

2. **HTTP Request Defaults**
   - Server: `localhost`
   - Port: `3001`
   - Protocol: `http`

3. **HTTP Header Manager** (para todos los POST)
   - `Content-Type: application/json`

4. **Requests a incluir**

   | Request | Método | Path |
   |---------|--------|------|
   | Health Check | GET | `/health` |
   | Listar incidentes | GET | `/api/incidents` |
   | Crear incidente | POST | `/api/incidents` |
   | Analytics | GET | `/api/analytics` |

5. **Body para POST crear incidente:**
   ```json
   {
     "description": "Incidente jMeter #${__counter(false)}",
     "location": "Edificio A",
     "severity": "${__RandomFromMultipleVars(LOW|MEDIUM|HIGH|CRITICAL,)}",
     "reportedBy": "jmeter-${__threadNum}"
   }
   ```

6. **Listeners recomendados**
   - View Results Tree
   - Summary Report
   - Aggregate Report
   - Response Time Graph

### Escenarios

| Escenario | Usuarios | Ramp-Up | Duración |
|-----------|----------|---------|----------|
| Baseline  | 10       | 5s      | 30s      |
| Normal    | 50       | 10s     | 60s      |
| Estrés    | 100      | 20s     | 120s     |
| Pico      | 200      | 5s      | 30s      |

---

## Troubleshooting

### El frontend no conecta con la API
```bash
# Verificar que el API Gateway está corriendo
curl http://localhost:3001/health

# Si retorna error de conexión, el servicio no está arriba
# Revisar que no haya otro proceso usando el puerto
# Windows:
netstat -ano | findstr :3001
```

### El WebSocket no se conecta (OFFLINE en la UI)
```bash
# Verificar que la Notification Service está corriendo
curl http://localhost:3003/health

# El WebSocket está en ws://localhost:3003/ws
# Probar con wscat si está instalado:
npx wscat -c ws://localhost:3003/ws
```

### El MQTT no propaga eventos
```bash
# Verificar que el broker está corriendo
docker ps | grep mosquitto

# Si no aparece, volver a levantar el broker:
docker run -d --name campus-mqtt \
  -p 1883:1883 -p 9001:9001 \
  -v "$(pwd)/mosquitto.conf:/mosquitto/config/mosquitto.conf" \
  eclipse-mosquitto:2.0
```

### Los gráficos de Predictive Analytics están vacíos
Los gráficos de área (timeline) se alimentan del buffer de notificaciones WebSocket.  
Si los servicios acaban de arrancar, el buffer está vacío.  
Solución: crear algunos incidentes desde el formulario del Dashboard o con curl, luego los gráficos se actualizan en tiempo real.

### Puerto ya en uso
```bash
# Windows — encontrar qué proceso usa el puerto (ej: 3001)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Unix/Mac
lsof -ti:3001 | xargs kill
```

### Error "ECONNREFUSED" en los health checks del frontend
Normal si algún servicio está caído. La tarjeta de ese servicio muestra **DOWN** en rojo. No afecta el funcionamiento del resto de la plataforma.

---

## Build de producción del frontend

```bash
cd frontend
npm run build
# Los archivos estáticos quedan en frontend/dist/
# Para previsualizarlos:
npm run preview
```

---

## Stack completo

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend UI | React | 18.2 |
| Bundler | Vite | 5.1 |
| Estilos | TailwindCSS | 3.4 |
| Animaciones | Framer Motion | última |
| Gráficas | Recharts | última |
| Routing | React Router | v6 |
| Iconos | Lucide React | 0.363 |
| Notificaciones toast | react-hot-toast | 2.4 |
| API Gateway | Express + axios | Node 20 |
| Microservicios | Express | Node 20 |
| Mensajería | MQTT (Mosquitto) | 2.0 |
| WebSockets | ws library | — |
| Contenedores | Docker + Compose | — |

---

## Autora

**Sara Ojeda**  
Curso: Pruebas de Software  
Caso de estudio: Sistema distribuido de emergencias universitarias
