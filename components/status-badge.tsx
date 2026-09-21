import React from 'react';
import { Estado, Prioridad } from '@/lib/types';
import { Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRightCircle } from 'lucide-react';

interface EstadoBadgeProps {
  estado: Estado | string;
  className?: string;
}

export function EstadoBadge({ estado, className = '' }: EstadoBadgeProps) {
  switch (estado) {
    case Estado.PENDIENTE:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Pendiente
        </span>
      );
    case Estado.EN_PROCESO:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
        >
          <ArrowRightCircle className="w-3.5 h-3.5 text-blue-600" />
          En proceso
        </span>
      );
    case Estado.ATENDIDA:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Atendida
        </span>
      );
    case Estado.CANCELADA:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-slate-500" />
          Cancelada
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
          {estado}
        </span>
      );
  }
}

interface PrioridadBadgeProps {
  prioridad: Prioridad | string;
  className?: string;
}

export function PrioridadBadge({ prioridad, className = '' }: PrioridadBadgeProps) {
  switch (prioridad) {
    case Prioridad.URGENTE:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
          Urgente
        </span>
      );
    case Prioridad.ALTA:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 ${className}`}
        >
          Alta
        </span>
      );
    case Prioridad.NORMAL:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          Normal
        </span>
      );
    case Prioridad.BAJA:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-normal bg-gray-50 text-gray-600 border border-gray-200 ${className}`}
        >
          Baja
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 ${className}`}>
          {prioridad}
        </span>
      );
  }
}

interface SlaAlertBadgeProps {
  estaVencida: boolean;
  tiempoSinAtender: string | null;
  className?: string;
}

export function SlaAlertBadge({ estaVencida, tiempoSinAtender, className = '' }: SlaAlertBadgeProps) {
  if (estaVencida) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-600 text-white shadow-sm ring-2 ring-red-200 ${className}`}
        title={`Tiempo sin atender: ${tiempoSinAtender || '+4h'}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
        <span>VENCIDA (+4h)</span>
        {tiempoSinAtender && (
          <span className="text-[10px] font-mono bg-red-700 px-1 py-0.5 rounded text-red-100">
            {tiempoSinAtender}
          </span>
        )}
      </div>
    );
  }

  if (tiempoSinAtender) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 ${className}`}
      >
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Sin atender: {tiempoSinAtender}</span>
      </span>
    );
  }

  return null;
}
