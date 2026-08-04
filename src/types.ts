export type Agent = {
  machineName: string;
  status: 'online' | 'offline' | 'idle';
  activeWindow: string;
  lastUpdate: number;
};

export type Alert = {
  id: string;
  machineName: string;
  idleTimeSeconds: number;
  timestamp: number;
};

export type HistoryEvent = {
  id: string;
  machineName: string;
  windowTitle: string;
  timestamp: number;
  type?: string;
};
