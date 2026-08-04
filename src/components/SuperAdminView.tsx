import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ShieldAlert, Trash2, Users, Monitor, Shield, Laptop } from 'lucide-react';
import { Agent, HistoryEvent } from '../types';

export default function SuperAdminView() {
  const [agents, setAgents] = useState<(Agent & { id: string })[]>([]);
  const [tenantAccesses, setTenantAccesses] = useState<{ id: string, userId: string, tenantId: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const agentsSnapshot = await getDocs(collection(db, 'agents'));
      const agentsList = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agent & { id: string }));
      setAgents(agentsList);

      const accessSnapshot = await getDocs(collection(db, 'tenant_access'));
      const accessList = accessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setTenantAccesses(accessList);
    } catch (error) {
      console.error("Error loading super admin data", error);
      alert("Erro ao carregar dados do admin. Verifique suas permissões.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("Tem certeza que deseja remover este agente? Ele pode ser recriado se conectar novamente.")) return;
    try {
      await deleteDoc(doc(db, 'agents', agentId));
      setAgents(prev => prev.filter(a => a.id !== agentId));
    } catch (error) {
      console.error("Delete agent error", error);
      alert("Erro ao remover o agente.");
    }
  };

  const handleDeleteAccess = async (accessId: string) => {
    if (!confirm("Tem certeza que deseja remover o acesso deste usuário ao tenant?")) return;
    try {
      await deleteDoc(doc(db, 'tenant_access', accessId));
      setTenantAccesses(prev => prev.filter(a => a.id !== accessId));
    } catch (error) {
      console.error("Delete access error", error);
      alert("Erro ao remover o acesso.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center border border-red-200">
        <ShieldAlert className="mr-3" size={24} />
        <div>
          <h2 className="font-bold text-lg">Painel de Super Admin</h2>
          <p className="text-sm">Você tem acesso total de leitura e escrita em todos os Tenants e Agentes do sistema.</p>
        </div>
        <button onClick={loadData} className="ml-auto bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Atualizar Dados
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando dados globais...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tenant Accesses */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center">
                <Users className="text-blue-500 mr-2" size={18} />
                Acessos a Tenants
              </h3>
              <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{tenantAccesses.length}</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">User ID</th>
                    <th className="p-3 font-semibold">Tenant</th>
                    <th className="p-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {tenantAccesses.length === 0 ? (
                    <tr><td colSpan={3} className="p-6 text-center text-slate-500">Nenhum acesso registrado</td></tr>
                  ) : (
                    tenantAccesses.map(access => (
                      <tr key={access.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-600 font-mono text-xs truncate max-w-[150px]" title={access.userId}>{access.userId}</td>
                        <td className="p-3 font-medium text-slate-800">{access.tenantId}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteAccess(access.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Remover Acesso">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agents */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center">
                <Monitor className="text-indigo-500 mr-2" size={18} />
                Todos os Agentes
              </h3>
              <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{agents.length}</span>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">Tenant</th>
                    <th className="p-3 font-semibold">Máquina</th>
                    <th className="p-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {agents.length === 0 ? (
                    <tr><td colSpan={3} className="p-6 text-center text-slate-500">Nenhum agente registrado</td></tr>
                  ) : (
                    agents.map(agent => (
                      <tr key={agent.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-600 text-xs font-medium">{agent.tenantId}</td>
                        <td className="p-3 font-medium text-slate-800 flex items-center">
                          <Laptop size={14} className="mr-2 text-slate-400" />
                          {agent.machineName}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteAgent(agent.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" title="Remover Agente">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
