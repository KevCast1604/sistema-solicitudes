# Especificación Técnica & Directivas de Desarrollo: Sistema de Solicitudes Internas

> **Propósito:** Este documento sirve como guía arquitectónica y prompt maestro para el desarrollo del test técnico de **CARLO SUBASTAS**. Debe ser interpretado por el agente de IA para implementar la solución completa en un plazo de desarrollo de 4 horas.

---

## 1. Stack Tecnológico Recomendado y Justificación

Para garantizar el cumplimiento en menos de 4 horas con calidad senior, robustez de tipos y entrega de frontend + backend + base de datos funcional, el stack óptimo es:

*   **Framework Fullstack:** **Next.js (App Router, TypeScript)**
    *   *Por qué:* Elimina la fricción de configurar repositorios separados para frontend y backend. Provee API Routes / Server Actions tipados de extremo a extremo.
*   **Base de Datos & ORM:** **PostgreSQL + Prisma ORM**
    *   *Por qué:* PostgreSQL cumple con la recomendación de base de datos relacional. Prisma ofrece migraciones declarativas automáticas (`prisma migrate dev`), tipado estricto, facilidad para seeders (`prisma/seed.ts`) y soporte nativo para control de concurrencia optimista.
*   **Contenedores:** **Docker & Docker Compose** (para levantar PostgreSQL al instante con un solo comando).
*   **Frontend & UI:** **Tailwind CSS + shadcn/ui o Lucide Icons**
    *   *Por qué:* Permite construir tablas interactivas con filtros, badges de estado y modales en minutos sin descuidar la estética ni la usabilidad.
*   **Validación de Datos:** **Zod** (para esquemas de entrada en endpoints y mutaciones).

---

## 2. Modelo de Datos y Esquema Relacional (Prisma)

El agente debe generar el archivo `prisma/schema.prisma` respetando los siguientes requisitos:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Prioridad {
  BAJA
  NORMAL
  ALTA
  URGENTE
}

enum Estado {
  PENDIENTE
  EN_PROCESO
  ATENDIDA
  CANCELADA
}

model Usuario {
  id                    String      @id @default(uuid())
  nombre                String
  email                 String      @unique
  rol                   String      // Ej: "EMPLEADO", "SOPORTE", "ADMIN"
  solicitudesCreadas    Solicitud[] @relation("CreadorSolicitud")
  solicitudesAsignadas  Solicitud[] @relation("ResponsableSolicitud")
  historiales           Historial[]

  createdAt             DateTime    @default(now())
}

model Solicitud {
  id              String      @id @default(uuid())
  titulo          String
  descripcion     String
  categoria       String
  prioridad       Prioridad   @default(NORMAL)
  estado          Estado      @default(PENDIENTE)
  
  creadorId       String
  creador         Usuario     @relation("CreadorSolicitud", fields: [creadorId], references: [id])
  
  responsableId   String?
  responsable     Usuario?    @relation("ResponsableSolicitud", fields: [responsableId], references: [id])
  
  // Control de Concurrencia Optimista
  version         Int         @default(1)

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  historial       Historial[]

  @@index([estado])
  @@index([prioridad])
  @@index([categoria])
  @@index([createdAt])
}

