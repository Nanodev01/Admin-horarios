import { useState } from 'react';
import type { Teacher, ScanLog } from '../types';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Clock, 
  ArrowRightLeft,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface DashboardProps {
  teachers: Teacher[];
  logs: ScanLog[];
  currentTime: Date;
  onNavigateToTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  teachers, 
  logs, 
  currentTime,
  onNavigateToTab 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get current hour:minute
  const currentHHMM = currentTime.toTimeString().substring(0, 5);

  const isWithinSchedule = (entry: string, exit: string, current: string) => {
    const [eh, em] = entry.split(':').map(Number);
    const [exh, exm] = exit.split(':').map(Number);
    const [ch, cm] = current.split(':').map(Number);
    
    const entryMins = eh * 60 + em;
    const exitMins = exh * 60 + exm;
    const currentMins = ch * 60 + cm;
    
    return currentMins >= entryMins && currentMins <= exitMins;
  };

  // Metrics calculations
  const totalTeachers = teachers.length;
  const presentTeachers = teachers.filter(t => t.status === 'present').length;
  const absentTeachers = totalTeachers - presentTeachers;
  
  // Count today's late check-ins
  const startOfToday = new Date(currentTime);
  startOfToday.setHours(0, 0, 0, 0);
  const lateScansCount = logs.filter(
    log => new Date(log.timestamp) >= startOfToday && log.type === 'in' && log.status === 'late'
  ).length;

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h3>Total Docentes</h3>
            <div className="metric-value">{totalTeachers}</div>
          </div>
          <div className="metric-icon-wrapper primary">
            <Users size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>En la Escuela</h3>
            <div className="metric-value">{presentTeachers}</div>
          </div>
          <div className="metric-icon-wrapper success">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Ausentes</h3>
            <div className="metric-value">{absentTeachers}</div>
          </div>
          <div className="metric-icon-wrapper secondary">
            <XCircle size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Ingresos Tardíos (Hoy)</h3>
            <div className="metric-value">{lateScansCount}</div>
          </div>
          <div className="metric-icon-wrapper danger">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="dashboard-layout">
        {/* Left Side: Real-time Presence list */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <UserCheck size={20} className="text-secondary" />
              <h2>Verificación de Presencia Docente</h2>
            </div>
            
            <div className="flex items-center gap-2" style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar profesor o materia..."
                className="form-control"
                style={{ paddingLeft: '36px', width: '240px', height: '38px', fontSize: '13px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search 
                size={16} 
                className="text-muted" 
                style={{ position: 'absolute', left: '12px', top: '11px' }} 
              />
            </div>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="text-center" style={{ padding: '40px 0', color: 'var(--text-secondary)' }}>
              No se encontraron docentes.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Profesor</th>
                    <th>Materia / Cargo</th>
                    <th>Horario Registrado</th>
                    <th>Estado de Presencia</th>
                    <th>Horario Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => {
                    const present = teacher.status === 'present';
                    const activeSchedule = isWithinSchedule(teacher.entryTime, teacher.exitTime, currentHHMM);
                    
                    let scheduleStatusText = '';
                    let scheduleStatusColor = 'var(--text-muted)';
                    
                    if (activeSchedule) {
                      scheduleStatusText = 'En horario laboral';
                      scheduleStatusColor = 'var(--color-primary)';
                    } else {
                      scheduleStatusText = 'Fuera de horario';
                      scheduleStatusColor = 'var(--text-muted)';
                    }

                    return (
                      <tr key={teacher.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{teacher.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID Huella: {teacher.fingerprintId}</div>
                        </td>
                        <td>{teacher.subject}</td>
                        <td>
                          <div className="flex items-center gap-2" style={{ fontSize: '13px' }}>
                            <Clock size={14} className="text-muted" />
                            <span>{teacher.entryTime} - {teacher.exitTime}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${present ? 'present' : 'absent'}`}>
                            {present ? 'En Escuela' : 'Ausente'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', color: scheduleStatusColor, fontWeight: 500 }}>
                            {scheduleStatusText}
                          </span>
                          {!present && activeSchedule && (
                            <div style={{ fontSize: '11px', color: 'var(--color-late)', marginTop: '2px', fontWeight: 600 }}>
                              Retraso de ingreso
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Recent Activity Logs */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <ArrowRightLeft size={20} className="text-secondary" />
              <h2>Últimos Accesos</h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {logs.slice(0, 5).map((log) => {
              const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isEntry = log.type === 'in';
              
              let logBadge = 'normal';
              let badgeText = isEntry ? 'Entrada' : 'Salida';
              
              if (log.status === 'late') {
                logBadge = 'late';
                badgeText = 'Entrada Tarde';
              } else if (log.status === 'early_exit') {
                logBadge = 'early';
                badgeText = 'Salida Anticipada';
              }

              return (
                <div 
                  key={log.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    paddingBottom: '14px', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)' 
                  }}
                >
                  <div 
                    style={{ 
                      backgroundColor: isEntry ? 'var(--color-present-bg)' : 'rgba(255, 255, 255, 0.05)',
                      color: isEntry ? 'var(--color-present)' : 'var(--text-secondary)',
                      padding: '8px', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Clock size={16} />
                  </div>
                  
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.teacherName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{logTime}</span>
                      <span className={`badge ${logBadge}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {badgeText}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {logs.length === 0 && (
              <div className="text-center" style={{ padding: '30px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                No hay registros de accesos hoy.
              </div>
            )}

            <button 
              className="btn btn-secondary btn-sm" 
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => onNavigateToTab('logs')}
            >
              <span>Ver historial completo</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
