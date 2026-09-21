# Sistema de Solicitudes Internas - CARLO SUBASTAS

Solución técnica desarrollada para centralizar, gestionar y auditar las solicitudes internas de la empresa, garantizando trazabilidad integral de estados, asignación de responsables, control de concurrencia optimista, cálculo dinámico de SLAs y auditoría inmutable en base de datos.

---

## 1. Stack Tecnológico & Justificación

* **Framework Fullstack:** **Next.js 16 (App Router, React 19, TypeScript)**
  * *Justificación:* Unifica frontend y backend en una arquitectura modular sin fricción. Provee Server Routes y Client Components con tipado estricto de extremo a extremo.
* **Base de Datos & ORM:** **PostgreSQL 16 + Prisma ORM 7 (con `@prisma/adapter-pg`)**
  * *Justificación:* Base de datos relacional robusta con soporte ACID. Prisma 7 ofrece migraciones declarativas y tipadas, soporte nativo de driver adapter nativo de alto rendimiento y control optimista de concurrencia.
* **Contenedores:** **Docker & Docker Compose**
  * *Justificación:* Levanta el entorno de PostgreSQL aislado en segundos con volumen persistente (`solicitudes_postgres` en puerto `5433` para evitar colisiones con instancias locales).
* **Validación de Datos:** **Zod**
  * *Justificación:* Validación rigurosa de esquemas en entrada de endpoints y mutaciones, previniendo inyecciones de datos no estructurados.
* **Frontend & UI:** **Tailwind CSS 4 + Lucide React**
  * *Justificación:* Diseño limpio, responsivo y corporativo con tarjetas de métricas en tiempo real, filtros combinados, línea de tiempo (timeline) de auditoría y alertas visuales.

---

## 2. Estructura del Proyecto

```
sistema-solicitudes/
├── app/                  # Rutas de Next.js (App Router) y API Handlers
│   ├── api/solicitudes/  # Endpoints REST (GET, POST, PATCH)
│   ├── api/usuarios/     # Endpoint para selectores de usuarios
│   ├── layout.tsx        # Layout raíz
│   └── page.tsx          # Dashboard principal interactivo
├── components/           # Componentes UI modulares
│   ├── request-table.tsx # Tabla con paginación y ordenamiento
│   ├── request-filters.tsx # Filtros por estado, prioridad y búsqueda
│   ├── request-dialog.tsx # Modal de creación de solicitudes
│   ├── request-detail-dialog.tsx # Detalle, máquina de estados y timeline
│   └── status-badge.tsx  # Badges de estado, prioridad y alerta SLA (+4h)
├── docs/                 # Especificación técnica original y directivas
│   ├── instructions.md
│   └── Test Técnico - Sistema de Solicitudes.pdf
├── lib/                  # Lógica modular de backend y utilidades
│   ├── services/         # Capa de servicio (SolicitudesService)
│   ├── validations/      # Esquemas de validación Zod
│   ├── utils/            # Funciones de utilidad (SLA, cn)
│   ├── state-machine.ts  # Matriz de transiciones de estado
│   ├── types.ts          # Interfaces y tipos TypeScript
│   ├── prisma.ts         # Singleton del cliente Prisma 7
│   └── generated/        # Prisma Client generado con driver adapter
├── prisma/               # Esquema de base de datos relacional y migraciones
│   ├── migrations/       # Historial de migraciones SQL
│   ├── schema.prisma     # Definición de modelos y relaciones
│   └── seed.ts           # Seeder con 4 usuarios y 9 escenarios de prueba
├── docker-compose.yml    # Contenedor PostgreSQL (puerto 5433)
├── prisma.config.ts      # Configuración de Prisma 7
├── .env.example          # Variables de entorno de referencia
└── README.md             # Documentación técnica completa
```

---

## 3. Prerrequisitos

* **Node.js**: v20.19.0 o superior (recomendado v22 LTS).
* **Docker Desktop / Docker Engine**: En ejecución.
* **npm**: v10 o superior.

---

