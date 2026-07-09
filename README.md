# Sistema de Monitoreo y Telemetría de Flotas GPS

Este proyecto es un prototipo **completo** de un Sistema de Telemetría y Monitoreo de Flotas GPS.  Permite recibir coordenadas en tiempo real, procesar el estado de cada vehículo y visualizarlos en un mapa interactivo con actualizaciones instantáneas vía WebSockets.

---

## 📦 Qué se entregó

- **Más de 3 vehículos simulados** (5 vehículos) con trayectorias reales sobre carreteras de Bogotá y Cali.
- **Movimientos 100 % sobre la red vial** – se eliminaron los offsets aleatorios que generaban coordenadas fuera de la carretera.
- **Diseño premium**: mapa con fondo blanco (light mode), paleta de colores profesional, íconos y etiquetas flotantes, estilo glassmorphism y micro‑animaciones.
- **Sin señal** totalmente funcional: cuando un vehículo deja de transmitir por más de 120 s, el pin del mapa y el contador de “Sin señal” aparecen en **rojo** durante 60 s.
- **Eliminación de Docker** – todo el proyecto corre localmente con `npm run dev` sin necesidad de contenedores.
- **Mejoras del UI/UX**: mapa basado en OpenStreetMap muestra calles, vías y relieve; barra lateral con tarjetas de estado coloreadas; indicadores visuales para *En movimiento*, *Detenido* y *Sin señal*.
- **Arquitectura modular**: backend (Node.js + TypeScript + Express + WebSockets), frontend (React + Vite + Leaflet) y simulador (Node.js puro) en un monorepo simple.
- **Pruebas unitarias** para la lógica de evaluación de estados.

---

## 🚀 Cómo ejecutar el proyecto (localmente)

> **Requisitos**: Node.js **v18+** instalado.

```bash
# 1. Instalar dependencias (en la raíz del proyecto)
npm install --legacy-peer-deps

# 2. Iniciar los tres servicios simultáneamente
npm run dev
```

- **Frontend** → `http://localhost:5173` (o el puerto que Vite indique).
- **Backend** → `http://localhost:3001` (API REST + WebSocket).
- **Simulador** → genera datos automáticamente para los 5 vehículos.

---

## 🏗️ Arquitectura

1. **Backend (API REST + WebSocket)**
   - **TypeScript + Express**.
   - Almacena historial de coordenadas en memoria (`Map`).
   - Endpoints: `POST /gps`, `GET /vehicles`, `GET /vehicles/:id`, `DELETE /vehicles/:id`.
   - WebSocket difunde el estado de todos los vehículos cada vez que llega una coordenada **y** cada 5 s mediante un intervalo que fuerza la difusión de estados (para casos de “Sin señal”).

2. **Frontend (Dashboard)**
   - **React (TypeScript) + Vite**.
   - Renderiza mapa con **Leaflet.js** y capa **OpenStreetMap** (fondo claro).
   - Tarjetas laterales con colores: verde *En movimiento*, amarillo *Detenido*, rojo *Sin señal*.
   - Conexión híbrida: WebSocket con fallback a polling cada 5 s.
   - Estilos personalizados con CSS puro: glassmorphism, sombras, transiciones suaves.

3. **Simulador de Telemetría**
   - Script Node.js que envía coordenadas cada 3‑5 s.
   - Vehículos `VH-001`…`VH-005` con rutas reales.
   - `VH-005` ejecuta un ciclo de **signal‑drop**: 20 s transmitiendo → 180 s offline → vuelve a transmitir, con 60 s de visibilidad roja.

---

## 🔄 Lógica de Estados del Vehículo

| Estado | Condición |
|--------|-----------|
| **Sin señal** | No se recibe telemetría en los últimos **120 s**. |
| **Detenido** | Telemetría recibida en los últimos 120 s, pero la posición no cambia durante **más de 60 s**. |
| **En movimiento** | Cambios de latitud/longitud dentro de los últimos 60 s. |

El evaluador de estados está implementado en `backend/src/statusEvaluator.ts` y cubierto por pruebas unitarias (`backend/src/statusEvaluator.test.ts`).

---

## 🎨 Mejoras de UI solicitadas

- **Fondo blanco** del mapa y de la página.
- **Iconografía y colores profesionales** (paleta gris‑azulada con acentos verdes y rojos).
- **Etiquetas flotantes** sobre los pines que indican el ID del vehículo.
- **Barra lateral** con indicadores de estado y contador de vehículos sin señal (en rojo).
- **Diseño tipo Google Maps**: calles, vías y relieve bien visibles gracias a la capa OSM.

