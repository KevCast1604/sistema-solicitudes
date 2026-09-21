# Guía Técnica de Evaluación & Guión de Presentación
**Sistema de Solicitudes Internas — CARLO SUBASTAS**

> **Propósito:** Este documento sirve como mapa de navegación del código y guión estructurado para la revisión técnica y sustentación del proyecto. Aquí se detallan los archivos fundamentales que implementan cada requerimiento del test y cómo demostrarlos en una entrevista en vivo.

---

## 1. Mapa de Archivos Más Importantes

Para evaluar la calidad de código, arquitectura y patrones de diseño, estos son los archivos clave ordenados por responsabilidad:

| Archivo | Responsabilidad / Qué evaluar |
| :--- | :--- |
| [`lib/state-machine.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/lib/state-machine.ts) | **Máquina de Estados Finita:** Matriz de transiciones permitidas, definición de estados terminales inmutables (`ATENDIDA`, `CANCELADA`) y reglas de negocio para transiciones y cancelaciones. |
| [`lib/services/solicitudes.service.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/lib/services/solicitudes.service.ts) | **Núcleo de Negocio & Persistencia:** Implementa transacciones atómicas (`prisma.$transaction`), **control de concurrencia optimista (`version`)** arrojando `HTTP 409 Conflict`, y generación automática de historial de auditoría. |
| [`lib/utils/sla.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/lib/utils/sla.ts) | **Cálculo de SLA (4 horas):** Lógica matemática en backend que evalúa solicitudes `URGENTE`, detecta si `tiempoTranscurrido > 4h` (`estaVencida = true`) y formatea el tiempo sin atender (`5h 20m`). |
| [`lib/validations/solicitud.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/lib/validations/solicitud.ts) | **Validación Tipada con Zod:** Esquemas para creación, actualización (con campo `version` requerido) y parámetros de consulta para paginación/filtros. |
| [`prisma/schema.prisma`](file:///C:/Kevin/GitHub/sistema-solicitudes/prisma/schema.prisma) | **Esquema Relacional:** Modelos `Usuario`, `Solicitud` e `Historial`. Índices compuestos para optimizar búsquedas por estado, prioridad, categoría y fecha. |
| [`prisma/seed.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/prisma/seed.ts) | **Seeder con Escenarios Reales:** 4 usuarios con distintos roles y 9 solicitudes que evidencian SLA vencido (+6h), urgente vigente (+1h), en proceso, atendidas y canceladas con auditoría completa. |
| [`app/api/solicitudes/route.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/app/api/solicitudes/route.ts) | **Endpoint de Listado & Creación:** Paginación SQL nativa (`take`, `skip`) y filtros backend combinados con búsqueda por texto insensible a mayúsculas/minúsculas. |
| [`app/api/solicitudes/[id]/route.ts`](file:///C:/Kevin/GitHub/sistema-solicitudes/app/api/solicitudes/[id]/route.ts) | **Endpoint de Detalle & Modificación:** Captura `PATCH`, ejecuta el servicio con bloqueo optimista y devuelve el estado actualizado con su timeline de cambios. |
| [`components/request-detail-dialog.tsx`](file:///C:/Kevin/GitHub/sistema-solicitudes/components/request-detail-dialog.tsx) | **Interfaz de Detalle & Auditoría:** Controles dinámicos según transiciones permitidas, selector de responsable, detección visual de colisiones `HTTP 409` con botón de recarga, y timeline visual del historial inmutable. |
| [`components/request-table.tsx`](file:///C:/Kevin/GitHub/sistema-solicitudes/components/request-table.tsx) | **Tabla Interactiva:** Badges de estado, alerta roja pulsante `VENCIDA (+4h)` con tiempo sin atender y controles de paginación del servidor. |

---

## 2. Guión de Sustentación en Vivo (Paso a Paso)

Si tienes que presentar el proyecto en 5 a 10 minutos ante un evaluador técnico, sigue esta secuencia recomendada:

### Minuto 1: Arranque y Arquitectura General
> *"Para este proyecto elegí un stack fullstack con **Next.js 16 (App Router)**, **TypeScript**, **PostgreSQL** y **Prisma ORM 7** con driver adapter nativo (`@prisma/adapter-pg`). Todo el entorno de base de datos se levanta de forma reproducible con **Docker Compose** en el puerto 5433 para evitar colisiones locales."*

1. Mostrar el comando de arranque:
   ```bash
   docker compose up -d
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

### Minutos 2-3: Demostración de Requerimientos Básicos
1. **Dashboard Principal:** Mostrar las tarjetas de métricas en la parte superior (Total, Pendientes, Urgentes, Vencidas SLA).
2. **Paginación y Filtros en Backend:**
   * Escribir un término de búsqueda (ej: `"base de datos"` o `"VPN"`). Explicar que la búsqueda no se hace en memoria del cliente, sino mediante consultas parametrizadas con `mode: 'insensitive'` en SQL/Prisma.
   * Filtrar por Prioridad `"Urgente"` o Estado `"En proceso"`.
   * Mostrar el pie de la tabla con los controles de paginación (`Página 1 de X` y `Mostrando X a Y de Z solicitudes`).
3. **Creación de Solicitud:**
   * Clic en **"Nueva Solicitud"**.
   * Llenar el formulario validado con Zod y guardar. Explicar que nace en estado `PENDIENTE`, con `version = 1` y con su primer registro en `Historial` dentro de una transacción atómica.

### Minutos 4-5: Demostración de Casos Especiales (Puntos Clave del Test)

#### Caso Especial A: SLA y Alerta de Solicitud Urgente Vencida (+4h)
1. En la tabla, señalar la primera solicitud: **"Fallo crítico en servidor de base de datos principal"**.
2. Mostrar el badge rojo distintivo: **`VENCIDA (+4h)`** y el tiempo calculado (ej: `6h 0m`).
3. Explicar:
   > *"El cálculo no depende de un cronjob pesado ni notificaciones innecesarias; se calcula dinámicamente en backend en `lib/utils/sla.ts`. Si la prioridad es `URGENTE` y el estado no es terminal, se compara `Date.now() - createdAt`. Al superar las 4 horas, se marca `estaVencida = true` y se entrega el tiempo formateado para la interfaz."*

#### Caso Especial B: Máquina de Estados y Reglas de Transición
1. Abrir la solicitud vencida o cualquier solicitud en estado `PENDIENTE`.
2. Mostrar los botones de cambio de estado en el panel derecho:
   * Solo aparecen `EN_PROCESO` y `CANCELADA` (las únicas válidas desde `PENDIENTE`).
3. Cambiar a `EN_PROCESO`.
4. Mostrar la regla estricta:
   * El botón para pasar a `ATENDIDA` aparece **deshabilitado con la advertencia "Falta Responsable"**.
   * Seleccionar un responsable (ej: `Juan Pérez`) y guardar.
   * Ahora el botón para pasar a `ATENDIDA` se habilita.
5. Cambiar a `ATENDIDA`:
   * La solicitud pasa a estado terminal. Todos los controles se bloquean y se muestra el candado: *"Esta solicitud está en estado final y no admite más transiciones ni ediciones"*.

#### Caso Especial C: Control de Concurrencia Optimista (Optimistic Locking)
1. Explicar cómo se previene la pérdida de datos cuando dos usuarios modifican la misma solicitud:
   > *"Implementé **Optimistic Concurrency Control** mediante una columna `version` de tipo entero. Cuando el cliente abre una solicitud, obtiene la versión actual (ej: v1). Al enviar una modificación, la consulta de base de datos busca `where: { id, version: versionEnviada }` e incrementa la versión a 2."*
2. Si otro usuario modificó la solicitud una fracción de segundo antes, `updateResult.count === 0`.
3. El servidor responde inmediatamente con **HTTP 409 Conflict**.
4. En el modal se muestra una alerta especial en color ámbar con un botón de **"Recargar Versión Nueva"** que sincroniza los datos más recientes sin sobreescritura accidental.

#### Caso Especial D: Historial de Auditoría Inmutable (Append-Only Audit Log)
1. Desplazarse a la parte inferior del modal de detalle: **Línea de Tiempo (Timeline)**.
2. Mostrar cómo cada acción (`CREACION`, `ASIGNACION_RESPONSABLE`, `CAMBIO_ESTADO`, `EDICION_DATOS`) queda registrada con:
   * Usuario que ejecutó la acción y su rol.
   * Fecha y hora exacta.
   * Valores anteriores y nuevos guardados en formato JSON estructurado.
3. Señalar que no existen endpoints de `DELETE` ni `UPDATE` para la tabla `Historial`, garantizando inmutabilidad.

---

## 3. Preguntas Frecuentes en Entrevistas Técnicas

### P1: ¿Por qué elegiste bloqueo optimista en lugar de pesimista (`SELECT FOR UPDATE`)?
* **Respuesta:** En sistemas web donde los usuarios leen información y tardan segundos o minutos en llenar un formulario o tomar una decisión, el bloqueo pesimista mantiene conexiones de base de datos abiertas y filas bloqueadas, lo que degrada la concurrencia y genera deadlocks. El **bloqueo optimista** es no bloqueante: permite lecturas libres y solo valida la versión en el instante milimétrico de la escritura. Si hay conflicto, se notifica con un código estándar **HTTP 409 Conflict**.

### P2: ¿Por qué no calcular el SLA únicamente en el frontend con Javascript?
* **Respuesta:** Porque el frontend es un cliente no confiable y depende de la hora local del dispositivo del usuario (que puede estar desfasada). Al calcular el SLA en el backend (`lib/utils/sla.ts`), garantizamos una fuente única de verdad sincronizada con el reloj del servidor y permitimos que clientes API o reportes externos consuman directamente la propiedad computada `estaVencida`.

### P3: ¿Cómo se garantiza la atomicidad entre la solicitud y su historial?
* **Respuesta:** Mediante `prisma.$transaction(async (tx) => { ... })`. La actualización de la solicitud (con incremento de versión) y la inserción del registro en `Historial` ocurren dentro del mismo bloque transaccional SQL. Si alguna de las dos falla, toda la operación hace rollback automático, impidiendo estados inconsistentes.

### P4: ¿Cómo se comporta el sistema exactamente si dos personas intentan modificar la misma solicitud al mismo tiempo?
* **Respuesta:**
  1. **Lectura simultánea:** Tanto el Usuario A como el Usuario B abren la misma solicitud en sus pantallas. Ambos reciben los mismos datos y la misma versión de control (ejemplo: `version: 1`).
  2. **Primer guardado exitoso (*First-Write-Wins*):**
     * El Usuario A envía su cambio primero.
     * En el backend se ejecuta: `prisma.solicitud.updateMany({ where: { id, version: 1 }, data: { ...cambiosA, version: 2 } })`.
     * La condición se cumple (`count === 1`), los cambios se persisten, se genera el registro en `Historial` y la versión pasa atómicamente a `2`.
  3. **Segundo guardado en colisión (Detección de versión obsoleta):**
     * Instantes después, el Usuario B intenta guardar sus cambios enviando la versión que tenía en su pantalla (`version: 1`).
     * El backend ejecuta la misma consulta buscando `where: { id, version: 1 }`.
     * Como el registro en base de datos ya tiene `version: 2`, la consulta no afecta a ninguna fila (`updateResult.count === 0`).
  4. **Respuesta del Servidor:**
     * Se aborta la transacción y el servidor responde inmediatamente con código **HTTP 409 Conflict** y el mensaje de error:
       > *"La solicitud fue modificada por otro usuario. Por favor recarga los datos para ver la versión actualizada."*
  5. **Comportamiento en la Interfaz (Frontend):**
     * La aplicación captura el error 409 y despliega un panel de advertencia destacado en color ámbar explicando que la versión quedó obsoleta.
     * Muestra un botón directo de **"Recargar Versión Nueva"** que consulta la última versión del servidor (v2 con los cambios del Usuario A) para que el Usuario B pueda visualizarlos y decidir si vuelve a aplicar su cambio sin sobrescribir información ajena por accidente.
