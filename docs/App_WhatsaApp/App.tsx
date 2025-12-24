
import React, { useState, useEffect } from 'react';
import { CSV_RAW_DATA } from './data/initialData';
import { parseCSV } from './utils/csvParser';
import { Lead } from './types';
import { LeadTable } from './components/LeadTable';
import { WhatsAppGenerator } from './components/WhatsAppGenerator';
import { BatchWhatsAppSender } from './components/BatchWhatsAppSender';
import { EmailExportView } from './components/EmailExportView';
import { BackupManager } from './components/BackupManager';
import { InteractionModal } from './components/InteractionModal';

type View = 'dashboard' | 'email';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Interaction Modal State
  const [interactionTarget, setInteractionTarget] = useState<{lead: Lead, type: Lead['status']} | null>(null);

  // Load data from LocalStorage or CSV on mount
  useEffect(() => {
    const savedLeads = localStorage.getItem('turismo_crm_leads');
    if (savedLeads) {
      try {
        setLeads(JSON.parse(savedLeads));
      } catch (e) {
        console.error("Failed to parse saved leads", e);
        setLeads(parseCSV(CSV_RAW_DATA));
      }
    } else {
      setLeads(parseCSV(CSV_RAW_DATA));
    }
    setDataLoaded(true);
  }, []);

  // Save data to LocalStorage whenever it changes
  useEffect(() => {
    if (dataLoaded && leads.length > 0) {
      localStorage.setItem('turismo_crm_leads', JSON.stringify(leads));
    }
  }, [leads, dataLoaded]);

  const handleUpdateStatus = (id: string, newStatus: Lead['status'], note?: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { 
      ...l, 
      status: newStatus,
      lastInteractionNote: note || l.lastInteractionNote 
    } : l));
  };

  const handleMarkSynced = (ids: string[]) => {
    const idSet = new Set(ids);
    setLeads(prev => prev.map(l => idSet.has(l.id) ? { ...l, emailSynced: true } : l));
  };

  const handleRestoreBackup = (restoredLeads: Lead[]) => {
    setLeads(restoredLeads);
    setSelectedIds(new Set());
  };

  const handleResetData = () => {
    if (confirm("¿Estás seguro? Esto borrará todo tu progreso actual y volverá al CSV original.")) {
      const initial = parseCSV(CSV_RAW_DATA);
      setLeads(initial);
      localStorage.removeItem('turismo_crm_leads');
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectMultiple = (ids: string[]) => {
    if (ids.length === 0) {
        setSelectedIds(new Set());
        return;
    }
    const newSet = new Set(selectedIds);
    ids.forEach(id => newSet.add(id));
    setSelectedIds(newSet);
  };

  const startBatchSession = () => {
    if (selectedIds.size === 0) return;
    setIsBatchMode(true);
  };

  const selectedLeadsList = leads.filter(l => selectedIds.has(l.id));

  const stats = {
    total: leads.length,
    pending: leads.filter(l => l.status === 'pending').length,
    contacted: leads.filter(l => l.status === 'initial_sent').length,
    responded: leads.filter(l => l.status === 'responded').length,
    notInterested: leads.filter(l => l.status === 'not_interested').length,
  };

  return (
    <div className="min-h-screen flex bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-brand-900 text-white flex flex-col fixed h-full shadow-lg z-10 overflow-y-auto">
        <div className="p-6 border-b border-brand-800">
          <h1 className="text-2xl font-bold tracking-tight">Turismo CRM</h1>
          <p className="text-xs text-brand-100 mt-1">Gestión Local Segura</p>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-brand-800 text-white' : 'text-brand-100 hover:bg-brand-800'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            CRM Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('email')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-md transition-colors ${currentView === 'email' ? 'bg-brand-800 text-white' : 'text-brand-100 hover:bg-brand-800'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Puente Marketing
          </button>
          
          <BackupManager leads={leads} onRestore={handleRestoreBackup} />
        </nav>
        
        <div className="p-4 border-t border-brand-800 bg-brand-950">
           <button 
             onClick={handleResetData}
             className="w-full text-xs text-red-400 hover:text-red-200 flex items-center gap-2 justify-center py-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             Resetear Fábrica
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 p-8 h-screen overflow-hidden flex flex-col">
        {currentView === 'dashboard' && (
          <div className="flex flex-col h-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-300">
                <div className="text-gray-500 text-xs uppercase font-bold">Pendientes</div>
                <div className="text-2xl font-bold text-gray-800">{stats.pending}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <div className="text-gray-500 text-xs uppercase font-bold">Contactados</div>
                <div className="text-2xl font-bold text-gray-800">{stats.contacted}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                <div className="text-gray-500 text-xs uppercase font-bold">Respondieron</div>
                <div className="text-2xl font-bold text-gray-800">{stats.responded}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                <div className="text-gray-500 text-xs uppercase font-bold">No Interesados</div>
                <div className="text-2xl font-bold text-gray-800">{stats.notInterested}</div>
              </div>
            </div>

            {/* Action Bar for Batch */}
            <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center shrink-0">
               <div>
                 <h3 className="font-bold text-gray-800">Base de Datos de Contactos</h3>
                 <p className="text-sm text-gray-500">Selecciona contactos de la lista para iniciar una sesión de envíos masivos.</p>
               </div>
               <div>
                 <button
                   onClick={startBatchSession}
                   disabled={selectedIds.size === 0}
                   className={`px-6 py-2 rounded font-bold transition-all shadow-md flex items-center gap-2
                     ${selectedIds.size > 0 
                        ? 'bg-brand-600 text-white hover:bg-brand-700 transform hover:scale-105' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                 >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Iniciar Sesión ({selectedIds.size})
                 </button>
               </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <LeadTable 
                leads={leads} 
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectMultiple={handleSelectMultiple}
                onLeadAction={setSelectedLead}
                onOpenInteraction={(lead, type) => setInteractionTarget({ lead, type })}
              />
            </div>
          </div>
        )}

        {currentView === 'email' && (
          <div className="space-y-6 overflow-auto">
             <EmailExportView leads={leads} onMarkSynced={handleMarkSynced} />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedLead && (
        <WhatsAppGenerator 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)}
          onStatusChange={(id, status) => {
             handleUpdateStatus(id, status);
             setSelectedLead(null);
          }}
        />
      )}

      {isBatchMode && (
        <BatchWhatsAppSender
          leads={selectedLeadsList}
          onClose={() => {
            setIsBatchMode(false);
            setSelectedIds(new Set());
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
      
      {interactionTarget && (
        <InteractionModal
          lead={interactionTarget.lead}
          targetStatus={interactionTarget.type}
          onClose={() => setInteractionTarget(null)}
          onConfirm={(id, status, note) => {
            handleUpdateStatus(id, status, note);
            setInteractionTarget(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