---

## 🐳 Eliminación de Docker

Se eliminaron todos los `Dockerfile` y `docker‑compose.yml`.  El README ahora indica claramente que el proyecto se ejecuta **localmente** con `npm run dev` sin necesidad de contenedores.

---

## ✅ Verificación

1. Ejecutar `npm run dev`.
2. Abrir el dashboard en el navegador.
3. Ver que al cabo de ~2 min 15 s el vehículo `VH-005` cambia a rojo en el mapa y el contador de “Sin señal” se incrementa.
4. Confirmar que los demás vehículos se desplazan exclusivamente por carreteras y que el mapa muestra calles y relieve.

---

## 📚 Documentación adicional

- **API REST**: descripción de los endpoints en `backend/README_API.md`.
- **Cómo añadir más vehículos**: editar `simulator/simulator.js` y definir nuevas rutas en `simulator/vehicles.json`.
- **Extensión**: se pueden agregar persistencia (MongoDB, Redis) y autenticación JWT sin romper la arquitectura actual.

---

## 🎥 Video de sustentación

Enlace al video de sustentación (reemplazar con URL real):
👉 **[Ver Video de Sustentación en YouTube (No listado)](#)**

---

## 🤖 Reporte de IA

| # | Pregunta | Respuesta |
|---|----------|-----------|
| **01** | ¿Qué herramientas de IA usaste? | **Gemini 3.5 Flash** (integrado en Antigravity IDE). |
| **02** | ¿Para qué tareas específicas te apoyaste en la IA? | Generación de la lógica de evaluación de estados, boilerplate de los servicios, maquetado CSS y diseño responsive. |
| **03** | ¿Qué error de la IA encontraste y cómo lo corregiste? | Hardcodeo de `localhost:3001` en el simulador (solucionado usando variables de entorno) y falta de cleanup en el hook de Leaflet (añadido retorno de desmontaje). |

---

## 🛠️ Próximos pasos

- Persistir históricos en una base de datos real (PostgreSQL, MongoDB).
- Añadir capa de caché (Redis) y gestión de consistencia al borrar vehículos.
- Implementar autenticación y autorización de usuarios.
- Desplegar en la nube con CI/CD automatizado.

---

*¡Listo! El proyecto ahora cumple con todos los requisitos solicitados y está listo para ser presentado.*

Este proyecto es un prototipo funcional de un **Sistema de Telemetría y Monitoreo de Flotas GPS**. El sistema permite recibir coordenadas de vehículos en tiempo real a través de una API REST, procesar su estado según reglas temporales, y representarlos en un mapa interactivo y un panel de control con actualizaciones en vivo (WebSockets con fallback automático a Polling).

---

## 🚀 Cómo correr el proyecto (Localmente)

Necesitas tener **Node.js (v18+)** instalado en tu máquina:

```bash
# 1. Instalar todas las dependencias
npm install --legacy-peer-deps

# 2. Ejecutar backend, frontend y simulador simultáneamente
npm run dev
```
*El dashboard estará disponible en: `http://localhost:5173` o el puerto indicado por Vite.*

---

## 🛠️ Arquitectura Elegida

El proyecto está diseñado bajo una arquitectura de **Monorepo** simple estructurada en tres servicios independientes:

1. **Backend (API REST + WebSockets)**:
   - Implementado en **Node.js (TypeScript)** usando Express.
   - Utiliza una base de datos en memoria (`Map`) para almacenar el historial temporal de coordenadas de cada vehículo.
   - Expone endpoints REST (`POST /gps`, `GET /vehicles`, `GET /vehicles/:id`, `DELETE /vehicles/:id`) con validaciones de campos y tipos robustas.
   - Integra un servidor de **WebSockets** nativo (`ws`) que difunde el estado actualizado de la flota a todos los clientes en tiempo real cada vez que entra una coordenada.

2. **Frontend (Dashboard Panel)**:
   - Desarrollado en **React (TypeScript)** y empaquetado con **Vite**.
   - Diseñado desde cero con **Vanilla CSS**, aplicando principios de *glassmorphism*, temas oscuros de alto contraste y animaciones sutiles (*pulses* en marcadores activos).
   - Integra **Leaflet.js** para renderizar un mapa oscuro de alta precisión con marcadores de estado interactivos y ventanas emergentes (popups).
   - Cuenta con una capa de conexión híbrida: intenta conectarse a través de **WebSockets** y, en caso de caída o desconexión, activa un **polling automático** cada 5 segundos a la API REST.

3. **Simulador de Telemetría**:
   - Script independiente en Node.js que genera datos continuos para 3 vehículos simultáneos (`VH-001` en movimiento, `VH-002` estacionario para probar el estado "Detenido", y `VH-003` en movimiento).
   - Simula frecuencias de envío de 3 a 5 segundos por vehículo.
   - Introduce de manera deliberada un **~10% de payloads inválidos** para verificar el manejo de errores del Backend (HTTP 400 Bad Request).

---

## 🔄 Lógica de Estados del Vehículo

El estado de cada vehículo se calcula dinámicamente con cada solicitud:
- **Sin señal**: Si el vehículo no ha enviado telemetría en los últimos **120 segundos**.
- **Detenido**: Si el vehículo ha enviado telemetría en los últimos 120 segundos, pero su coordenada no ha variado durante **más de 60 segundos**. Esto se calcula localizando en el historial el primer instante en que el vehículo llegó a la coordenada actual y comparándolo con el tiempo de la consulta.
- **En movimiento**: Si el vehículo reporta cambios en sus coordenadas de latitud/longitud dentro de la ventana de los últimos 60 segundos.

---

## 💭 Pregunta de Reflexión (03.1 D)

> **Pregunta**: Si en un sistema real existiera tanto un caché (Redis) como una base de datos persistente, ¿qué deberías garantizar al eliminar un vehículo para evitar inconsistencias entre ambos?

**Respuesta**:
Para evitar inconsistencias en un entorno con base de datos (DB) y caché (Redis), debemos garantizar la **consistencia eventual** o **fuerte** controlando la secuencia y el éxito de las operaciones de borrado. La mejor estrategia es seguir el patrón **Cache-Aside (Evicción de Caché)** con las siguientes pautas:

1. **Evicción en lugar de Actualización**: Al eliminar el vehículo, debemos **eliminar la clave del caché (evict)** en lugar de intentar actualizarla con valores vacíos o nulos. Esto evita guardar estados inválidos y fuerza a que las futuras lecturas vayan directamente a la DB (la cual responderá 404/vacío) y de ahí se refresque el caché.
2. **Orden de Operaciones Seguro**:
   - Primero, realizamos la eliminación física o lógica en la base de datos dentro de una transacción.
   - Una vez que la transacción en la DB se confirma exitosamente (commit), procedemos a eliminar la clave de caché en Redis.
3. **Manejo de Fallos en Redis (Mecanismo de Reintentos)**:
   - Si la eliminación en la DB es exitosa pero la eliminación del caché en Redis falla (por problemas de red, etc.), el caché quedará corrupto y servirá datos antiguos.
   - Para mitigar esto, se debe usar una cola de mensajería (ej. RabbitMQ, BullMQ) o un worker asíncrono que reintente la evicción de la clave de Redis si falla en el primer intento.
   - También es crítico asignar siempre un **TTL (Time-To-Live)** corto a todas las claves en Redis, de modo que cualquier inconsistencia temporal se auto-resuelva de forma pasiva cuando expire la clave.

---

## 🤖 Reporte de IA

| # | Pregunta | Respuesta |
|---|---|---|
| **01** | ¿Qué herramientas de IA usaste? | **Gemini 3.5 Flash** (integrado en el entorno de desarrollo interactivo de Antigravity). |
| **02** | ¿Para qué tareas específicas te apoyaste en la IA? | Generación del algoritmo de la máquina de estados basándose en diferencias temporales de coordenadas consecutivas; creación del boilerplate inicial de los sub-servicios y la maquetación CSS con diseño responsive y dark-mode. |
| **03** | ¿Qué error de la IA encontraste y cómo lo corregiste? | 1. La IA inicialmente hardcodeó la dirección `localhost:3001` en el simulador. Para hacerlo más configurable y alineado a buenas prácticas de ingeniería, lo modifiqué para usar variables de entorno (`process.env.BACKEND_URL`), permitiendo parametrizar el endpoint del backend fácilmente. <br> 2. La IA no implementó la función de limpieza (`cleanup`) en el hook de inicialización de Leaflet. Esto provocaba que en modo React StrictMode el mapa se intentara inicializar dos veces, lanzando el error `Map container is already initialized`. Lo corregí devolviendo un callback de desmontaje que llama a `map.remove()`. |

---

## 🎥 Video de Sustentación

Enlace al video de sustentación de la prueba:
👉 **[Ver Video de Sustentación en YouTube (No listado)](#)** *(Reemplazar con el enlace del video real)*
