import React, { useState, useEffect } from 'react';
import { Monitor, Terminal, LogIn, LogOut, User, LayoutDashboard, History, PlaySquare, ChevronRight, Shield, Settings as SettingsIcon } from 'lucide-react';
import AgentInstructions from './components/AgentInstructions';
import AgentSimulator from './components/AgentSimulator';
import { auth, db, loginWithGoogle, logout, joinTenant, loginWithEmail, registerWithEmail } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { Agent, Alert, HistoryEvent } from './types';
import DashboardView from './components/DashboardView';
import HistoryView from './components/HistoryView';
import SuperAdminView from './components/SuperAdminView';
import SettingsView from './components/SettingsView';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [tenantId, setTenantId] = useState('');
  const [activeTenant, setActiveTenant] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'history' | 'simulator' | 'superadmin' | 'settings'>('dashboard');
  const [myTenants, setMyTenants] = useState<string[]>([]);

  
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email === 'admin@admin.com') {
        setActiveTenant('admin-bypassed');
        setCurrentView('superadmin');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch my tenants
  useEffect(() => {
    if (user && !activeTenant) {
      const fetchMyTenants = async () => {
        try {
          const q = query(collection(db, 'tenant_access'), where('userId', '==', user.uid));
          const snapshot = await getDocs(q);
          const tenants = snapshot.docs.map(doc => doc.data().tenantId as string);
          setMyTenants(tenants);
        } catch (error) {
          console.error("Error fetching my tenants", error);
        }
      };
      fetchMyTenants();
    }
  }, [user, activeTenant]);

  // Listen to Firestore when activeTenant changes
  useEffect(() => {
    if (!activeTenant || !user) return;
    
    // Listen to Agents
    const agentsQ = query(collection(db, "agents"), where("tenantId", "==", activeTenant));
    const unsubAgents = onSnapshot(agentsQ, (snapshot) => {
      const agentsMap: Record<string, Agent> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        agentsMap[data.machineName] = {
          machineName: data.machineName,
          status: data.status,
          activeWindow: data.activeWindow,
          lastUpdate: data.lastUpdate
        };
      });
      setAgents(agentsMap);
    }, (error) => {
      console.error("Agents listener error:", error);
      if (error.message.includes("permission-denied")) {
        alert("Sem permissão. Tente reconectar para atualizar o acesso.");
      }
    });

    // Listen to Events (History and Alerts)
    const eventsQ = query(
      collection(db, "events"), 
      where("tenantId", "==", activeTenant),
      limit(300) // Increase limit for better charts
    );
    const unsubEvents = onSnapshot(eventsQ, (snapshot) => {
      const allEvents: any[] = [];
      snapshot.forEach(doc => {
        allEvents.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort client-side since we haven't created a composite index
      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      
      const newHistory = allEvents
        .filter(e => e.type === "WINDOW_CHANGED")
        .map(e => ({
          id: e.id,
          machineName: e.machineName,
          windowTitle: e.windowTitle || "Unknown",
          timestamp: e.timestamp,
          type: e.type
        }));
      setHistory(newHistory);

      const newAlerts = allEvents
        .filter(e => e.type === "ALERT_IDLE_OR_SCREEN_OFF")
        .map(e => ({
          id: e.id,
          machineName: e.machineName,
          idleTimeSeconds: e.idleTimeSeconds || 0,
          timestamp: e.timestamp,
          type: e.type
        }));
      setAlerts(newAlerts.slice(0, 50));
    });

    return () => {
      unsubAgents();
      unsubEvents();
    };
  }, [activeTenant, user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError('O login por E-mail/Senha não está habilitado no Firebase (auth/operation-not-allowed). Por favor, habilite no console do Firebase > Authentication > Sign-in method.');
      } else {
        setAuthError(error.message || 'Falha na autenticação');
      }
    }
  };

  const createAdminAuto = async () => {
    setAuthError('');
    try {
      try {
        await registerWithEmail('admin@admin.com', 'administrador!');
      } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
          await loginWithEmail('admin@admin.com', 'administrador!');
        } else {
          throw e;
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError('ATENÇÃO: O login por E-mail e Senha está desativado no Firebase. Acesse o console do Firebase > Authentication > Sign-in method e ative "Email/Password".');
      } else {
        setAuthError('Erro ao entrar como admin: ' + error.message);
      }
    }
  };

  const connectToTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() || !user) return;
    
    setIsConnecting(true);
    try {
      await joinTenant(user.uid, tenantId.trim());
      setActiveTenant(tenantId.trim());
      setCurrentView('dashboard');
    } catch (error) {
      console.error("Failed to join tenant:", error);
      alert("Erro ao conectar no tenant.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setActiveTenant('');
    setAgents({});
    setAlerts([]);
    setHistory([]);
  };

  if (showInstructions) {
    return <AgentInstructions onBack={() => setShowInstructions(false)} tenantId={activeTenant} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Monitor size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Monitoramento Multi-Tenant</h1>
          <p className="text-slate-500 mb-6">Faça login para acessar os dados da sua empresa.</p>
          
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
            {authError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {authError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
            >
              {authMode === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-sm text-blue-600 hover:underline"
              >
                {authMode === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Fazer login'}
              </button>
            </div>
          </form>

          <button 
            type="button"
            onClick={createAdminAuto}
            className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2.5 rounded-lg transition-colors mb-6 border border-red-200 flex items-center justify-center"
          >
            <Shield size={18} className="mr-2" />
            Entrar como Super Admin (Automático)
          </button>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">ou</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <button
            onClick={loginWithGoogle}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <LogIn size={18} className="mr-2" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  if (!activeTenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center text-slate-600 truncate">
              <User size={18} className="mr-2 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{user.email}</span>
            </div>
            <button onClick={logout} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0" title="Sair da Conta">
              <LogOut size={18} />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Conectar ao Tenant</h1>
          <p className="text-center text-slate-500 mb-8">Digite o ID da Empresa que você deseja monitorar.</p>
          
          <form onSubmit={connectToTenant} className="space-y-4">
            <div>
              <label htmlFor="tenantId" className="block text-sm font-medium text-slate-700 mb-1">
                Tenant ID
              </label>
              <input
                id="tenantId"
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Ex: empresa_teste_01"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-70 flex justify-center items-center"
            >
              {isConnecting ? 'Conectando...' : 'Acessar Painel'}
            </button>
          </form>

          {myTenants.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Meus Tenants</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {myTenants.map(tenant => (
                  <button
                    key={tenant}
                    onClick={() => {
                      setTenantId(tenant);
                      setActiveTenant(tenant);
                      setCurrentView('dashboard');
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-blue-700">{tenant}</span>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button 
              onClick={() => setShowInstructions(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto mb-4"
            >
              <Terminal size={16} className="mr-2" />
              Ver instruções e baixar Agente
            </button>
            {user?.email === 'admin@admin.com' && (
               <button 
                onClick={() => {
                  setActiveTenant('admin-bypassed');
                  setCurrentView('superadmin');
                }}
                className="text-sm font-bold text-red-600 hover:text-red-800 flex items-center justify-center mx-auto"
              >
                <Shield size={16} className="mr-2" />
                Acessar Painel Super Admin Direto
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0 hidden md:flex flex-col z-20 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center">
          <Monitor className="text-blue-600 mr-3" size={24} />
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">Insight Monitor</h1>
            <p className="text-xs text-slate-500 truncate mt-0.5" title={activeTenant}>Tenant: {activeTenant}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Menu Principal</div>
          
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <div className="flex items-center">
              <LayoutDashboard size={18} className="mr-3" />
              Visão Geral
            </div>
            {currentView === 'dashboard' && <ChevronRight size={16} />}
          </button>
          
          <button 
            onClick={() => setCurrentView('history')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <div className="flex items-center">
              <History size={18} className="mr-3" />
              Histórico
            </div>
            {currentView === 'history' && <ChevronRight size={16} />}
          </button>

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-3 px-3">Desenvolvimento</div>

          <button 
            onClick={() => setCurrentView('simulator')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'simulator' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <div className="flex items-center">
              <PlaySquare size={18} className="mr-3" />
              Simulador
            </div>
            {currentView === 'simulator' && <ChevronRight size={16} />}
          </button>

          <button 
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'settings' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <div className="flex items-center">
              <SettingsIcon size={18} className="mr-3" />
              Configurações
            </div>
            {currentView === 'settings' && <ChevronRight size={16} />}
          </button>

          {user?.email === 'admin@admin.com' && (
            <>
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mt-6 mb-3 px-3">Administração</div>
              <button 
                onClick={() => setCurrentView('superadmin')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'superadmin' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <div className="flex items-center">
                  <Shield size={18} className="mr-3" />
                  Super Admin
                </div>
                {currentView === 'superadmin' && <ChevronRight size={16} />}
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
          <div className="flex items-center justify-between px-3 py-2 mb-2 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center text-xs font-medium text-slate-700 truncate mr-2">
              <User size={14} className="mr-1.5 text-slate-400" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center flex-shrink-0">
               <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
               <span className="text-[10px] font-bold text-green-600 uppercase">Sync</span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowInstructions(true)}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
          >
            <Terminal size={16} className="mr-3 text-slate-400" />
            Baixar Agente
          </button>
          <button 
            onClick={disconnect}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut size={16} className="mr-3 text-red-400" />
            Desconectar Tenant
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <Monitor className="text-blue-600" size={20} />
          <h1 className="font-bold text-slate-800 text-lg">Insight</h1>
        </div>
        <div className="flex space-x-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setCurrentView('dashboard')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${currentView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>Visão Geral</button>
          <button onClick={() => setCurrentView('history')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${currentView === 'history' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>Histórico</button>
          <button onClick={() => setCurrentView('simulator')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${currentView === 'simulator' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Simulador</button>
          <button onClick={() => setCurrentView('settings')} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${currentView === 'settings' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'}`}>Configs</button>
          <button onClick={disconnect} className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-red-100 text-red-700">Sair</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-slate-50/50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {currentView === 'dashboard' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Visão Geral do Ambiente</h2>
              <DashboardView agents={agents} alerts={alerts} />
            </div>
          )}
          
          {currentView === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Histórico de Atividades</h2>
              <HistoryView history={history} />
            </div>
          )}
          
          {currentView === 'simulator' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Ambiente de Testes</h2>
              <AgentSimulator tenantId={activeTenant} />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SettingsView />
            </div>
          )}

          {currentView === 'superadmin' && user?.email === 'admin@admin.com' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SuperAdminView />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
