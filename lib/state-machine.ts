import { Estado } from '@/lib/generated/prisma/enums';

export const VALID_TRANSITIONS: Record<Estado, Estado[]> = {
  [Estado.PENDIENTE]: [Estado.EN_PROCESO, Estado.CANCELADA],
  [Estado.EN_PROCESO]: [Estado.ATENDIDA, Estado.PENDIENTE, Estado.CANCELADA],
  [Estado.ATENDIDA]: [],
  [Estado.CANCELADA]: [],
};

/**
 * Determina si un estado es terminal (no permite más cambios de estado ni de contenido)
 */
export function isTerminalState(estado: Estado): boolean {
  return estado === Estado.ATENDIDA || estado === Estado.CANCELADA;
}

/**
 * Valida si la transición de estado es válida según las reglas de negocio
 */
export function isValidTransition(current: Estado, next: Estado): boolean {
  if (current === next) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Valida si se puede editar el contenido de una solicitud (título, descripción, etc.)
 */
export function canEditSolicitud(estado: Estado): boolean {
  return !isTerminalState(estado);
}

/**
 * Valida si se puede asignar un responsable
 */
export function canAssignResponsable(estado: Estado): boolean {
  return !isTerminalState(estado);
}

/**
 * Valida si la solicitud puede ser cancelada
 */
export function canCancelSolicitud(estado: Estado): boolean {
  return estado === Estado.PENDIENTE || estado === Estado.EN_PROCESO;
}

/**
 * Devuelve los estados permitidos a los que puede transicionar la solicitud
 */
export function getAvailableTransitions(current: Estado, hasResponsable: boolean): Estado[] {
  const allowed = VALID_TRANSITIONS[current] || [];
  if (!hasResponsable) {
    // No puede transicionar a ATENDIDA si no tiene responsable asignado
    return allowed.filter((estado) => estado !== Estado.ATENDIDA);
  }
  return allowed;
}
