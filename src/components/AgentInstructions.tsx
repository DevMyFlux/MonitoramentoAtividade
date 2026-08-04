import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function AgentInstructions({ onBack, tenantId = "" }: { onBack: () => void, tenantId?: string }) {
  const [copied, setCopied] = useState(false);

  const getPythonCode = () => {
    const serverUrl = localStorage.getItem('agent_server_url') || "http://localhost:3000";
    return `import time
import socketio
import win32api
import win32gui
import os
import socket

# ==========================================
# CONFIGURAÇÕES DO AGENTE
# ==========================================
TENANT_ID = os.getenv("TENANT_ID", "${tenantId || 'empresa_teste_01'}")
MACHINE_NAME = os.getenv("MACHINE_NAME", socket.gethostname())

# IMPORTANTE: Coloque a URL do seu servidor Backend/Railway aqui.
SERVER_URL = os.getenv("SERVER_URL", "${serverUrl}")

# Tempo de inatividade em segundos para disparar alerta
IDLE_THRESHOLD_SECONDS = 10 
# ==========================================

sio = socketio.Client()

def get_idle_time():
    """Retorna o tempo de inatividade em segundos usando GetLastInputInfo."""
    try:
        last_input = win32api.GetLastInputInfo()
        current_tick = win32api.GetTickCount()
        idle_time_ms = current_tick - last_input
        return idle_time_ms / 1000.0
    except Exception as e:
        print(f"Erro ao obter tempo inativo: {e}")
        return 0

def get_active_window_title():
    """Retorna o título da janela atualmente em foco."""
    try:
        hwnd = win32gui.GetForegroundWindow()
        return win32gui.GetWindowText(hwnd)
    except Exception as e:
        print(f"Erro ao obter janela ativa: {e}")
        return ""

@sio.event
def connect():
    print(f"[OK] Conectado ao servidor no tenant: {TENANT_ID}")

@sio.event
def disconnect():
    print("[!] Desconectado do servidor")

def main():
    try:
        print(f"Tentando conectar ao servidor: {SERVER_URL}")
        # Conecta passando o tenantId via headers
        sio.connect(
            SERVER_URL, 
            headers={
                'tenant-id': TENANT_ID, 
                'client-type': 'agent', 
                'machine-name': MACHINE_NAME
            }
        )
    except Exception as e:
        print(f"Falha fatal ao conectar: {e}")
        return

    last_window = ""
    idle_alert_sent = False

    print("Iniciando monitoramento. Pressione Ctrl+C para sair.")
    
    while True:
        if not sio.connected:
            time.sleep(2)
            continue

        # 1. Verifica janela ativa
        current_window = get_active_window_title()
        if current_window and current_window != last_window:
            print(f"-> Janela alterada: {current_window}")
            sio.emit('WINDOW_CHANGED', {
                'windowTitle': current_window,
                'machineName': MACHINE_NAME,
                'timestamp': time.time()
            })
            last_window = current_window

        # 2. Verifica inatividade de Mouse/Teclado
        idle_time = get_idle_time()
        if idle_time > IDLE_THRESHOLD_SECONDS:
            if not idle_alert_sent:
                print(f"[ALERTA] Inatividade detectada! Tempo inativo: {idle_time}s")
                sio.emit('ALERT_IDLE_OR_SCREEN_OFF', {
                    'machineName': MACHINE_NAME,
                    'idleTimeSeconds': idle_time,
                    'timestamp': time.time()
                })
                idle_alert_sent = True
        else:
            # Reseta o alerta se voltou a mexer o mouse
            if idle_alert_sent:
                print("[OK] Usuário voltou à atividade.")
                sio.emit('ACTIVITY_RESUMED', {
                     'machineName': MACHINE_NAME,
                     'timestamp': time.time()
                })
                idle_alert_sent = False

        time.sleep(1)

if __name__ == '__main__':
    main()
`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getPythonCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <button 
          onClick={onBack}
          className="flex items-center text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Voltar ao Painel
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h1 className="text-2xl font-bold text-slate-800">Setup do Sistema & Agente Windows</h1>
            <p className="text-slate-600 mt-2">
              Siga os passos abaixo para colocar o sistema de monitoramento em produção e testar a comunicação.
            </p>
          </div>

          <div className="p-6 space-y-8">
            
            {/* Backend Instructions */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">1. Hospedar o Servidor (Backend / Railway)</h2>
              <div className="prose prose-slate max-w-none text-sm text-slate-600">
                <ul className="space-y-2 list-disc pl-5">
                  <li>O código completo <code>server.ts</code> já está configurado na raiz deste projeto.</li>
                  <li>Para hospedar no <strong>Railway</strong>, faça o push deste código para um repositório no GitHub.</li>
                  <li>Crie um novo projeto no Railway conectado ao GitHub.</li>
                  <li>Ele automaticamente detectará o <code>package.json</code> e executará <code>npm install</code> e <code>npm run build</code>.</li>
                  <li>O comando de start será o definido no script <code>start</code> (<code>node dist/server.cjs</code>).</li>
                  <li>O Railway irá expor uma URL (ex: <code>https://seu-app.up.railway.app</code>). Guarde esta URL!</li>
                </ul>
              </div>
            </section>

            {/* Python Agent Instructions */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4">2. Configurar o Agente (Máquina Windows)</h2>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
                <strong>Pré-requisitos:</strong> Você precisa ter o Python 3 instalado no Windows.
              </div>

              <h3 className="font-semibold text-slate-700 mb-2">2.1 Instalar Dependências</h3>
              <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-sm mb-6 flex justify-between items-center">
                <code>pip install python-socketio[client] pywin32</code>
              </div>

              <div className="flex justify-between items-end mb-2">
                <h3 className="font-semibold text-slate-700">2.2 Salvar e Executar agent.py</h3>
                <button 
                  onClick={copyCode}
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  {copied ? <><CheckCircle2 size={16} className="mr-1.5" /> Copiado</> : <><Copy size={16} className="mr-1.5" /> Copiar Código</>}
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-2">
                Crie um arquivo chamado <code>agent.py</code>, cole o código abaixo. Altere <code>SERVER_URL</code> para a URL do seu servidor.
              </p>
              
              <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-inner">
                <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {getPythonCode()}
                </pre>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
