'use client';

import React, { useState, useEffect } from 'react';
import { Estado, Prioridad, SolicitudWithSLA } from '@/lib/types';
import { EstadoBadge, PrioridadBadge, SlaAlertBadge } from './status-badge';
import { getAvailableTransitions, isTerminalState } from '@/lib/state-machine';
import {
  X,
  Clock,
  UserCheck,
  History,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  Loader2,
  Tag,
  Calendar,
  Layers,
} from 'lucide-react';

interface UsuarioSimple {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface RequestDetailDialogProps {
  solicitudId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  usuarios: UsuarioSimple[];
}

export function RequestDetailDialog({
  solicitudId,
  isOpen,
  onClose,
  onUpdated,
  usuarios,
}: RequestDetailDialogProps) {
  const [solicitud, setSolicitud] = useState<SolicitudWithSLA | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form controls
  const [selectedResponsableId, setSelectedResponsableId] = useState<string>('');
  const [currentUserOperatorId, setCurrentUserOperatorId] = useState<string>('');
  const [notaAccion, setNotaAccion] = useState<string>('');

  // Fetch solicitud details
  const fetchDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    setConflictError(false);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/solicitudes/${id}`);
      if (!res.ok) {
        throw new Error('Error al cargar la información de la solicitud');
      }
      const data: SolicitudWithSLA = await res.json();
      setSolicitud(data);
      setSelectedResponsableId(data.responsableId || '');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar los detalles');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && solicitudId) {
      fetchDetail(solicitudId);
    }
  }, [isOpen, solicitudId]);

  useEffect(() => {
    if (usuarios.length > 0 && !currentUserOperatorId) {
      setCurrentUserOperatorId(usuarios[0].id);
    }
  }, [usuarios, currentUserOperatorId]);

  if (!isOpen || !solicitudId) return null;

  const terminal = solicitud ? isTerminalState(solicitud.estado) : false;
  const availableTransitions = solicitud
    ? getAvailableTransitions(solicitud.estado, Boolean(solicitud.responsableId))
    : [];

  const handleUpdate = async (updatePayload: {
    estado?: Estado;
    responsableId?: string | null;
  }) => {
    if (!solicitud) return;
    setError(null);
    setConflictError(false);
    setSuccessMessage(null);
    setUpdating(true);

    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: solicitud.version, // Clave para control de concurrencia optimista
          usuarioId: currentUserOperatorId,
          nota: notaAccion.trim() || undefined,
          ...updatePayload,
        }),
      });

      const responseData = await res.json();

      if (res.status === 409) {
        setConflictError(true);
        setError(
          'La solicitud fue modificada por otro usuario mientras la consultabas. Por favor recarga los datos para sincronizarte.'
        );
        return;
      }

      if (!res.ok) {
        throw new Error(responseData.error || 'No se pudo actualizar la solicitud');
      }

      setSolicitud(responseData);
      setSelectedResponsableId(responseData.responsableId || '');
      setNotaAccion('');
      setSuccessMessage('¡Cambio guardado y registrado en el historial de auditoría!');
      onUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al actualizar');
      }
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: Date | string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                v{solicitud?.version || 1}
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {solicitudId}</span>
              {solicitud && (
                <>
                  <EstadoBadge estado={solicitud.estado} />
                  <PrioridadBadge prioridad={solicitud.prioridad} />
                  <SlaAlertBadge
                    estaVencida={solicitud.estaVencida}
                    tiempoSinAtender={solicitud.tiempoSinAtender}
                  />
                </>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 line-clamp-1">
              {solicitud?.titulo || 'Cargando solicitud...'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm">Obteniendo detalles e historial de la solicitud...</p>
            </div>
          ) : !solicitud ? (
            <div className="py-12 text-center text-red-500">
              <p>No se pudo cargar la información de la solicitud.</p>
            </div>
          ) : (
            <>
              {/* Conflict / Error alerts */}
              {conflictError && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start justify-between gap-3 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Conflicto de Modificación Simultánea (HTTP 409)</h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Otro usuario ha modificado esta solicitud. Tu versión actual (v{solicitud.version}) ha quedado obsoleta.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fetchDetail(solicitud.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors shadow-sm shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Recargar Versión Nueva
                  </button>
                </div>
              )}

              {error && !conflictError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Grid: Details & Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left col: Details */}
                <div className="md:col-span-2 space-y-4">
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Descripción de la Solicitud</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {solicitud.descripcion}
                    </p>
                  </div>

                  {/* Metadata cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        Categoría
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1">
                        {solicitud.categoria}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Fecha Creación
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1 font-mono">
                        {formatDate(solicitud.createdAt)}
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 col-span-2 sm:col-span-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        Creado Por
                      </div>
                      <div className="text-xs font-semibold text-slate-800 mt-1">
                        {solicitud.creador?.nombre || 'Desconocido'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {solicitud.creador?.rol} ({solicitud.creador?.email})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right col: State Actions & Assignment */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Panel de Control
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        v{solicitud.version}
                      </span>
                    </div>

                    {/* Usuario operador */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Tu Usuario (Operador actual)
                      </label>
                      <select
                        value={currentUserOperatorId}
                        onChange={(e) => setCurrentUserOperatorId(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {usuarios.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} ({u.rol})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Asignación de responsable */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Responsable Asignado
                      </label>
                      <div className="space-y-2">
                        <select
                          disabled={terminal || updating}
                          value={selectedResponsableId}
                          onChange={(e) => setSelectedResponsableId(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-100"
                        >
                          <option value="">-- Sin Responsable --</option>
                          {usuarios.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre} ({u.rol})
                            </option>
                          ))}
                        </select>
                        {!terminal && (
                          <button
                            type="button"
                            disabled={updating || selectedResponsableId === (solicitud.responsableId || '')}
                            onClick={() =>
                              handleUpdate({
                                responsableId: selectedResponsableId || null,
                              })
                            }
                            className="w-full text-xs font-semibold py-1.5 px-3 bg-slate-800 text-white hover:bg-slate-900 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Guardar Responsable
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nota para la acción */}
                    {!terminal && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Nota u Observación de Auditoría
                        </label>
                        <input
                          type="text"
                          value={notaAccion}
                          onChange={(e) => setNotaAccion(e.target.value)}
                          placeholder="Ej: Se coordinó con soporte..."
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {/* Transiciones de Estado según Máquina de Estados */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-500">
                        Cambiar Estado (Máquina de Estados)
                      </label>

                      {terminal ? (
                        <div className="p-2.5 rounded-lg bg-slate-200/70 text-slate-600 text-[11px] font-medium text-center">
                          Esta solicitud está en estado <strong>{solicitud.estado}</strong> y no admite más transiciones.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {availableTransitions.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              No hay transiciones válidas disponibles.
                            </p>
                          ) : (
                            availableTransitions.map((nextEstado) => {
                              const isPassingToAtendida = nextEstado === Estado.ATENDIDA;
                              const missingResponsable = isPassingToAtendida && !solicitud.responsableId;

                              return (
                                <button
                                  key={nextEstado}
                                  type="button"
                                  disabled={updating || missingResponsable}
                                  onClick={() => handleUpdate({ estado: nextEstado })}
                                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                                    nextEstado === Estado.ATENDIDA
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-300'
                                      : nextEstado === Estado.EN_PROCESO
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : nextEstado === Estado.CANCELADA
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                      : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                                  }`}
                                  title={
                                    missingResponsable
                                      ? 'Obligatorio asignar responsable antes de pasar a Atendida'
                                      : `Cambiar a ${nextEstado}`
                                  }
                                >
                                  <span>Pasar a {nextEstado.replace('_', ' ')}</span>
                                  {missingResponsable && (
                                    <span className="text-[10px] font-normal underline">
                                      Falta Responsable
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inmutable Audit Log Timeline */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Historial Inmutable de Cambios (Audit Log)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {solicitud.historial?.length || 0} registros registrados
                  </span>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {solicitud.historial && solicitud.historial.length > 0 ? (
                    solicitud.historial.map((item) => {
                      const detalles = (item.detalles || {}) as Record<string, any>;

                      return (
                        <div key={item.id} className="relative group">
                          {/* Dot indicator */}
                          <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />

                          <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                                  {item.accion}
                                </span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {item.usuario?.nombre || 'Sistema'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({item.usuario?.rol})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>

                            {/* Detalle visual según acción */}
                            {item.accion === 'CAMBIO_ESTADO' && Boolean(detalles.estadoNuevo) && (
                              <div className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                                <span>Estado:</span>
                                <EstadoBadge estado={String(detalles.estadoAnterior || 'N/A')} />
                                <span>➔</span>
                                <EstadoBadge estado={String(detalles.estadoNuevo || 'N/A')} />
                              </div>
                            )}

                            {item.accion === 'ASIGNACION_RESPONSABLE' && (
                              <div className="text-xs text-slate-600 mt-1">
                                Asignación de responsable: de{' '}
                                <strong className="text-slate-800">
                                  {String(detalles.responsableAnterior || 'Sin asignar')}
                                </strong>{' '}
                                a{' '}
                                <strong className="text-slate-800">
                                  {String(detalles.responsableNuevo || 'Sin asignar')}
                                </strong>
                              </div>
                            )}

                            {item.accion === 'CREACION' && (
                              <div className="text-xs text-slate-600 mt-1">
                                Solicitud creada con categoría{' '}
                                <span className="font-semibold">{String(detalles.categoria || '')}</span> y prioridad{' '}
                                <span className="font-semibold">{String(detalles.prioridad || '')}</span>.
                              </div>
                            )}

                            {item.accion === 'EDICION_DATOS' && Boolean(detalles.cambios) && (
                              <div className="text-xs text-slate-600 mt-1 space-y-1">
                                <div>Campos modificados:</div>
                                <pre className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 overflow-x-auto text-slate-700">
                                  {JSON.stringify(detalles.cambios, null, 2)}
                                </pre>
                              </div>
                            )}

                            {Boolean(detalles.nota) && (
                              <div className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100 mt-1">
                                &ldquo;{String(detalles.nota)}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 italic">No hay historial registrado.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50/50">
          <span className="text-xs text-slate-400">
            Audit Log Append-Only: Los registros de historial son inmutables.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
