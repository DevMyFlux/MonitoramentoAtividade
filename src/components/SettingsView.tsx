import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function SettingsView() {
  const [serverUrl, setServerUrl] = useState('');
  const [idleThreshold, setIdleThreshold] = useState('10');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setServerUrl(localStorage.getItem('agent_server_url') || 'http://localhost:3000');
    setIdleThreshold(localStorage.getItem('agent_idle_threshold') || '10');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('agent_server_url', serverUrl);
    localStorage.setItem('agent_idle_threshold', idleThreshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
        <p className="text-slate-500 mt-1">Gerencie as configurações do seu sistema.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuração do Agente</h3>
        <form onSubmit={handleSave} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              URL do Servidor (Backend/Railway)
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ex: https://meu-app.railway.app"
            />
            <p className="text-xs text-slate-500 mt-2">
              Esta URL será usada automaticamente ao gerar o script Python do agente na página de instruções.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tempo de Tela para Alerta (segundos)
            </label>
            <input
              type="number"
              min="1"
              value={idleThreshold}
              onChange={(e) => setIdleThreshold(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Ex: 10"
            />
            <p className="text-xs text-slate-500 mt-2">
              Define o tempo em segundos de inatividade necessário para disparar um alerta.
            </p>
          </div>
          <button
            type="submit"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={18} className="mr-2" />
            {saved ? 'Salvo!' : 'Salvar Configurações'}
          </button>
        </form>
      </div>
    </div>
  );
}

