import { Clock, Laptop } from 'lucide-react';
import { HistoryEvent } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HistoryView({ history }: { history: HistoryEvent[] }) {
  // Aggregate history events by hour for the chart
  const getChartData = () => {
    const countsByHour: Record<string, number> = {};
    history.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
      countsByHour[hour] = (countsByHour[hour] || 0) + 1;
    });

    return Object.entries(countsByHour)
      .map(([time, count]) => ({ time, eventos: count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center">
          <Clock className="text-slate-500 mr-2" size={20} />
          Atividade Recente (Eventos)
        </h2>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="eventos" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEventos)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Dados insuficientes para gerar o gráfico.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
           <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <Clock className="text-slate-500 mr-2" size={20} />
            Histórico Detalhado (Links e Programas)
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Horário</th>
                <th className="p-4 font-semibold">Máquina</th>
                <th className="p-4 font-semibold">Aba / Link / Programa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    Nenhum evento registrado no banco de dados.
                  </td>
                </tr>
              ) : (
                history.map(event => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 whitespace-nowrap text-slate-600">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 whitespace-nowrap font-medium text-slate-800 flex items-center">
                      <Laptop size={14} className="mr-2 text-slate-400" />
                      {event.machineName}
                    </td>
                    <td className="p-4 text-slate-700 max-w-lg truncate" title={event.windowTitle}>
                      {event.windowTitle}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
