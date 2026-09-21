import { prisma } from '../lib/prisma';
import { Prioridad, Estado } from '../lib/generated/prisma/client';

async function main() {
  console.log('Iniciando seed de base de datos...');

  // Limpieza previa
  await prisma.historial.deleteMany();
  await prisma.solicitud.deleteMany();
  await prisma.usuario.deleteMany();

  // 1. Usuarios de prueba
  const maria = await prisma.usuario.create({
    data: {
      nombre: 'María López',
      email: 'maria.lopez@empresa.com',
      rol: 'EMPLEADO',
    },
  });

  const juan = await prisma.usuario.create({
    data: {
      nombre: 'Juan Pérez',
      email: 'juan.perez@empresa.com',
      rol: 'SOPORTE',
    },
  });

  const ana = await prisma.usuario.create({
    data: {
      nombre: 'Ana Gómez',
      email: 'ana.gomez@empresa.com',
      rol: 'SOPORTE',
    },
  });

  const carlos = await prisma.usuario.create({
    data: {
      nombre: 'Carlos Admin',
      email: 'carlos.admin@empresa.com',
      rol: 'ADMIN',
    },
  });

  console.log(' 4 usuarios creados con éxito.');

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);

  // 2. Solicitudes variadas con Historial realista

  // 1. Solicitud Urgente creada hace 6 horas en PENDIENTE (VENCIDA SLA > 4h)
  const sol1Date = hoursAgo(6);
  const sol1 = await prisma.solicitud.create({
    data: {
      titulo: 'Fallo crítico en servidor de base de datos principal',
      descripcion: 'El servidor de base de datos principal no responde a las consultas de transacciones y está bloqueando operaciones comerciales.',
      categoria: 'Infraestructura',
      prioridad: Prioridad.URGENTE,
      estado: Estado.PENDIENTE,
      creadorId: maria.id,
      responsableId: null,
      version: 1,
      createdAt: sol1Date,
      updatedAt: sol1Date,
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: {
              motivo: 'Registro de incidencia urgente',
              prioridad: 'URGENTE',
              estado: 'PENDIENTE',
            },
            createdAt: sol1Date,
          },
        ],
      },
    },
  });

  // 2. Solicitud Urgente creada hace 1 hora en EN_PROCESO (NO VENCIDA)
  const sol2Date = hoursAgo(1);
  const sol2 = await prisma.solicitud.create({
    data: {
      titulo: 'Caída del servicio de pasarela de pagos',
      descripcion: 'Los pagos en línea mediante tarjeta están arrojando timeout con el proveedor.',
      categoria: 'Comunicaciones',
      prioridad: Prioridad.URGENTE,
      estado: Estado.EN_PROCESO,
      creadorId: maria.id,
      responsableId: juan.id,
      version: 2,
      createdAt: sol2Date,
      updatedAt: hoursAgo(0.5),
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: {
              motivo: 'Incidencia de alta criticidad en pagos',
              prioridad: 'URGENTE',
              estado: 'PENDIENTE',
            },
            createdAt: sol2Date,
          },
          {
            usuarioId: carlos.id,
            accion: 'ASIGNACION_RESPONSABLE',
            detalles: {
              responsableAnterior: null,
              responsableNuevo: juan.nombre,
            },
            createdAt: hoursAgo(0.8),
          },
          {
            usuarioId: juan.id,
            accion: 'CAMBIO_ESTADO',
            detalles: {
              estadoAnterior: 'PENDIENTE',
              estadoNuevo: 'EN_PROCESO',
              nota: 'Iniciando diagnóstico con el equipo de infraestructura de la pasarela',
            },
            createdAt: hoursAgo(0.5),
          },
        ],
      },
    },
  });

  // 3. Solicitud Pendiente - Baja
  const sol3Date = daysAgo(2);
  await prisma.solicitud.create({
    data: {
      titulo: 'Solicitud de reemplazo de mouse ergonómico',
      descripcion: 'La rueda de desplazamiento del mouse del puesto 14 no funciona correctamente.',
      categoria: 'Hardware',
      prioridad: Prioridad.BAJA,
      estado: Estado.PENDIENTE,
      creadorId: maria.id,
      responsableId: null,
      version: 1,
      createdAt: sol3Date,
      updatedAt: sol3Date,
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'BAJA', estado: 'PENDIENTE' },
            createdAt: sol3Date,
          },
        ],
      },
    },
  });

  // 4. Solicitud Pendiente - Normal
  const sol4Date = daysAgo(1);
  await prisma.solicitud.create({
    data: {
      titulo: 'Permisos de acceso a carpeta compartida de Finanzas',
      descripcion: 'Se solicita acceso de lectura/escritura a la carpeta compartida para consolidar el reporte trimestral.',
      categoria: 'Accesos',
      prioridad: Prioridad.NORMAL,
      estado: Estado.PENDIENTE,
      creadorId: maria.id,
      responsableId: null,
      version: 1,
      createdAt: sol4Date,
      updatedAt: sol4Date,
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'NORMAL', estado: 'PENDIENTE' },
            createdAt: sol4Date,
          },
        ],
      },
    },
  });

  // 5. Solicitud En Proceso - Normal con Responsable
  const sol5Date = daysAgo(3);
  await prisma.solicitud.create({
    data: {
      titulo: 'Renovación de licencia de software de diseño gráfico',
      descripcion: 'La suscripción anual del software Adobe finaliza la próxima semana.',
      categoria: 'Software',
      prioridad: Prioridad.NORMAL,
      estado: Estado.EN_PROCESO,
      creadorId: maria.id,
      responsableId: ana.id,
      version: 2,
      createdAt: sol5Date,
      updatedAt: daysAgo(2),
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'NORMAL', estado: 'PENDIENTE' },
            createdAt: sol5Date,
          },
          {
            usuarioId: carlos.id,
            accion: 'ASIGNACION_RESPONSABLE',
            detalles: { responsableAnterior: null, responsableNuevo: ana.nombre },
            createdAt: daysAgo(2.5),
          },
          {
            usuarioId: ana.id,
            accion: 'CAMBIO_ESTADO',
            detalles: { estadoAnterior: 'PENDIENTE', estadoNuevo: 'EN_PROCESO' },
            createdAt: daysAgo(2),
          },
        ],
      },
    },
  });

  // 6. Solicitud En Proceso - Alta con Responsable
  const sol6Date = hoursAgo(5);
  await prisma.solicitud.create({
    data: {
      titulo: 'Lentitud severa en la emisión de facturación electrónica',
      descripcion: 'Los comprobantes tardan hasta 3 minutos en procesarse ante el servidor de la entidad tributaria.',
      categoria: 'Software',
      prioridad: Prioridad.ALTA,
      estado: Estado.EN_PROCESO,
      creadorId: maria.id,
      responsableId: juan.id,
      version: 2,
      createdAt: sol6Date,
      updatedAt: hoursAgo(3),
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'ALTA', estado: 'PENDIENTE' },
            createdAt: sol6Date,
          },
          {
            usuarioId: carlos.id,
            accion: 'ASIGNACION_RESPONSABLE',
            detalles: { responsableAnterior: null, responsableNuevo: juan.nombre },
            createdAt: hoursAgo(4),
          },
          {
            usuarioId: juan.id,
            accion: 'CAMBIO_ESTADO',
            detalles: { estadoAnterior: 'PENDIENTE', estadoNuevo: 'EN_PROCESO' },
            createdAt: hoursAgo(3),
          },
        ],
      },
    },
  });

  // 7. Solicitud Atendida - Normal con Responsable e Historial Completo
  const sol7Date = daysAgo(4);
  await prisma.solicitud.create({
    data: {
      titulo: 'Configuración de VPN segura para trabajo remoto',
      descripcion: 'Se requiere configurar el cliente VPN y credenciales para teletrabajo.',
      categoria: 'Seguridad',
      prioridad: Prioridad.NORMAL,
      estado: Estado.ATENDIDA,
      creadorId: maria.id,
      responsableId: juan.id,
      version: 3,
      createdAt: sol7Date,
      updatedAt: daysAgo(3),
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'NORMAL', estado: 'PENDIENTE' },
            createdAt: sol7Date,
          },
          {
            usuarioId: carlos.id,
            accion: 'ASIGNACION_RESPONSABLE',
            detalles: { responsableAnterior: null, responsableNuevo: juan.nombre },
            createdAt: daysAgo(3.8),
          },
          {
            usuarioId: juan.id,
            accion: 'CAMBIO_ESTADO',
            detalles: { estadoAnterior: 'PENDIENTE', estadoNuevo: 'EN_PROCESO' },
            createdAt: daysAgo(3.5),
          },
          {
            usuarioId: juan.id,
            accion: 'CAMBIO_ESTADO',
            detalles: {
              estadoAnterior: 'EN_PROCESO',
              estadoNuevo: 'ATENDIDA',
              nota: 'Certificados VPN instalados y validados con el usuario.',
            },
            createdAt: daysAgo(3),
          },
        ],
      },
    },
  });

  // 8. Solicitud Atendida - Alta con Responsable e Historial Completo
  const sol8Date = daysAgo(2);
  await prisma.solicitud.create({
    data: {
      titulo: 'Restauración de base de datos de pruebas (staging)',
      descripcion: 'Actualizar la base de staging con la copia sanitizada de producción del fin de semana.',
      categoria: 'Infraestructura',
      prioridad: Prioridad.ALTA,
      estado: Estado.ATENDIDA,
      creadorId: maria.id,
      responsableId: ana.id,
      version: 3,
      createdAt: sol8Date,
      updatedAt: daysAgo(1),
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'ALTA', estado: 'PENDIENTE' },
            createdAt: sol8Date,
          },
          {
            usuarioId: carlos.id,
            accion: 'ASIGNACION_RESPONSABLE',
            detalles: { responsableAnterior: null, responsableNuevo: ana.nombre },
            createdAt: daysAgo(1.8),
          },
          {
            usuarioId: ana.id,
            accion: 'CAMBIO_ESTADO',
            detalles: { estadoAnterior: 'PENDIENTE', estadoNuevo: 'EN_PROCESO' },
            createdAt: daysAgo(1.5),
          },
          {
            usuarioId: ana.id,
            accion: 'CAMBIO_ESTADO',
            detalles: {
              estadoAnterior: 'EN_PROCESO',
              estadoNuevo: 'ATENDIDA',
              nota: 'Dump restaurado y scripts de sanitización finalizados.',
            },
            createdAt: daysAgo(1),
          },
        ],
      },
    },
  });

  // 9. Solicitud Cancelada
  const sol9Date = daysAgo(5);
  await prisma.solicitud.create({
    data: {
      titulo: 'Instalación de impresora multifuncional en piso 3',
      descripcion: 'Reubicación y conexión de impresora de red en el ala oeste del piso 3.',
      categoria: 'Hardware',
      prioridad: Prioridad.BAJA,
      estado: Estado.CANCELADA,
      creadorId: maria.id,
      responsableId: null,
      version: 2,
      createdAt: sol9Date,
      updatedAt: daysAgo(4.8),
      historial: {
        create: [
          {
            usuarioId: maria.id,
            accion: 'CREACION',
            detalles: { prioridad: 'BAJA', estado: 'PENDIENTE' },
            createdAt: sol9Date,
          },
          {
            usuarioId: maria.id,
            accion: 'CAMBIO_ESTADO',
            detalles: {
              estadoAnterior: 'PENDIENTE',
              estadoNuevo: 'CANCELADA',
              motivo: 'Se canceló la reubicación física por remodelación del ala oeste.',
            },
            createdAt: daysAgo(4.8),
          },
        ],
      },
    },
  });

  console.log(' 9 solicitudes de prueba creadas con sus historiales.');
  console.log(' Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error(' Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
