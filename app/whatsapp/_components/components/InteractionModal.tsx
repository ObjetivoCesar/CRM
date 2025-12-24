
import React, { useState } from 'react';
import { Lead } from '../types';

interface Props {
  lead: Lead;
  targetStatus: Lead['status'];
  onClose: () => void;
  onConfirm: (id: string, status: Lead['status'], note: string) => void;
}

export const InteractionModal: React.FC<Props> = ({ lead, targetStatus, onClose, onConfirm }) => {
  const [note, setNote] = useState(lead.lastInteractionNote || '');

  const getTitle = () => {
    if (targetStatus === 'responded') return 'Registrar Respuesta Positiva/Neutra';
    if (targetStatus === 'not_interested') return 'Registrar Motivo de Rechazo';
    return 'Registrar Nota';
  };

  const getColor = () => {
    if (targetStatus === 'responded') return 'green';
    if (targetStatus === 'not_interested') return 'red';
    return 'blue';
  };

  const color = getColor();

  const handleSave = () => {
    onConfirm(lead.id, targetStatus, note);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden transform transition-all">
        <div className={`bg-${color}-600 px-6 py-4 flex justify-between items-center`}>
          <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Contacto: <strong>{lead.nombreComercial}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {targetStatus === 'not_interested' ? '¿Por qué no le interesó?' : '¿Qué respondió el cliente?'}
            </label>
            <textarea
              autoFocus
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
              placeholder={targetStatus === 'not_interested' ? "Ej: Muy caro, ya tiene proveedor, grosero..." : "Ej: Pide cotización, llamar el lunes, le gustó el video..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className={`px-4 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-md text-sm font-bold shadow-sm transition-colors`}
            >
              Guardar y Actualizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