## 3. Instrucciones de Arranque Rápido

Sigue estos sencillos pasos para tener la aplicación funcionando en menos de 2 minutos:

### Paso 1: Clonar y entrar al repositorio
```bash
git clone https://github.com/Kevin/sistema-solicitudes.git
cd sistema-solicitudes
```

### Paso 2: Configurar variables de entorno
El archivo `.env` ya se encuentra configurado por defecto. Puedes verificar o copiar desde `.env.example`:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```
*Contenido del `.env`:*
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/solicitudes_db?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Paso 3: Levantar la base de datos en Docker
```bash
docker compose up -d
```
*(Se iniciará el contenedor PostgreSQL en el puerto `5433` con base de datos `solicitudes_db`).*

### Paso 4: Instalar dependencias
```bash
npm install
```

### Paso 5: Ejecutar migraciones y poblar datos de prueba (Seed)
```bash
# 1. Generar cliente Prisma y aplicar migraciones
npx prisma migrate dev

# 2. Poblar datos de prueba representativos
npx prisma db seed
```

### Paso 6: Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000).

---

## 4. Decisiones Técnicas & Arquitectura

### 4.1. Estados y Reglas de Negocio
Se implementó una capa aislada (`lib/state-machine.ts` y `lib/services/solicitudes.service.ts`) que valida todas las transiciones antes de persistir cualquier cambio:

| Estado Actual | Transiciones Permitidas | Restricciones / Reglas de Negocio |
| :--- | :--- | :--- |
| **PENDIENTE** | `EN_PROCESO`, `CANCELADA` | Estado inicial por defecto de toda solicitud. Admite edición de datos. |
| **EN_PROCESO** | `ATENDIDA`, `PENDIENTE`, `CANCELADA` | **Bloqueo estricto:** No puede pasar a `ATENDIDA` sin un responsable asignado. |
| **ATENDIDA** | *Ninguna (Estado final)* | La solicitud queda bloqueada de forma permanente para cambios y cancelaciones. |
| **CANCELADA** | *Ninguna (Estado final)* | La solicitud queda bloqueada de forma permanente para cambios y reaperturas. |

### 4.2. Control de Concurrencia Optimista (Optimistic Locking)
* **Problema:** Múltiples operadores o usuarios pueden abrir la misma solicitud e intentar modificarla al mismo tiempo, pudiendo sobrescribir cambios ajenos sin percatarse (Lost Update).
* **Solución Implementada:**
  1. El modelo `Solicitud` incluye un campo entero `version` con valor inicial `1`.
  2. En cada petición de actualización (`PATCH`), el cliente debe enviar el número de `version` que tiene en pantalla.
  3. En el servicio backend, la actualización se ejecuta con:
     ```typescript
     const updateResult = await tx.solicitud.updateMany({
       where: { id, version: input.version },
       data: { ...datosNuevos, version: { increment: 1 } },
     });
     ```
  4. Si `updateResult.count === 0`, significa que otro usuario modificó la solicitud antes. El backend aborta la transacción y responde con **HTTP 409 Conflict**:
     > *"La solicitud fue modificada por otro usuario. Por favor recarga los datos para ver la versión actualizada."*
  5. En el frontend se despliega una alerta visual destacada con un botón interactivo de **"Recargar Versión Nueva"** que sincroniza el estado sin pérdida de datos.

### 4.3. Historial de Auditoría Inmutable (Append-Only Audit Log)
* Cada acción (creación, cambio de estado, asignación de responsable, edición de datos o notas) se registra en la tabla `Historial` dentro de la **misma transacción atómica** (`prisma.$transaction`).
* El historial no posee endpoints de `DELETE` ni `UPDATE`; es de solo lectura y append-only.
* Permite auditar exactamente qué usuario realizó el cambio, en qué fecha/hora y los valores anteriores vs. nuevos (vía columna `Json` `detalles`).

### 4.4. Cálculo de SLA y Alerta de Solicitudes Urgentes
* Se calcula dinámicamente en backend (`lib/utils/sla.ts`) tanto en el listado paginado como en el detalle:
  * Si `prioridad === 'URGENTE'` y el estado no es terminal (`ATENDIDA` o `CANCELADA`):
    * Se evalúa el tiempo transcurrido desde `createdAt`.
    * Si supera las **4 horas**, se expone `estaVencida = true` y el tiempo formateado (ej: `5h 20m`).
  * En la interfaz se muestra un badge rojo prominente `VENCIDA (+4h)` con animación y el tiempo transcurrido sin ser atendida.

### 4.5. Paginación y Filtros en Backend
* Todas las búsquedas y filtros se procesan directamente en la consulta a la base de datos mediante Prisma:
  * Filtros por `estado`, `prioridad`, `categoria`, `responsableId` y búsqueda textual por coincidencia parcial en `titulo` y `descripcion` (`mode: 'insensitive'`).
  * Paginación SQL con `take` y `skip`, retornando metadatos (`total`, `totalPages`, `currentPage`).

---

## 5. Endpoints de la API

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/solicitudes` | Listado paginado con filtros (`page`, `limit`, `search`, `estado`, `prioridad`, `categoria`, `responsableId`) y SLA computado. |
| `POST` | `/api/solicitudes` | Crea una nueva solicitud en estado `PENDIENTE` y genera el registro de historial inicial. |
| `GET` | `/api/solicitudes/[id]` | Obtiene el detalle completo de la solicitud junto con su historial cronológico descendente. |
| `PATCH` | `/api/solicitudes/[id]` | Aplica cambios de estado, asignación o contenido con control de concurrencia optimista (`version`) y registro transaccional en `Historial`. |
| `GET` | `/api/usuarios` | Lista de usuarios del sistema para alimentar selectores de creadores y responsables. |

