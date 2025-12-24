
import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { exportLeadsToCSV } from '../utils/csvExporter';

interface Props {
  leads: Lead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMultiple: (ids: string[]) => void;
  onLeadAction: (lead: Lead) => void;
  onOpenInteraction: (lead: Lead, type: 'responded' | 'not_interested') => void;
}

export const LeadTable: React.FC<Props> = ({ 
  leads, 
  selectedIds, 
  onToggleSelect, 
  onSelectMultiple,
  onLeadAction,
  onOpenInteraction
}) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesText = 
        lead.nombreComercial.toLowerCase().includes(filter.toLowerCase()) ||
        lead.personaContacto.toLowerCase().includes(filter.toLowerCase()) ||
        lead.canton.toLowerCase().includes(filter.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      
      return matchesText && matchesStatus;
    });
  }, [leads, filter, statusFilter]);

  const handleSelectAllVisible = () => {
    const ids = filteredLeads.map(l => l.id);
    onSelectMultiple(ids);
  };

  const handleSelectFirst20Pending = () => {
    const pendingLeads = filteredLeads.filter(l => l.status === 'pending');
    const ids = pendingLeads.slice(0, 20).map(l => l.id);
    
    if (ids.length === 0) {
      alert("No hay leads pendientes en la vista actual.");
    }
    
    onSelectMultiple(ids);
  };

  const handleClearSelection = () => {
    onSelectMultiple([]);
  };

  const handleExport = () => {
    exportLeadsToCSV(leads);
  };

  const getStatusBadge = (status: Lead['status']) => {
    switch(status) {
      case 'pending': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">Pendiente</span>;
      case 'initial_sent': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">Mensaje Enviado</span>;
      case 'responded': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Respondió</span>;
      case 'not_interested': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">No Interesado</span>;
      case 'converted': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">Cliente</span>;
      case 'contacted': return <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-semibold">Contactado</span>;
      case 'no_whatsapp': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold border border-yellow-200">Sin WhatsApp</span>;
      default: return <span className="bg-gray-50 text-gray-400 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Estado:</label>
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-brand-500 bg-white text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">Pendientes (Por contactar)</option>
              <option value="initial_sent">Ya Contactados</option>
              <option value="responded">Respondieron</option>
              <option value="not_interested">No Interesados</option>
              <option value="no_whatsapp">Sin WhatsApp</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-sm border-t pt-3 border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 mr-2">
              {selectedIds.size} seleccionados
            </span>
            {selectedIds.size > 0 ? (
              <button 
                onClick={handleClearSelection}
                className="text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded"
              >
                Limpiar selección
              </button>
            ) : (
              <>
                <button 
                  onClick={handleSelectFirst20Pending}
                  className="bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 px-3 py-1 rounded shadow-sm transition-colors font-medium"
                >
                  Seleccionar Siguientes 20 Pendientes
                </button>
                <button 
                  onClick={handleSelectAllVisible}
                  className="text-gray-600 hover:text-gray-800 px-2 py-1"
                >
                  Seleccionar todos en vista
                </button>
              </>
            )}
          </div>
          
          <button 
            onClick={handleExport}
            className="flex items-center gap-1 text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded border border-green-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar Excel (Backup Rápido)
          </button>
        </div>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="min-w-full divide-y divide-gray-200 relative">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left w-10">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size > 0 && selectedIds.size === filteredLeads.length}
                  onChange={(e) => e.target.checked ? handleSelectAllVisible() : handleClearSelection()}
                  className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negocio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto / Notas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLeads.length === 0 && (
               <tr>
                 <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                   No se encontraron registros con los filtros actuales.
                 </td>
               </tr>
            )}
            {filteredLeads.map((lead) => {
              const isSelected = selectedIds.has(lead.id);
              // Ahora incluimos 'no_whatsapp' para permitir registrar llamadas manuales
              const hasBeenContacted = lead.status === 'initial_sent' || lead.status === 'responded' || lead.status === 'not_interested' || lead.status === 'no_whatsapp';
              
              return (
                <tr 
                  key={lead.id} 
                  className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-brand-50' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    onToggleSelect(lead.id);
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => onToggleSelect(lead.id)}
                      className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.nombreComercial}</div>
                    <div className="text-xs text-gray-500">{lead.actividad}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="text-sm text-gray-900 font-medium">{lead.personaContacto || lead.razonSocial}</div>
                       {lead.emailSynced && (
                         <span className="text-green-500" title="Sincronizado con Email Marketing">
                           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                         </span>
                       )}
                    </div>
                    {lead.lastInteractionNote && (
                      <div className="mt-1 text-xs text-gray-600 bg-yellow-50 p-1 rounded border border-yellow-100 inline-block max-w-xs truncate" title={lead.lastInteractionNote}>
                         📝 {lead.lastInteractionNote}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{lead.canton}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(lead.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {hasBeenContacted ? (
                        <>
                          <button 
                             onClick={(e) => { e.stopPropagation(); onOpenInteraction(lead, 'responded'); }}
                             className="text-green-600 hover:text-green-800 bg-green-50 px-2 py-1 rounded text-xs border border-green-200"
                             title="Registrar que contestaron"
                          >
                            🗣️ Respondió
                          </button>
                          <button 
                             onClick={(e) => { e.stopPropagation(); onOpenInteraction(lead, 'not_interested'); }}
                             className="text-red-600 hover:text-red-800 bg-red-50 px-2 py-1 rounded text-xs border border-red-200"
                             title="Registrar que no interesa"
                          >
                            ⛔ No
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onLeadAction(lead); }}
                          className="text-brand-600 hover:text-brand-800 bg-brand-50 px-3 py-1 rounded text-xs border border-brand-200 font-bold"
                        >
                          Enviar WhatsApp
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
