
import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { parseName, generateWhatsAppMessage, cleanPhone } from '../utils/textHelpers';

interface Props {
  leads: Lead[];
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: Lead['status'], note?: string) => void;
}

export const BatchWhatsAppSender: React.FC<Props> = ({ leads, onClose, onUpdateStatus }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLead, setCurrentLead] = useState<Lead>(leads[0]);
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasOpened, setHasOpened] = useState(false);
  const [isLandline, setIsLandline] = useState(false);
  
  // Note taking state
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteType, setNoteType] = useState<'not_interested' | 'responded'>('not_interested');
  const [interactionNote, setInteractionNote] = useState('');

  useEffect(() => {
    if (currentIndex < leads.length) {
      const lead = leads[currentIndex];
      setCurrentLead(lead);
      setHasOpened(false);
      setShowNoteInput(false);
      setInteractionNote('');

      const rawName = lead.personaContacto && lead.personaContacto.length > 2 
        ? lead.personaContacto 
        : lead.razonSocial;
      const { firstName, lastName, gender } = parseName(rawName);
      const fullName = `${firstName} ${lastName}`.trim();
      
      setMessage(generateWhatsAppMessage(fullName, lead.nombreComercial, gender));

      const p1 = cleanPhone(lead.telefonoPrincipal);
      const p2 = cleanPhone(lead.telefonoSecundario);
      let phone = '';

      if (p1.startsWith('5939')) phone = p1;
      else if (p2.startsWith('5939')) phone = p2;
      else phone = p1 || p2;

      setPhoneNumber(phone);

      // Detect potential Landline (Loja landlines often start with 59372...)
      setIsLandline(!!phone && !phone.startsWith('5939'));
    }
  }, [currentIndex, leads]);

  const handleOpenWhatsApp = () => {
    navigator.clipboard.writeText(message).catch(err => console.error('Error al copiar', err));

    if (phoneNumber) {
      const url = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setHasOpened(true);
    }
  };

  const handleConfirmSent = () => {
    onUpdateStatus(currentLead.id, 'initial_sent');
    handleNext();
  };

  const handleMarkNoWhatsapp = () => {
    onUpdateStatus(currentLead.id, 'no_whatsapp');
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleInteraction = (type: 'not_interested' | 'responded') => {
    setNoteType(type);
    setShowNoteInput(true);
  };

  const confirmInteraction = () => {
    onUpdateStatus(currentLead.id, noteType, interactionNote || 'No especificado en modo campaña');
    handleNext();
  };

  const progress = ((currentIndex + 1) / leads.length) * 100;

  if (showNoteInput) {
    const isRejection = noteType === 'not_interested';
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className={`text-lg font-bold mb-2 ${isRejection ? 'text-red-600' : 'text-green-600'}`}>
            {isRejection ? 'Registrar Motivo de Rechazo' : 'Registrar Respuesta'}
          </h3>
          <p className="text-gray-600 mb-4">
            {isRejection ? `¿Por qué no le interesó a ${currentLead.nombreComercial}?` : `¿Qué respondió ${currentLead.nombreComercial}?`}
          </p>
          <textarea 
            autoFocus
            className={`w-full h-32 p-3 border border-gray-300 rounded focus:ring-2 mb-4 ${isRejection ? 'focus:ring-red-500' : 'focus:ring-green-500'}`}
            placeholder={isRejection ? "Ej: Muy caro, grosero, ya tiene..." : "Ej: Pide info, llamar luego..."}
            value={interactionNote}
            onChange={(e) => setInteractionNote(e.target.value)}
          />
          <div className="flex justify-end gap-3">
             <button onClick={() => setShowNoteInput(false)} className="px-4 py-2 text-gray-600">Cancelar</button>
             <button 
               onClick={confirmInteraction} 
               className={`px-4 py-2 text-white rounded font-bold ${isRejection ? 'bg-red-600' : 'bg-green-600'}`}
             >
               Guardar y Siguiente
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl mb-6 flex justify-between items-center text-white">
        <div>
          <h2 className="text-2xl font-bold">Modo Campaña WhatsApp</h2>
          <p className="text-brand-200">Procesando {currentIndex + 1} de {leads.length}</p>
        </div>
        <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-sm">
          Salir / Pausar
        </button>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col relative">
           <div className="absolute top-0 left-0 bg-brand-600 text-white text-xs px-2 py-1 font-bold rounded-br-lg">
             Lead Actual
           </div>

          <div className="mb-6 mt-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Negocio</h3>
            <div className="text-xl font-bold text-gray-900 leading-tight mb-1">{currentLead.nombreComercial}</div>
            <span className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">{currentLead.actividad}</span>
          </div>

          <div className="mb-6">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contacto</h3>
             <div className="text-gray-800 font-medium">{currentLead.personaContacto || "N/A"}</div>
             <div className="text-sm text-gray-600">{currentLead.razonSocial}</div>
          </div>

          <div className="mb-6">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono Detectado</h3>
             <input 
               type="text" 
               value={phoneNumber} 
               onChange={(e) => setPhoneNumber(e.target.value)}
               className={`w-full p-2 border rounded font-mono text-lg text-center bg-white focus:ring-2 outline-none
                  ${isLandline ? 'border-red-300 text-red-600 bg-red-50' : 'border-gray-300 text-gray-800'}
               `}
             />
             {isLandline && <p className="text-red-600 text-xs mt-1 font-bold">⚠️ Parece ser un número fijo</p>}
             {!phoneNumber && <p className="text-red-500 text-xs mt-1 font-bold">¡No se encontró número válido!</p>}
          </div>
          
          <div className="mt-auto">
             <p className="text-xs text-gray-400 text-center mb-2">Otras acciones</p>
             <div className="flex gap-2 mb-2">
                <button onClick={handleSkip} className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 text-sm">
                  Saltar
                </button>
             </div>
             <div className="flex gap-2">
                <button onClick={() => handleInteraction('responded')} className="flex-1 px-3 py-2 border border-green-200 text-green-600 hover:bg-green-50 rounded text-sm">
                  🗣️ Respondió
                </button>
                <button onClick={() => handleInteraction('not_interested')} className="flex-1 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded text-sm">
                  ⛔ No Interesa
                </button>
             </div>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-6 flex flex-col bg-white relative">
          
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex justify-between items-center">
              <span>Paso 1: Abrir WhatsApp</span>
              {hasOpened && <span className="text-xs text-green-600 font-bold animate-pulse">¡WhatsApp Abierto! Verifica resultado.</span>}
            </h3>
            
            <textarea 
              className="w-full h-32 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-brand-500 focus:outline-none font-sans text-sm text-gray-600 bg-gray-50 mb-3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button 
              onClick={handleOpenWhatsApp}
              disabled={!phoneNumber}
              className={`w-full py-4 rounded-lg font-bold text-white text-lg shadow-md flex items-center justify-center gap-2 transition-all
                ${!phoneNumber 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-brand-600 hover:bg-brand-700 hover:shadow-lg transform active:scale-95'}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {hasOpened ? 'WhatsApp Abierto (Volver a abrir)' : 'Abrir WhatsApp y Copiar'}
            </button>
             <p className="text-center text-xs text-gray-400 mt-2">
              Se copiará el texto. Si WhatsApp Web no lo pega automáticamente, presiona <strong>Ctrl + V</strong>.
            </p>
          </div>

          <hr className="border-gray-100 my-4" />

          <div className={`transition-opacity duration-300 flex-1 flex flex-col justify-end ${hasOpened ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
             <h3 className="text-sm font-bold text-gray-700 mb-2">Paso 2: Confirmar Resultado (Luego de volver de WhatsApp)</h3>
             <div className="grid grid-cols-2 gap-4 h-24">
                <button 
                  onClick={handleConfirmSent}
                  className="bg-green-100 border-2 border-green-500 hover:bg-green-500 hover:text-white text-green-700 rounded-lg font-bold text-lg flex flex-col items-center justify-center transition-colors"
                >
                  <span className="text-2xl">✅</span>
                  <span>Mensaje Enviado</span>
                  <span className="text-xs font-normal opacity-80">(Ir al Siguiente)</span>
                </button>

                <button 
                  onClick={handleMarkNoWhatsapp}
                  className="bg-yellow-50 border-2 border-yellow-400 hover:bg-yellow-400 hover:text-white text-yellow-800 rounded-lg font-bold text-lg flex flex-col items-center justify-center transition-colors"
                >
                  <span className="text-2xl">⚠️</span>
                  <span>Sin WhatsApp</span>
                   <span className="text-xs font-normal opacity-80">(Marcar error y Siguiente)</span>
                </button>
             </div>
          </div>

        </div>

      </div>

      <div className="w-full max-w-5xl mt-4 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};
