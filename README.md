# Sistema de Monitoreo y Telemetría de Flotas GPS

Este proyecto es un prototipo **completo** de un Sistema de Telemetría y Monitoreo de Flotas GPS. Permite recibir coordenadas en tiempo real, procesar el estado de cada vehículo y visualizarlos en un mapa interactivo con actualizaciones instantáneas vía WebSockets y fallback automático a HTTP Polling.

---

## 📦 Qué se entregó

- **5 vehículos simulados** simultáneamente con trayectorias reales sobre carreteras de Bogotá y Cali.
- **Movimientos 100% sobre la red vial** – se eliminaron los offsets aleatorios que generaban coordenadas fuera de la carretera.
- **Diseño claro**: mapa con fondo claro (estilo Google Maps), paleta de colores profesional, íconos y etiquetas flotantes de identificación, estilo glassmorphism y micro‑animaciones.
- **Sin señal** totalmente funcional: cuando un vehículo deja de transmitir por más de 120 s, el pin del mapa y el contador de “Sin señal” cambian a **rojo** en tiempo real (gracias al heartbeat activo del servidor).
- **Actualización automática**: canal de comunicación en tiempo real nativo (WebSocket) con un fallback automático a polling HTTP cada 5 segundos si el socket se desconecta.
- **Pruebas unitarias** para la lógica de evaluación de estados.

---

## 🚀 Cómo ejecutar el proyecto (localmente)

> **Requisitos**: Tener instalado **Node.js (v18+)** en la máquina.

```bash
# 1. Instalar dependencias (en la raíz del proyecto)
npm install --legacy-peer-deps

# 2. Iniciar todos los servicios (backend, frontend y simulador) simultáneamente
npm run dev
```

* **Frontend** → `http://localhost:5173` (Panel de Control)
* **Backend** → `http://localhost:3001` (API REST + WebSocket)
* **Simulador** → Inicia de forma autónoma transmitiendo las coordenadas del archivo JSON.

---

## 🧪 Pruebas unitarias

