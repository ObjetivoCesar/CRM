import React, { useState } from 'react';
import { Lead } from '../types';

interface Props {
  leads: Lead[];
  onLeadsUpdate: (leads: Lead[]) => void;
}

export const EmailSimulator: React.FC<Props> = ({ leads, onLeadsUpdate }) => {
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  const pendingLeads = leads.filter(l => l.email && l.email.includes('@'));

  const startCampaign = async () => {
    setIsSending(true);
    setLogs(prev => ["Iniciando campaña...", ...prev]);
    
    // Simulate batch sending
    const total = pendingLeads.length;
    let processed = 0;

    // Use a recursive timeout to simulate interval without blocking UI
    const sendNext = (index: number) => {
      if (index >= pendingLeads.length) {
        setIsSending(false);
        setLogs(prev => ["Campaña finalizada exitosamente.", ...prev]);
        return;
      }

      const lead = pendingLeads[index];
      setLogs(prev => [`Enviando a ${lead.email} (${lead.nombreComercial})...`, ...prev]);
      
      // Simulate SMTP network delay (500ms - 1500ms)
      setTimeout(() => {
        processed++;
        setProgress(Math.round((processed / total) * 100));
        
        // Update lead status in parent
        // In a real app, we would make an API call here.
        // For this demo, we won't mutate the parent state aggressively to keep the demo clean,
        // or we could mark them as "contacted".
        
        sendNext(index + 1);
      }, Math.random() * 1000 + 500);
    };

    sendNext(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Campaña de Email Marketing</h2>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <p className="text-sm text-blue-700">
            <strong>Nota Técnica:</strong> Los navegadores web bloquean las conexiones SMTP directas por seguridad. 
            Esta herramienta simula el proceso de envío utilizando la configuración proporcionada para gestionar la cola. 
            En un entorno de producción, esto requeriría un servidor backend (NodeJS/Python) intermediario.
          </p>
        </div>

        <div className="flex justify-between items-center mb-4">
           <div>
             <p className="text-gray-600">Destinatarios válidos en cola: <span className="font-bold">{pendingLeads.length}</span></p>
             <p className="text-xs text-gray-500">Filtrado por leads con email válido.</p>
           </div>
           <button 
             onClick={() => setShowConfig(!showConfig)}
             className="text-brand-600 text-sm underline"
           >
             {showConfig ? 'Ocultar Configuración SMTP' : 'Ver Configuración SMTP'}
           </button>
        </div>

        {showConfig && (
          <div className="bg-gray-100 p-4 rounded mb-4 text-sm font-mono border">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-gray-500 text-xs">Usuario</label>
                 <div className="font-semibold">turismo@cesarreyesjaramillo.com</div>
               </div>
               <div>
                 <label className="block text-gray-500 text-xs">Host</label>
                 <div className="font-semibold">mail.cesarreyesjaramillo.com</div>
               </div>
               <div>
                 <label className="block text-gray-500 text-xs">Puerto SMTP (SSL)</label>
                 <div className="font-semibold">465</div>
               </div>
             </div>
          </div>
        )}

        {isSending ? (
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-sm font-medium">{progress}% Completado</p>
          </div>
        ) : (
          <button
            onClick={startCampaign}
            disabled={pendingLeads.length === 0}
            className={`w-full py-3 rounded-md font-bold text-white transition-colors
              ${pendingLeads.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700'}`}
          >
            {pendingLeads.length === 0 ? 'No hay destinatarios' : 'Iniciar Campaña de Emails'}
          </button>
        )}
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded-lg shadow font-mono text-sm h-64 overflow-y-auto">
        {logs.length === 0 && <p className="text-gray-500 italic">Esperando inicio de operaciones...</p>}
        {logs.map((log, i) => (
          <div key={i} className="mb-1 border-b border-gray-800 pb-1">
            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
          </div>
        ))}
      </div>
    </div>
  );
};
