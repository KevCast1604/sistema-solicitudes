'use client';

import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';

export interface FilterState {
  search: string;
  estado: string;
  prioridad: string;
  categoria: string;
}

interface RequestFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onReset: () => void;
  categories: string[];
}

export function RequestFilters({
  filters,
  onFilterChange,
  onReset,
  categories,
}: RequestFiltersProps) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    Boolean(filters.estado) ||
    Boolean(filters.prioridad) ||
    Boolean(filters.categoria);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtros y Búsqueda</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Búsqueda general */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filtro por Estado */}
        <div>
          <select
            value={filters.estado}
            onChange={(e) => onFilterChange({ estado: e.target.value })}
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="ATENDIDA">Atendida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        {/* Filtro por Prioridad */}
        <div>
          <select
            value={filters.prioridad}
            onChange={(e) => onFilterChange({ prioridad: e.target.value })}
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"
          >
            <option value="">Todas las Prioridades</option>
            <option value="URGENTE">Urgente (SLA)</option>
            <option value="ALTA">Alta</option>
            <option value="NORMAL">Normal</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>

        {/* Filtro por Categoría */}
        <div>
          <select
            value={filters.categoria}
            onChange={(e) => onFilterChange({ categoria: e.target.value })}
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700"
          >
            <option value="">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