```bash
npm run test:backend


---

## 🏗️ Arquitectura 

1. **Backend (Node.js + TypeScript + Express + WebSockets)**
   - Almacena el historial temporal de telemetría de cada vehículo en un `Map` en memoria (con un límite de 100 coordenadas para evitar fugas de memoria).
   - Expone endpoints REST (`POST /gps`, `GET /vehicles`, `GET /vehicles/:id`, `DELETE /vehicles/:id`) con validaciones de tipo y rango estrictas.
   - Cuenta con un WebSocket Server (`ws`) y un heartbeat de 5 segundos que evalúa y transmite proactivamente cambios de estado inactivos ("Sin señal") a los clientes.

2. **Frontend (React + TypeScript + Vite + Leaflet)**
   - Consume los datos del backend en tiempo real usando un hook WebSocket personalizado.
   - Aplica estilos de diseño modernos (glassmorphism, transiciones fluidas, variables HSL) estructurados en **Vanilla CSS**.
   - Integra **Leaflet.js** con mapas base claros de OpenStreetMap (mostrando relieve y calles) y marcadores personalizados con tooltips flotantes.

3. **Simulador de Telemetría (Node.js)**
   - Ejecuta hilos simulados para 5 vehículos con coordenadas de alta resolución que siguen curvas de vías reales.
   - Inyecta de forma deliberada un ~10% de payloads inválidos o incompletos para validar la robustez de las respuestas HTTP `400 Bad Request` en el backend.
   - Aplica un ciclo específico en `VH-005` (20s online / 180s offline) para forzar la visualización en color rojo del estado "Sin señal".

---

## 🔄 Lógica de Estados del Vehículo

| Estado | Condición |
|--------|-----------|
| **Sin señal** | No se ha recibido ningún dato del vehículo en los últimos **120 segundos**. |
| **Detenido** | Telemetría recibida en los últimos 120 segundos, pero su coordenada no cambia durante **más de 60 segundos**. |
| **En movimiento** | Reporta coordenadas distintas en la ventana de los últimos 60 segundos. |

*Esta máquina de estados está validada mediante tests unitarios integrados en `backend/src/statusEvaluator.test.ts`.*

---

## 💭 Pregunta de Reflexión (03.1 D)

> **Pregunta**: Si en un sistema real existiera tanto un caché (Redis) como una base de datos persistente, ¿qué deberías garantizar al eliminar un vehículo para evitar inconsistencias entre ambos?

**Respuesta**:
Para evitar inconsistencias (lecturas fantasma o datos corruptos en caché) al eliminar un vehículo en un entorno real con DB y Redis, debemos implementar el patrón **Cache-Aside (Evicción de Caché)** bajo las siguientes reglas de consistencia:

1. **Evicción en lugar de actualización**: Al eliminar el registro, debemos **eliminar la clave del caché (evict/delete)** en lugar de intentar sobreescribirla con valores vacíos. Esto fuerza a que la siguiente consulta vaya directamente a la base de datos (la cual responderá `404 Not Found`) evitando inconsistencias.
2. **Secuencia de eliminación correcta (DB primero)**:
   - Primero se elimina el registro en la base de datos transaccional.
   - Solo cuando el `commit` de la transacción en la DB es 100% exitoso, se procede a eliminar la clave correspondiente en Redis.
3. **Mecanismo de reintento para fallas de red**: Si la eliminación en la DB funciona pero la conexión a Redis falla temporalmente, el caché servirá datos viejos. Para evitar esto, la eliminación de la caché se puede enviar a una cola de mensajería asíncrona con política de reintentos (ej. BullMQ/RabbitMQ).
4. **TTL (Time-To-Live) de Respaldo**: Todas las llaves del caché en Redis deben configurarse con un tiempo de expiración (TTL) corto. De esta manera, incluso ante fallos críticos inesperados, cualquier dato inconsistente expira y se limpia automáticamente en pocos minutos.

---

## ✅ Guía de Verificación

1. Inicia la aplicación con `npm run dev`.
2. Accede al dashboard de la UI en el navegador.
3. Observa la barra de indicadores en la parte superior y las tarjetas de la flota.
4. Al cabo de **2 minutos y 15 segundos**, el vehículo `VH-005` dejará de transmitir. Observarás cómo:
   - Su marcador en el mapa se vuelve **rojo**.
   - El contador superior de "Sin señal" aumenta a `1`.
   - La tarjeta lateral cambia su estado e indicador de color a rojo.
5. Transcurridos 180 segundos offline, `VH-005` volverá a transmitir y cambiará a verde automáticamente.

---

## 🎥 Video de Sustentación

Enlace al video de sustentación de la prueba:
👉 **[https://youtu.be/PXu6REXAL_w]** 

---

## 🤖 Reporte de IA

| # | Pregunta | Respuesta |
|---|----------|-----------|
| **01** | ¿Qué herramientas de IA usaste? | **Gemini 3.5 Flash** (integrado en el IDE de Antigravity) y **Claude** (utilizado para el refinamiento de la lógica de tiempo real y solución de problemas del ciclo de vida de React). |
| **02** | ¿Para qué tareas específicas te apoyaste en la IA? | 1. Generación de las coordenadas iniciales basadas en avenidas reales de Bogotá y Cali.<br>2. Definición matemática del cálculo de diferencias de tiempo sobre históricos consecutivas para el estado *Detenido*.<br>3. Estructuración del boilerplate de tipos de TypeScript y componentes visuales en CSS. |
| **03** | ¿Qué errores de la IA encontraste y cómo los corregiste? | 1. **Falta de limpieza (cleanup) en Leaflet**: La IA inicializó el mapa dentro de un `useEffect` de React sin retornar la función para removerlo. Al renderizar en modo StrictMode, causaba el error `Map container is already initialized`. Se corrigió agregando `map.remove()` en el callback de desmontaje.<br>2. **Servidor sin Heartbeat activo**: La IA propuso WebSockets que solo transmitían en los eventos `POST /gps`. Esto impedía que el cliente se enterara de los cortes de señal de forma pasiva. Se corrigió agregando un intervalo activo en el backend que evalúa las marcas de tiempo y propaga el estado actualizado en background cada 5s.<br>3. **Errores de aborto de WebSocket en consola**: Al desmontar y montar el componente rápidamente en StrictMode, la IA intentaba cerrar la conexión del socket cuando estaba en estado `CONNECTING`. Esto producía una advertencia roja del navegador. Se corrigió reprogramando el cierre condicional solo al momento del evento `onopen` si el componente ya había sido desmontado. |
