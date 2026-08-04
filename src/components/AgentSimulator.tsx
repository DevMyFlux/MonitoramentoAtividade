import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Laptop, Play, Square, AlertTriangle, Globe, Activity } from 'lucide-react';

export default function AgentSimulator({ tenantId }: { tenantId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const machineName = "WIN-SIMULATOR-01";

  const toggleSimulation = () => {
    if (isRunning) {
      socket?.close();
      setSocket(null);
      setIsRunning(false);
    } else {
      const newSocket = io({
        query: {
          tenantId,
          clientType: 'agent',
          machineName
        }
      });
      setSocket(newSocket);
      setIsRunning(true);
    }
  };

  const [customWindow, setCustomWindow] = useState("");

  const simulateWindowChange = () => {
    if (!socket) return;
    const windowTitle = customWindow.trim() || "Google Chrome - Nova Guia";
    
    socket.emit('WINDOW_CHANGED', {
      machineName,
      windowTitle,
      timestamp: Date.now() / 1000
    });
    setCustomWindow(""); // clear after sending
  };

  const simulateIdle = () => {
    if (!socket) return;
    const threshold = parseInt(localStorage.getItem('agent_idle_threshold') || "10", 10);
    socket.emit('ALERT_IDLE_OR_SCREEN_OFF', {
      machineName,
      idleTimeSeconds: threshold + 1, // um segundo a mais que o threshold configurado
      timestamp: Date.now() / 1000
    });
  };
  
  const simulateResume = () => {
    if (!socket) return;
    socket.emit('ACTIVITY_RESUMED', {
      machineName,
      timestamp: Date.now() / 1000
    });
  };

  useEffect(() => {
    return () => {
      socket?.close();
    };
  }, [socket]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden mb-8">
      <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
        <div>
          <h3 className="font-bold flex items-center">
            <Activity className="mr-2 text-indigo-300" size={18} /> Painel de Teste (Simulador)
          </h3>
          <p className="text-indigo-200 text-xs mt-1">Cria uma máquina virtual falsa conectada na sua sala para você testar as funcionalidades.</p>
        </div>
        <button 
          onClick={toggleSimulation}
          className={`px-4 py-2 rounded-lg font-medium flex items-center text-sm transition-colors ${isRunning ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-500 hover:bg-indigo-400 text-white'}`}
        >
          {isRunning ? <><Square size={14} className="mr-2" /> Desconectar Máquina</> : <><Play size={14} className="mr-2" /> Conectar Máquina</>}
        </button>
      </div>
      
      {isRunning && (
        <div className="p-4 bg-indigo-50/50">
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-indigo-800 mb-1">Simular mudança de Janela/Site</label>
              <input 
                type="text" 
                value={customWindow}
                onChange={(e) => setCustomWindow(e.target.value)}
                placeholder="Ex: StackOverflow - Google Chrome"
                className="w-full px-3 py-2 text-sm rounded border border-indigo-200 focus:outline-none focus:border-indigo-400"
                onKeyDown={(e) => e.key === 'Enter' && simulateWindowChange()}
              />
            </div>
            <button 
              onClick={simulateWindowChange}
              className="bg-white border border-indigo-200 hover:border-indigo-500 hover:text-indigo-700 px-4 py-2 rounded shadow-sm text-sm font-medium text-slate-700 transition-colors flex items-center h-[38px]"
            >
              <Globe size={16} className="mr-2 text-indigo-500" />
              Enviar Nova Janela
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-indigo-100/50">
            <button 
               onClick={simulateIdle}
              className="bg-white border border-amber-100 hover:border-amber-500 hover:text-amber-700 px-4 py-3 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm font-medium text-slate-700"
            >
              <AlertTriangle size={16} className="mr-2 text-amber-500" />
              Disparar Inatividade (Exceder Limite)
            </button>
  
            <button 
               onClick={simulateResume}
              className="bg-white border border-green-100 hover:border-green-500 hover:text-green-700 px-4 py-3 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm font-medium text-slate-700"
            >
              <Play size={16} className="mr-2 text-green-500" />
              Voltar à Atividade (Mouse moveu)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
