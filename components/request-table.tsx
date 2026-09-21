'use client';

import React from 'react';
import { EstadoBadge, PrioridadBadge, SlaAlertBadge } from './status-badge';
import { SolicitudWithSLA } from '@/lib/types';
import { Eye, ChevronLeft, ChevronRight, Inbox, User as UserIcon } from 'lucide-react';

interface RequestTableProps {
  solicitudes: SolicitudWithSLA[];
  loading: boolean;
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  onPageChange: (page: number) => void;
  onSelectSolicitud: (solicitud: SolicitudWithSLA) => void;
}

export function RequestTable({
  solicitudes,
  loading,
  pagination,
  onPageChange,
  onSelectSolicitud,
}: RequestTableProps) {
  const formatDate = (dateString: Date | string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3.5">Solicitud</th>
              <th className="px-4 py-3.5">Categoría</th>
              <th className="px-4 py-3.5">Prioridad</th>
              <th className="px-4 py-3.5">Estado / Alerta</th>
              <th className="px-4 py-3.5">Creador</th>
              <th className="px-4 py-3.5">Responsable</th>
              <th className="px-4 py-3.5">Fecha Creación</th>
              <th className="px-5 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-5 py-4">
                    <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-72" />
                  </td>
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-16" /></td>
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                  <td className="px-5 py-4 text-right"><div className="h-7 bg-slate-100 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : solicitudes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
                  <p className="text-sm font-medium text-slate-600">No se encontraron solicitudes</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Prueba ajustando los filtros de búsqueda o registra una nueva solicitud.
                  </p>
                </td>
              </tr>
            ) : (
              solicitudes.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectSolicitud(item)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    item.estaVencida ? 'bg-red-50/30' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 max-w-xs">
                    <div className="font-semibold text-slate-800 line-clamp-1">
                      {item.titulo}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {item.descripcion}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                      {item.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <PrioridadBadge prioridad={item.prioridad} />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <EstadoBadge estado={item.estado} />
                      <SlaAlertBadge
                        estaVencida={item.estaVencida}
                        tiempoSinAtender={item.tiempoSinAtender}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {item.creador?.nombre?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-800">
                          {item.creador?.nombre || 'Desconocido'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.creador?.rol}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                    {item.responsable ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                          {item.responsable.nombre.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-800">
                            {item.responsable.nombre}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.responsable.rol}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 italic">
                        <UserIcon className="w-3.5 h-3.5" />
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSolicitud(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
        <div>
          Mostrando{' '}
          <span className="font-semibold text-slate-700">
            {pagination.total === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1}
          </span>{' '}
          a{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(pagination.currentPage * pagination.limit, pagination.total)}
          </span>{' '}
          de <span className="font-semibold text-slate-700">{pagination.total}</span> solicitudes
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage <= 1 || loading}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium text-slate-700">
            {pagination.currentPage} / {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages || loading}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Página siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