---

## 6. Datos de Prueba y Escenarios del Seeder (`prisma/seed.ts`)

El comando `npx prisma db seed` inserta:
1. **4 Usuarios de prueba con diferentes roles:**
   * `María López` (Rol: `EMPLEADO`) - Creadora de solicitudes.
   * `Juan Pérez` (Rol: `SOPORTE`) - Técnico resolutor.
   * `Ana Gómez` (Rol: `SOPORTE`) - Técnico resolutor.
   * `Carlos Admin` (Rol: `ADMIN`) - Administrador del sistema.
2. **9 Solicitudes de prueba con historiales completos:**
   * **1 Solicitud Urgente creada hace 6 horas en estado `PENDIENTE`:** Evidencia el cálculo de **SLA Vencido (+4h)**.
   * **1 Solicitud Urgente creada hace 1 hora en estado `EN_PROCESO`:** Evidencia solicitud urgente dentro del plazo de SLA.
   * **2 Solicitudes en estado `PENDIENTE`:** Prioridad baja y normal, sin responsable asignado.
   * **2 Solicitudes en estado `EN_PROCESO`:** Con responsable asignado e historial de cambios de estado.
   * **2 Solicitudes en estado `ATENDIDA`:** Con responsable asignado e historial completo de resolución.
   * **1 Solicitud en estado `CANCELADA`:** Cancelada con motivo registrado en auditoría.

---

## 7. Funcionalidades Pendientes y Mejoras Futuras

1. **Notificaciones y Actualización en Tiempo Real:**
   * Integración de WebSockets o Server-Sent Events (SSE) para notificar inmediatamente a los responsables cuando se les asigne una solicitud urgente.
2. **Autenticación y Autorización Formal (RBAC):**
   * Incorporar NextAuth.js / Auth.js con sesiones JWT y control de acceso basado en roles para restringir qué usuarios pueden asignar responsables o cancelar solicitudes.
3. **Adjuntos Multimedia:**
   * Carga de archivos y capturas de pantalla de incidentes a almacenamiento en la nube (ej: Amazon S3 o Cloudflare R2).
4. **Exportación de Reportes:**
   * Exportación de reportes de cumplimiento de SLA en formato Excel (XLSX) o PDF para gerencia.
