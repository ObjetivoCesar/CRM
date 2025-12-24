import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { parseName, generateWhatsAppMessage, cleanPhone } from '../utils/textHelpers';

interface Props {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: Lead['status']) => void;
}

export const WhatsAppGenerator: React.FC<Props> = ({ lead, onClose, onStatusChange }) => {
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Determine name source: PersonaContacto preferred, else RazonSocial
    const rawName = lead.personaContacto && lead.personaContacto.length > 2 
      ? lead.personaContacto 
      : lead.razonSocial;

    const { firstName, lastName, gender } = parseName(rawName);
    const fullName = `${firstName} ${lastName}`.trim();

    const msg = generateWhatsAppMessage(fullName, lead.nombreComercial, gender);
    setMessage(msg);

    // Prefer Cellphone (usually start with 09 in Ecuador)
    // The CSV has Tel1 and Tel2.
    const p1 = cleanPhone(lead.telefonoPrincipal);
    const p2 = cleanPhone(lead.telefonoSecundario);
    
    // Heuristic: Select the one that looks like a mobile (starts with 5939)
    if (p1.startsWith('5939')) setPhoneNumber(p1);
    else if (p2.startsWith('5939')) setPhoneNumber(p2);
    else setPhoneNumber(p1 || p2);

  }, [lead]);

  const handleSend = () => {
    if (!phoneNumber) {
      alert("No se detectó un número de teléfono válido.");
      return;
    }
    
    // 1. Copy to clipboard automatically for safety
    navigator.clipboard.writeText(message).catch(err => console.error("Error copy", err));

    // 2. Open API Link
    const url = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    onStatusChange(lead.id, 'initial_sent');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Contactar a {lead.nombreComercial}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
             <label className="block text-sm font-medium text-gray-700 mb-1">Número de Destino (WhatsApp)</label>
             <input 
               type="text" 
               value={phoneNumber} 
               onChange={(e) => setPhoneNumber(e.target.value)}
               className="w-full p-2 border rounded-md font-mono bg-gray-50"
             />
             <p className="text-xs text-gray-500 mt-1">Formato internacional requerido (ej. 593...)</p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Mensaje Generado</label>
              <button 
                onClick={handleCopy}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                {copySuccess ? '¡Copiado!' : 'Copiar Texto'}
              </button>
            </div>
            <textarea
              className="w-full h-64 p-3 border rounded-md font-sans text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Verifica que el nombre y género ("Posicionado/a") sean correctos antes de enviar.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
             <button 
               onClick={onClose}
               className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
             >
               Cancelar
             </button>
             <button 
               onClick={handleSend}
               className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
             >
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
               </svg>
               Abrir WhatsApp
             </button>
             <p className="text-center text-xs text-gray-500 mt-2">
               El texto se copiará al portapapeles automáticamente. Si no aparece, presiona Pegar (Ctrl+V).
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};