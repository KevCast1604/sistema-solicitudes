'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RequestTable } from '@/components/request-table';
import { RequestFilters, FilterState } from '@/components/request-filters';
import { RequestDialog } from '@/components/request-dialog';
import { RequestDetailDialog } from '@/components/request-detail-dialog';
import { SolicitudWithSLA } from '@/lib/types';
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FolderSync,
  Activity,
} from 'lucide-react';

interface UsuarioSimple {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

const DEFAULT_CATEGORIES = [
  'Infraestructura',
  'Software',
  'Hardware',
  'Seguridad',
  'Comunicaciones',
  'Accesos',
];

export default function HomePage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudWithSLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);

  // Filters & Pagination state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    estado: '',
    prioridad: '',
    categoria: '',
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });

  // Modal dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch users
  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (e) {
      console.error('Error fetching usuarios:', e);
    }
  };

  // Fetch requests from backend
  const fetchSolicitudes = useCallback(
    async (pageToLoad = pagination.currentPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageToLoad));
        params.set('limit', String(pagination.limit));

        if (filters.search.trim()) params.set('search', filters.search.trim());
        if (filters.estado) params.set('estado', filters.estado);
        if (filters.prioridad) params.set('prioridad', filters.prioridad);
        if (filters.categoria) params.set('categoria', filters.categoria);

        const res = await fetch(`/api/solicitudes?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSolicitudes(data.data);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error('Error fetching solicitudes:', err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit, pagination.currentPage]
  );

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // Debounced search / filter reload
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSolicitudes(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [filters.search, filters.estado, filters.prioridad, filters.categoria]);

  // Metrics summary
  const totalCount = pagination.total;
  const vencidasCount = solicitudes.filter((s) => s.estaVencida).length;
  const urgentesCount = solicitudes.filter((s) => s.prioridad === 'URGENTE').length;
  const pendientesCount = solicitudes.filter((s) => s.estado === 'PENDIENTE').length;
  const atendidasCount = solicitudes.filter((s) => s.estado === 'ATENDIDA').length;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              CS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                  CARLO SUBASTAS
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Test Técnico
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sistema de Gestión & Seguimiento de Solicitudes Internas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchSolicitudes()}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="Recargar listado"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nueva Solicitud</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Solicitudes</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Pendientes</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{pendientesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400">Urgentes en Curso</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{urgentesCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <FolderSync className="w-5 h-5" />
            </div>
          </div>

          <div className={`bg-white p-4 rounded-xl border shadow-xs flex items-center justify-between ${
            vencidasCount > 0 ? 'border-red-300 bg-red-50/20 ring-2 ring-red-100' : 'border-slate-200'
          }`}>
            <div>
              <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                <span>Vencidas SLA (+4h)</span>
              </p>
              <p className="text-2xl font-black text-red-700 mt-1">{vencidasCount}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              vencidasCount > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <RequestFilters
          filters={filters}
          onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
          onReset={() =>
            setFilters({
              search: '',
              estado: '',
              prioridad: '',
              categoria: '',
            })
          }
          categories={DEFAULT_CATEGORIES}
        />

        {/* Requests Table */}
        <RequestTable
          solicitudes={solicitudes}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => {
            fetchSolicitudes(page);
          }}
          onSelectSolicitud={(item) => {
            setSelectedSolicitudId(item.id);
            setIsDetailOpen(true);
          }}
        />
      </main>

      {/* Modal Creación */}
      <RequestDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          fetchSolicitudes(1);
        }}
        usuarios={usuarios}
        categories={DEFAULT_CATEGORIES}
      />

      {/* Modal Detalle e Historial */}
      <RequestDetailDialog
        solicitudId={selectedSolicitudId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedSolicitudId(null);
        }}
        onUpdated={() => {
          fetchSolicitudes(pagination.currentPage);
        }}
        usuarios={usuarios}
      />
    </div>
  );
}
