import { prisma } from '@/lib/prisma';
import { Estado, Prioridad } from '@/lib/generated/prisma/client';
import {
  CreateSolicitudInput,
  UpdateSolicitudInput,
  QuerySolicitudesInput,
} from '@/lib/validations/solicitud';
import {
  isValidTransition,
  isTerminalState,
} from '@/lib/state-machine';
import { computeSLA, SLAInfo } from '@/lib/utils/sla';

export class ServiceError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface SolicitudWithSLA {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: Prioridad;
  estado: Estado;
  creadorId: string;
  responsableId: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  estaVencida: boolean;
  tiempoSinAtender: string | null;
  creador?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  responsable?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  } | null;
  historial?: Array<{
    id: string;
    solicitudId: string;
    usuarioId: string;
    accion: string;
    detalles: unknown;
    createdAt: Date;
    usuario?: {
      id: string;
      nombre: string;
      email: string;
      rol: string;
    };
  }>;
}

export class SolicitudesService {
  /**
   * Listar solicitudes con filtros dinámicos en backend, paginación y cálculo de SLA
   */
  static async list(params: QuerySolicitudesInput) {
    const { page, limit, search, estado, prioridad, categoria, responsableId } = params;
    const skip = (page - 1) * limit;

    // Construcción de cláusula WHERE de Prisma
    const where: Record<string, unknown> = {};

    if (estado) {
      where.estado = estado;
    }

    if (prioridad) {
      where.prioridad = prioridad;
    }

    if (categoria && categoria.trim() !== '') {
      where.categoria = {
        contains: categoria.trim(),
        mode: 'insensitive',
      };
    }

    if (responsableId) {
      where.responsableId = responsableId;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { titulo: { contains: term, mode: 'insensitive' } },
        { descripcion: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, solicitudes] = await Promise.all([
      prisma.solicitud.count({ where }),
      prisma.solicitud.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          creador: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          responsable: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
        },
      }),
    ]);

    const data: SolicitudWithSLA[] = solicitudes.map((item) => {
      const sla: SLAInfo = computeSLA(item.prioridad, item.estado, item.createdAt);
      return {
        ...item,
        estaVencida: sla.estaVencida,
        tiempoSinAtender: sla.tiempoSinAtender,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Obtener detalle de una solicitud con historial completo ordenado cronológicamente desc
   */
  static async getById(id: string): Promise<SolicitudWithSLA> {
    const solicitud = await prisma.solicitud.findUnique({
      where: { id },
      include: {
        creador: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        responsable: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
        historial: {
          include: {
            usuario: {
              select: { id: true, nombre: true, email: true, rol: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!solicitud) {
      throw new ServiceError(404, 'Solicitud no encontrada');
    }

    const sla: SLAInfo = computeSLA(solicitud.prioridad, solicitud.estado, solicitud.createdAt);

    return {
      ...solicitud,
      estaVencida: sla.estaVencida,
      tiempoSinAtender: sla.tiempoSinAtender,
    };
  }

  /**
   * Crear nueva solicitud en estado PENDIENTE y registrar historial atómico
   */
  static async create(input: CreateSolicitudInput): Promise<SolicitudWithSLA> {
    // Validar creador
    const creador = await prisma.usuario.findUnique({
      where: { id: input.creadorId },
    });
    if (!creador) {
      throw new ServiceError(404, 'El usuario creador no existe');
    }

    // Validar responsable si fue enviado
    if (input.responsableId) {
      const resp = await prisma.usuario.findUnique({
        where: { id: input.responsableId },
      });
      if (!resp) {
        throw new ServiceError(404, 'El usuario responsable asignado no existe');
      }
    }

    // Transacción atómica: Crear solicitud + Historial de CREACION
    const nuevaSolicitud = await prisma.$transaction(async (tx) => {
      const created = await tx.solicitud.create({
        data: {
          titulo: input.titulo,
          descripcion: input.descripcion,
          categoria: input.categoria,
          prioridad: input.prioridad as Prioridad,
          estado: Estado.PENDIENTE,
          creadorId: input.creadorId,
          responsableId: input.responsableId ?? null,
          version: 1,
        },
      });

      await tx.historial.create({
        data: {
          solicitudId: created.id,
          usuarioId: input.creadorId,
          accion: 'CREACION',
          detalles: {
            titulo: input.titulo,
            categoria: input.categoria,
            prioridad: input.prioridad,
            estado: Estado.PENDIENTE,
            responsableId: input.responsableId ?? null,
          },
        },
      });

      return tx.solicitud.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          creador: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          responsable: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
        },
      });
    });

    const sla = computeSLA(nuevaSolicitud.prioridad, nuevaSolicitud.estado, nuevaSolicitud.createdAt);

    return {
      ...nuevaSolicitud,
      estaVencida: sla.estaVencida,
      tiempoSinAtender: sla.tiempoSinAtender,
    };
  }

  /**
   * Actualizar solicitud con control de concurrencia optimista (versión)
   * y validación estricta de reglas de negocio
   */
  static async update(id: string, input: UpdateSolicitudInput): Promise<SolicitudWithSLA> {
    const current = await prisma.solicitud.findUnique({
      where: { id },
      include: {
        creador: true,
        responsable: true,
      },
    });

    if (!current) {
      throw new ServiceError(404, 'Solicitud no encontrada');
    }

    // Verificar usuario ejecutor
    const usuarioEjecutor = await prisma.usuario.findUnique({
      where: { id: input.usuarioId },
    });
    if (!usuarioEjecutor) {
      throw new ServiceError(404, 'El usuario que realiza la operación no existe');
    }

    // 1. Regla: Solicitudes en estado terminal no pueden modificarse
    if (isTerminalState(current.estado)) {
      throw new ServiceError(
        400,
        `La solicitud está en estado ${current.estado} (final) y no puede ser modificada.`
      );
    }

    // 2. Regla: Validación de transiciones de estado
    if (input.estado && input.estado !== current.estado) {
      if (!isValidTransition(current.estado, input.estado as Estado)) {
        throw new ServiceError(
          400,
          `Transición no permitida: no es válido pasar de ${current.estado} a ${input.estado}.`
        );
      }

      // 3. Regla: No puede pasar a ATENDIDA sin responsable asignado
      const targetResponsable =
        input.responsableId !== undefined ? input.responsableId : current.responsableId;
      if (input.estado === Estado.ATENDIDA && !targetResponsable) {
        throw new ServiceError(
          400,
          'Una solicitud no puede pasar a ATENDIDA sin un responsable asignado.'
        );
      }
    }

    // Si se asigna un responsable, validar que exista
    let nuevoResponsableNombre: string | null = null;
    if (input.responsableId !== undefined && input.responsableId !== null) {
      const respUser = await prisma.usuario.findUnique({
        where: { id: input.responsableId },
      });
      if (!respUser) {
        throw new ServiceError(404, 'El usuario asignado como responsable no existe');
      }
      nuevoResponsableNombre = respUser.nombre;
    }

    // 4. Preparar datos a actualizar
    const dataToUpdate: Record<string, unknown> = {};
    if (input.titulo !== undefined) dataToUpdate.titulo = input.titulo;
    if (input.descripcion !== undefined) dataToUpdate.descripcion = input.descripcion;
    if (input.categoria !== undefined) dataToUpdate.categoria = input.categoria;
    if (input.prioridad !== undefined) dataToUpdate.prioridad = input.prioridad as Prioridad;
    if (input.estado !== undefined) dataToUpdate.estado = input.estado as Estado;
    if (input.responsableId !== undefined) dataToUpdate.responsableId = input.responsableId;

    // 5. Transacción atómica con Bloqueo Optimista (Optimistic Concurrency Control)
    const updatedRecord = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.solicitud.updateMany({
        where: {
          id,
          version: input.version,
        },
        data: {
          ...dataToUpdate,
          version: { increment: 1 },
        },
      });

      // Si count es 0, otro usuario modificó la solicitud antes
      if (updateResult.count === 0) {
        throw new ServiceError(
          409,
          'La solicitud fue modificada por otro usuario. Por favor recarga los datos para ver la versión actualizada.'
        );
      }

      // Registrar auditoría en Historial
      // Detectar cambios específicos
      const historialesACrear = [];

      // A. Cambio de estado
      if (input.estado && input.estado !== current.estado) {
        historialesACrear.push({
          solicitudId: id,
          usuarioId: input.usuarioId,
          accion: 'CAMBIO_ESTADO',
          detalles: {
            estadoAnterior: current.estado,
            estadoNuevo: input.estado,
            nota: input.nota || undefined,
          },
        });
      }

      // B. Asignación o reasignación de responsable
      if (input.responsableId !== undefined && input.responsableId !== current.responsableId) {
        historialesACrear.push({
          solicitudId: id,
          usuarioId: input.usuarioId,
          accion: 'ASIGNACION_RESPONSABLE',
          detalles: {
            responsableAnterior: current.responsable?.nombre || null,
            responsableNuevo: nuevoResponsableNombre,
            responsableId: input.responsableId,
            nota: input.nota || undefined,
          },
        });
      }

      // C. Edición de datos de contenido
      const cambiosDatos: Record<string, { anterior: unknown; nuevo: unknown }> = {};
      if (input.titulo !== undefined && input.titulo !== current.titulo) {
        cambiosDatos.titulo = { anterior: current.titulo, nuevo: input.titulo };
      }
      if (input.descripcion !== undefined && input.descripcion !== current.descripcion) {
        cambiosDatos.descripcion = { anterior: current.descripcion, nuevo: input.descripcion };
      }
      if (input.categoria !== undefined && input.categoria !== current.categoria) {
        cambiosDatos.categoria = { anterior: current.categoria, nuevo: input.categoria };
      }
      if (input.prioridad !== undefined && input.prioridad !== current.prioridad) {
        cambiosDatos.prioridad = { anterior: current.prioridad, nuevo: input.prioridad };
      }

      if (Object.keys(cambiosDatos).length > 0) {
        historialesACrear.push({
          solicitudId: id,
          usuarioId: input.usuarioId,
          accion: 'EDICION_DATOS',
          detalles: {
            cambios: cambiosDatos,
            nota: input.nota || undefined,
          },
        });
      }

      // D. Si sólo se envió nota sin otros cambios
      if (historialesACrear.length === 0 && input.nota) {
        historialesACrear.push({
          solicitudId: id,
          usuarioId: input.usuarioId,
          accion: 'COMENTARIO',
          detalles: {
            nota: input.nota,
          },
        });
      }

      for (const h of historialesACrear) {
        await tx.historial.create({
          data: {
            solicitudId: h.solicitudId,
            usuarioId: h.usuarioId,
            accion: h.accion,
            detalles: h.detalles as any,
          },
        });
      }

      return tx.solicitud.findUniqueOrThrow({
        where: { id },
        include: {
          creador: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          responsable: {
            select: { id: true, nombre: true, email: true, rol: true },
          },
          historial: {
            include: {
              usuario: {
                select: { id: true, nombre: true, email: true, rol: true },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    });

    const sla = computeSLA(updatedRecord.prioridad, updatedRecord.estado, updatedRecord.createdAt);

    return {
      ...updatedRecord,
      estaVencida: sla.estaVencida,
      tiempoSinAtender: sla.tiempoSinAtender,
    };
  }
}
