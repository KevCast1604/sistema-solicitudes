import { Prioridad, Estado } from '@/lib/generated/prisma/client';

export interface SLAInfo {
  estaVencida: boolean;
  tiempoSinAtender: string | null;
  minutosTranscurridos?: number;
}

export function computeSLA(
  prioridad: Prioridad | string,
  estado: Estado | string,
  createdAt: Date | string
): SLAInfo {
  const isTerminal = estado === Estado.ATENDIDA || estado === Estado.CANCELADA;
  
  if (prioridad !== Prioridad.URGENTE || isTerminal) {
    return {
      estaVencida: false,
      tiempoSinAtender: null,
    };
  }

  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - createdTime);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const estaVencida = diffMs > 4 * 60 * 60 * 1000;
  const tiempoSinAtender = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    estaVencida,
    tiempoSinAtender,
    minutosTranscurridos: totalMinutes,
  };
}
