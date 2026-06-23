import React, { useState } from 'react';
import type { ScanLog } from '../types';
import { Search, Calendar, SlidersHorizontal, Trash2, Download } from 'lucide-react';

interface AccessLogProps {
  logs: ScanLog[];
  onClearLogs: () => void;
}

export const AccessLog: React.FC<AccessLogProps> = ({ logs, onClearLogs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'late' | 'early_exit'>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.teacherSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.fingerprintId.includes(searchQuery);

    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleExport = () => {
    
    const headers = ['Fecha', 'Hora', 'Docente', 'Materia', 'Huella ID', 'Tipo', 'Estado', 'Observaciones'];
    const rows = filteredLogs.map(log => {
      const dateObj = new Date(log.timestamp);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const type = log.type === 'in' ? 'Entrada' : 'Salida';
      
      let status = 'Normal';
      if (log.status === 'late') status = 'Tarde';
      else if (log.status === 'early_exit') status = 'Salida Anticipada';

      return [
        date,
        time,
        `"${log.teacherName}"`,
        `"${log.teacherSubject}"`,
        log.fingerprintId,
        type,
        status
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `registro_accesos_escuela_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    if (window.confirm('¿Está seguro que desea vaciar todo el historial de accesos? Esta acción no se puede deshacer.')) {
      onClearLogs();
    }
  };
  const handleOpenTeacher = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Al estar en la carpeta 'public', se accede directo con la barra '/'
    window.open('/Ejemplo.html', '_blank');
  };
  return (
    <div className="access-logs-container panel-card">
      {/* Panel Header */}
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="panel-title">
          <Calendar size={20} className="text-secondary" />
          <h2>Historial de Accesos Biométricos</h2>
        </div>
        
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleExport}
            disabled={filteredLogs.length === 0}
            title="Exportar como CSV"
          >
            <Download size={14} />
            <span>Exportar</span>
          </button>
          <button 
            className="btn btn-danger btn-sm"
            onClick={handleClear}
            disabled={logs.length === 0}
            title="Vaciartodo el historial"
          >
            <Trash2 size={14} />
            <span>Limpiar Historial</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px', 
          flexWrap: 'wrap',
          backgroundColor: 'rgba(255,255,255,0.01)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Buscar por docente, materia o huella..."
            className="form-control"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search 
            size={16} 
            className="text-muted" 
            style={{ position: 'absolute', left: '12px', top: '11px' }} 
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted" />
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filtros:</span>
        </div>

        <div className="flex gap-2">
          <select 
            className="form-control"
            style={{ height: '38px', width: '130px', fontSize: '13px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">Todos los flujos</option>
            <option value="in">Entradas</option>
            <option value="out">Salidas</option>
          </select>

          <select 
            className="form-control"
            style={{ height: '38px', width: '150px', fontSize: '13px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Todos los estados</option>
            <option value="normal">Normales</option>
            <option value="late">Llegadas tarde</option>
            <option value="early_exit">Salidas anticipadas</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="text-center" style={{ padding: '60px 0', color: 'var(--text-secondary)' }}>
          No hay registros de accesos que coincidan con los filtros seleccionados.
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Docente</th>
                <th>Materia</th>
                <th>ID Huella</th>
                <th>Acción</th>
                <th>Estado Horario</th>
                <th>Exportar</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const formattedDate = dateObj.toLocaleDateString(undefined, { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                });
                const formattedTime = dateObj.toLocaleTimeString(undefined, { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                });
                
                const isEntry = log.type === 'in';
                
                let statusBadgeClass = 'normal';
                let statusText = 'Normal';
                
                if (log.status === 'late') {
                  statusBadgeClass = 'late';
                  statusText = 'Llegada Tarde';
                } else if (log.status === 'early_exit') {
                  statusBadgeClass = 'early';
                  statusText = 'Salida Anticipada';
                }

                return (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formattedTime}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.teacherName}</div>
                    </td>
                    <td>{log.teacherSubject}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{log.fingerprintId}</td>
                    <td>
                      <span className={`badge ${isEntry ? 'present' : 'absent'}`} style={{ fontSize: '10px' }}>
                        {isEntry ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '10px' }}>
                        {statusText}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={handleOpenTeacher} 
                      >
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