model Historial {
  id            String    @id @default(uuid())
  solicitudId   String
  solicitud     Solicitud @relation(fields: [solicitudId], references: [id], onDelete: Cascade)
  
  usuarioId     String
  usuario       Usuario   @relation(fields: [usuarioId], references: [id])
  
  accion        String    // Ej: "CREACION", "CAMBIO_ESTADO", "ASIGNACION_RESPONSABLE", "EDICION_DATOS"
  detalles      Json?     // Valores anteriores y nuevos para auditoría
  createdAt     DateTime  @default(now())

  @@index([solicitudId])
}
```

---

## 3. Reglas de Negocio y Máquina de Estados

Todas las reglas deben validarse a nivel de servicio en el backend antes de persistir cualquier cambio.

### 3.1. Matriz de Transiciones Válidas de Estado
| Estado Actual | Transiciones Permitidas | Restricciones Adicionales |
| :--- | :--- | :--- |
| **PENDIENTE** | `EN_PROCESO`, `CANCELADA` | - |
| **EN_PROCESO** | `ATENDIDA`, `PENDIENTE`, `CANCELADA` | **No puede pasar a `ATENDIDA` si `responsableId` es `null`.** |
| **ATENDIDA** | *Ninguna (Estado final)* | La solicitud queda bloqueada para modificaciones. |
| **CANCELADA** | *Ninguna (Estado final)* | La solicitud queda bloqueada para modificaciones. |

### 3.2. Reglas de Edición y Cancelación
1. **Edición de contenido** (título, descripción, categoría, prioridad):
   * Permitida únicamente si el estado es `PENDIENTE` o `EN_PROCESO`.
   * Prohibida si el estado es `ATENDIDA` o `CANCELADA`.
2. **Asignación de responsable**:
   * Permitida en `PENDIENTE` y `EN_PROCESO`.
   * Obligatoria antes o durante la transición hacia `ATENDIDA`.
3. **Cancelación**:
   * Permitida desde `PENDIENTE` y `EN_PROCESO`.
   * Prohibida una vez que la solicitud ya fue `ATENDIDA` o `CANCELADA`.

### 3.3. Inmutabilidad del Historial (Audit Log)
* Cada operación de creación, actualización de datos, asignación o cambio de estado debe registrar automáticamente un registro en `Historial` dentro de la **misma transacción de base de datos** (`prisma.$transaction`).
* El historial no cuenta con endpoints de eliminación (`DELETE`) ni de actualización (`UPDATE`). Es de solo lectura y append-only.

---

## 4. Casos Especiales y Manejo de Concurrencia

### 4.1. Modificaciones Simultáneas (Optimistic Locking)
* **Problema:** Dos usuarios abren la misma solicitud y envían cambios casi al mismo tiempo.
* **Solución Implementada:**
  1. El cliente envía el campo `version` actual de la solicitud en la petición (`PUT` / `PATCH`).
  2. En el backend, la consulta actualiza la solicitud buscando por `id` y `version`:
     ```typescript
     const updated = await prisma.solicitud.updateMany({
       where: { id: solicitudId, version: versionEnviada },
       data: { ...datosNuevos, version: { increment: 1 } }
     });
     ```
  3. Si `updated.count === 0`, significa que otro usuario modificó la solicitud antes. El servidor responde inmediatamente con un código **HTTP 409 Conflict** y un mensaje: `"La solicitud fue modificada por otro usuario. Por favor recarga los datos para ver la versión actualizada."`.

### 4.2. SLA y Alerta de Prioridad "Urgente"
* **Lógica de cálculo:**
  * Debe calcularse en el backend al listar o consultar la solicitud.
  * Si `prioridad === 'URGENTE'` y el estado no es terminal (`estado !== 'ATENDIDA' && estado !== 'CANCELADA'`):
    * `tiempoTranscurrido = now() - createdAt`.
    * Si `tiempoTranscurrido > 4 horas`, se expone la propiedad computada `estaVencida = true`.
  * La respuesta debe devolver:
    * `tiempoSinAtender`: formato amigable (ej: `"5h 20m"`, `"1h 15m"`).
    * `estaVencida`: booleano (`true` / `false`).
* En el frontend, mostrar un badge o indicador visual rojo distintivo (`VENCIDA (+4h)`) para estas solicitudes.

---

## 5. Endpoints de la API y Filtros en Backend

Todos los filtros y la paginación deben ejecutarse directamente en la consulta SQL / Prisma.

*   `GET /api/solicitudes`:
    *   **Query Params:**
        *   `page` (default: 1)
        *   `limit` (default: 10)
        *   `search` (búsqueda por texto en `titulo` o `descripcion`)
        *   `estado` (filtro por enum `Estado`)
        *   `prioridad` (filtro por enum `Prioridad`)
        *   `categoria` (filtro de coincidencia exacta o parcial)
        *   `responsableId` (filtro por ID de usuario asignado)
    *   **Respuesta:** Metadatos de paginación (`total`, `totalPages`, `currentPage`) y lista de solicitudes con campos calculados (`estaVencida`, `tiempoSinAtender`).
*   `POST /api/solicitudes`: Crea una nueva solicitud (estado inicial: `PENDIENTE`, registra historial).
*   `GET /api/solicitudes/[id]`: Detalle de la solicitud con historial completo ordenado cronológicamente desc.
*   `PATCH /api/solicitudes/[id]`: Modifica campos permitidos, valida `version`, valida reglas de estado y registra historial en transacción.
*   `GET /api/usuarios`: Lista de usuarios para alimentar los selectores de "Creador" y "Responsable".

---

## 6. Seeders y Datos de Prueba (`prisma/seed.ts`)

El script de seed debe poblar la base de datos con escenarios representativos para la evaluación:
1. **Usuarios de prueba:** Al menos 4 usuarios (ej: "Juan Pérez (Soporte)", "María López (Ventas)", "Carlos Admin", etc.).
2. **Solicitudes variadas:**
   * 1 solicitud Urgente creada hace **6 horas** en estado `PENDIENTE` (para evidenciar el estado **Vencida**).
   * 1 solicitud Urgente creada hace **1 hora** en estado `EN_PROCESO` (no vencida).
   * 2 solicitudes en estado `PENDIENTE` (baja y normal).
   * 2 solicitudes en estado `EN_PROCESO` con responsable asignado.
   * 2 solicitudes `ATENDIDA` con responsable e historial completo.
   * 1 solicitud `CANCELADA`.
3. **Historial realista:** Cada solicitud creada debe tener sus respectivos registros de auditoría asociados.

---

## 7. Instrucciones Paso a Paso para el Agente de IA

El agente debe ejecutar el desarrollo en las siguientes 5 fases ordenadas:

1. **Fase 1: Configuración de Entorno & Base de Datos**
   * Crear `docker-compose.yml` con servicio PostgreSQL.
   * Configurar `.env.example` y `.env` con la cadena de conexión.
   * Crear `prisma/schema.prisma` y ejecutar la migración inicial.
   * Crear y ejecutar `prisma/seed.ts`.

2. **Fase 2: Servicios de Backend & Validaciones**
   * Crear esquemas de validación con Zod para inputs.
   * Implementar la máquina de estados y las validaciones de negocio en una capa de servicio aislada (`src/lib/services/solicitudes.service.ts`).
   * Implementar la transacción atómica para persistencia de solicitud + historial.
   * Implementar el bloqueo optimista por campo `version`.

3. **Fase 3: Rutas de API / Server Actions**
   * Implementar paginación y filtros dinámicos en base de datos.
   * Incorporar la lógica del SLA de 4 horas para solicitudes urgentes.

4. **Fase 4: Frontend & Experiencia de Usuario**
   * Vista Principal: Tabla paginada con barra de búsqueda, selectores de estado/prioridad/categoría y badges visuales para `Vencida`.
   * Modal o Pantalla de Creación: Formulario validado para crear solicitud.
   * Pantalla de Detalle: Visualización de datos, botón para asignar responsable, controles para cambiar de estado (deshabilitando transiciones inválidas) y línea de tiempo (timeline) del historial de cambios.

5. **Fase 5: Documentación & Entrega**
   * Generar `README.md` exhaustivo con:
     * Prerrequisitos y comandos de arranque rápido (`docker compose up`, `npm run dev`, `npx prisma db seed`).
     * Justificación de decisiones técnicas (bloqueo optimista, máquina de estados, historial append-only).
     * Tabla de transiciones de estados.
     * Lista de funcionalidades pendientes o posibles mejoras a futuro (ej: WebSockets/SSE para tiempo real, autenticación JWT formal).