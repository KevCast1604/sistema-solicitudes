import { z } from 'zod';

export const PrioridadEnum = z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']);
export const EstadoEnum = z.enum(['PENDIENTE', 'EN_PROCESO', 'ATENDIDA', 'CANCELADA']);

export const createSolicitudSchema = z.object({
  titulo: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(150, 'El título no debe exceder 150 caracteres'),
  descripcion: z
    .string()
    .min(5, 'La descripción debe tener al menos 5 caracteres'),
  categoria: z
    .string()
    .min(2, 'La categoría debe tener al menos 2 caracteres')
    .max(50, 'La categoría no debe exceder 50 caracteres'),
  prioridad: PrioridadEnum.default('NORMAL'),
  creadorId: z.string().uuid('El ID de creador debe ser un UUID válido'),
  responsableId: z.string().uuid('El ID de responsable debe ser un UUID válido').nullable().optional(),
});

export const updateSolicitudSchema = z.object({
  version: z.number().int().min(1, 'El número de versión es requerido para control de concurrencia'),
  usuarioId: z.string().uuid('El usuario que realiza la modificación es requerido'),
  titulo: z.string().min(3).max(150).optional(),
  descripcion: z.string().min(5).optional(),
  categoria: z.string().min(2).max(50).optional(),
  prioridad: PrioridadEnum.optional(),
  estado: EstadoEnum.optional(),
  responsableId: z.string().uuid().nullable().optional(),
  nota: z.string().optional(),
});

export const querySolicitudesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  estado: EstadoEnum.optional(),
  prioridad: PrioridadEnum.optional(),
  categoria: z.string().optional(),
  responsableId: z.string().uuid().optional(),
});

export type CreateSolicitudInput = z.infer<typeof createSolicitudSchema>;
export type UpdateSolicitudInput = z.infer<typeof updateSolicitudSchema>;
export type QuerySolicitudesInput = z.infer<typeof querySolicitudesSchema>;
