import React, { useRef } from 'react';
import { Lead } from '../types';

interface Props {
  leads: Lead[];
  onRestore: (leads: Lead[]) => void;
}

export const BackupManager: React.FC<Props> = ({ leads, onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadBackup = () => {
    const dataStr = JSON.stringify(leads, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `turismo_crm_backup_${new Date().toISOString().slice(0,10)}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (confirm(`Se encontraron ${json.length} contactos en el archivo. ¿Deseas reemplazar tu base de datos actual con esta copia?`)) {
            onRestore(json);
            alert("Base de datos restaurada con éxito.");
          }
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON.");
        console.error(err);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg mt-4 border border-gray-700">
      <h3 className="text-white text-sm font-bold mb-3 uppercase tracking-wider">Seguridad y Respaldo</h3>
      <div className="space-y-3">
        <button 
          onClick={handleDownloadBackup}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-700 hover:bg-brand-600 text-white rounded text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Descargar Copia (JSON)
        </button>
        
        <button 
          onClick={handleRestoreClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors border border-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4-4v12" /></svg>
          Restaurar Copia
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json" 
          className="hidden" 
        />
        <p className="text-xs text-gray-500 text-center leading-tight">
          Guarda una copia diaria en tu PC para evitar perder datos si borras el historial del navegador.
        </p>
      </div>
    </div>
  );
};
