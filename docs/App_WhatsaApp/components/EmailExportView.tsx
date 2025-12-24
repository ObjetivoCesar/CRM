import React from 'react';
import { Lead } from '../types';
import { generateMarketingCSV } from '../utils/csvExporter';

interface Props {
  leads: Lead[];
  onMarkSynced: (ids: string[]) => void;
}

export const EmailExportView: React.FC<Props> = ({ leads, onMarkSynced }) => {
  const validLeads = leads.filter(l => 
    (l.email?.includes('@') || l.emailContacto?.includes('@')) && 
    l.status !== 'not_interested'
  );
  
  const pendingSync = validLeads.filter(l => !l.emailSynced);

  const handleExport = () => {
    const syncedIds = generateMarketingCSV(leads);
    if (confirm("Se ha generado el archivo CSV para ActiveCampaign/Mailchimp. ¿Deseas marcar estos contactos como 'Sincronizados' en el CRM para no exportarlos de nuevo la próxima vez?")) {
      onMarkSynced(syncedIds);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Puente de Email Marketing</h2>
        <p className="text-gray-600 mt-2">
          Exporta tus contactos validados para usarlos en herramientas de automatización como ActiveCampaign o Mailchimp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-800">{validLeads.length}</div>
          <div className="text-sm text-gray-500 uppercase font-medium mt-1">Total con Email</div>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
          <div className="text-3xl font-bold text-blue-700">{pendingSync.length}</div>
          <div className="text-sm text-blue-600 uppercase font-medium mt-1">Pendientes de Sincronizar</div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
          <div className="text-3xl font-bold text-green-700">{validLeads.length - pendingSync.length}</div>
          <div className="text-sm text-green-600 uppercase font-medium mt-1">Ya Sincronizados</div>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm leading-5 font-medium text-yellow-800">
              Estrategia Recomendada
            </h3>
            <div className="mt-2 text-sm leading-5 text-yellow-700">
              <p>
                No envíes correos manualmente. Descarga este archivo e impórtalo en tu herramienta de Email Marketing.
                El archivo incluye una columna <strong>"Tags"</strong> que etiquetará automáticamente a los leads como:
                <ul className="list-disc ml-5 mt-1">
                  <li>"Interesado WhatsApp" (Si ya le enviaste mensaje)</li>
                  <li>"Solo Email" (Si no tiene WhatsApp)</li>
                </ul>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleExport}
          disabled={pendingSync.length === 0}
          className={`px-8 py-4 rounded-lg font-bold text-lg shadow-md flex items-center gap-3 transition-transform hover:scale-105
            ${pendingSync.length > 0 
              ? 'bg-brand-600 text-white hover:bg-brand-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          {pendingSync.length > 0 ? 'Descargar CSV para Marketing' : 'Todo Sincronizado'}
        </button>
      </div>
    </div>
  );
};
