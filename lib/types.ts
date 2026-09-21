export { Estado, Prioridad } from '@/lib/generated/prisma/enums';
import type { Estado, Prioridad } from '@/lib/generated/prisma/enums';

export interface UsuarioSimple {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface HistorialItem {
  id: string;
  solicitudId: string;
  usuarioId: string;
  accion: string;
  detalles: any;
  createdAt: Date | string;
  usuario?: UsuarioSimple;
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
  createdAt: Date | string;
  updatedAt: Date | string;
  estaVencida: boolean;
  tiempoSinAtender: string | null;
  creador?: UsuarioSimple;
  responsable?: UsuarioSimple | null;
  historial?: HistorialItem[];
}
