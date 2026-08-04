import { Monitor, Laptop, Globe, CheckCircle, XCircle, Clock, AlertTriangle, Users } from 'lucide-react';
import { Agent, Alert } from '../types';

export default function DashboardView({ agents, alerts }: { agents: Record<string, Agent>, alerts: Alert[] }) {
  const agentList = Object.values(agents);
  const total = agentList.length;
  const online = agentList.filter(a => a.status === 'online').length;
  const idle = agentList.filter(a => a.status === 'idle').length;
  const offline = agentList.filter(a => a.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Máquinas</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{total}</p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Ativas (Online)</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{online}</p>
          </div>
          <div className="h-12 w-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Ausentes (Idle)</p>
            <p className="text-3xl font-bold text-amber-500 mt-1">{idle}</p>
          </div>
          <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Offline</p>
            <p className="text-3xl font-bold text-slate-600 mt-1">{offline}</p>
          </div>
          <div className="h-12 w-12 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <AlertTriangle className="text-amber-500 mr-2" size={20} />
            Alertas Recentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-red-800 flex items-center">
                    <Laptop size={16} className="mr-2" />
                    {alert.machineName}
                  </span>
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-red-700">
                  Ocioso há <strong>{alert.idleTimeSeconds.toFixed(0)}s</strong>.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
          <Monitor className="text-slate-500 mr-2" size={20} />
          Máquinas Conectadas
        </h2>
        
        {total === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            Nenhum agente registrado neste tenant. Inicie o script Python ou o simulador.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agentList.map(agent => (
              <div key={agent.machineName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center">
                      <Laptop size={18} className="mr-2 text-slate-400" />
                      {agent.machineName}
                    </h3>
                    {agent.status === 'online' && (
                      <span className="flex items-center text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} className="mr-1" /> Online
                      </span>
                    )}
                    {agent.status === 'idle' && (
                      <span className="flex items-center text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                        <Clock size={12} className="mr-1" /> Ausente
                      </span>
                    )}
                    {agent.status === 'offline' && (
                      <span className="flex items-center text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        <XCircle size={12} className="mr-1" /> Offline
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Janela Ativa
                    </span>
                    <p className="text-sm font-medium text-slate-700 truncate flex items-center bg-slate-50 p-2 rounded border border-slate-100" title={agent.activeWindow}>
                      <Globe size={14} className="mr-2 text-blue-500 flex-shrink-0" />
                      {agent.activeWindow}
                    </p>
                  </div>
                  <div className="mt-3 text-xs text-slate-400 text-right">
                    Sincronizado: {new Date(agent.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
