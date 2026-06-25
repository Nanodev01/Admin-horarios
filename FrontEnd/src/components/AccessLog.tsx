import React, { useState, useEffect } from 'react';
import type { ScanLog, Teacher } from '../types';
import { Search, Calendar, SlidersHorizontal, Trash2, Download } from 'lucide-react';
import { apiService } from '../services/api'; 
import { socket } from '../services/socket'; 

import { printReceipt } from '../utils/printHelper';

export const AccessLog: React.FC = () => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]); // Guardamos los profesores para sacar el DNI en los tickets
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'late' | 'early_exit'>('all');

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateOption, setExportDateOption] = useState<'all' | 'last' | 'particular'>('all');
  const [exportParticularDate, setExportParticularDate] = useState('');

  // 📥 1. Cargar el historial inicial desde SQLite mediante Express
  useEffect(() => {
    // Traemos los logs
    apiService.getLogs()
      .then(data => setLogs(data))
      .catch(err => console.error("Error al cargar logs:", err));

    // Traemos los profesores para el cruce de datos del DNI
    apiService.getTeachers()
      .then(data => setTeachers(data))
      .catch(err => console.error("Error al cargar profesores:", err));
  }, []);

  // 📻 2. Sintonizar el WebSocket para actualizar la tabla en vivo
  useEffect(() => {
    // Cuando el backend grita que una fichada se guardó con éxito en SQLite
    socket.on('fichada-exitosa', (nuevoLog: ScanLog) => {
      // Metemos el nuevo registro arriba de todo en la tabla sin recargar la página
      setLogs((prevLogs) => [nuevoLog, ...prevLogs]);
    });

    return () => {
      socket.off('fichada-exitosa');
    };
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.teacherSubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.fingerprintId.includes(searchQuery);

    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getLocalDateStr = (isoString: string): string => {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLatestLogDateStr = (): string => {
    if (logs.length === 0) return '';
    const latestTimestamp = logs.reduce((max, log) => {
      return log.timestamp > max ? log.timestamp : max;
    }, logs[0].timestamp);
    return getLocalDateStr(latestTimestamp);
  };

  const getLogsToExport = (): ScanLog[] => {
    if (exportDateOption === 'last') {
      const latestDateStr = getLatestLogDateStr();
      if (!latestDateStr) return [];
      return filteredLogs.filter(log => getLocalDateStr(log.timestamp) === latestDateStr);
    } else if (exportDateOption === 'particular') {
      if (!exportParticularDate) return [];
      return filteredLogs.filter(log => getLocalDateStr(log.timestamp) === exportParticularDate);
    }
    return filteredLogs;
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const executeExport = (logsToExport: ScanLog[]) => {
    const headers = ['Fecha', 'Hora', 'Docente', 'Materia', 'Huella ID', 'Tipo', 'Estado', 'Observaciones'];
    const rows = logsToExport.map(log => {
      const dateObj = new Date(log.timestamp);
      const date = dateObj.toLocaleDateString();
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const type = log.type === 'in' ? 'Entrada' : 'Salida';
      
      let status = 'Normal';
      if (log.status === 'late') status = 'Tarde';
      else if (log.status === 'early_exit') status = 'Salida Anticipada';

      return [date, time, `"${log.teacherName}"`, `"${log.teacherSubject}"`, log.fingerprintId, type, status, '""'];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    let filenameSuffix = 'todos';
    if (exportDateOption === 'last') {
      filenameSuffix = `ultimo_dia_${getLatestLogDateStr()}`;
    } else if (exportDateOption === 'particular') {
      filenameSuffix = `dia_${exportParticularDate}`;
    }
    
    link.setAttribute("download", `registro_accesos_${filenameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const handleClear = async () => {
    if (window.confirm('¿Está seguro que desea vaciar todo el historial de accesos? Esta acción no se puede deshacer.')) {
      try {
        // Acá podrías llamar a un método del backend para borrar la tabla de la base de datos real
        // apiService.clearLogs();
        setLogs([]);
      } catch (err) {
        alert("No se pudo vaciar el historial en el servidor.");
      }
    }
  };

  const handleOpenTeacher = (log: ScanLog) => {
    // 🔍 Buscamos el DNI de la lista que nos trajimos del Backend real
    const matchedTeacher = teachers.find(t => t.id === log.teacherId);
    const Dni = matchedTeacher?.dni || 'No disponible';

    // Disparamos la impresión en PDF desde el helper externo
    printReceipt(log, Dni);
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
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'in' | 'out')}
          >
            <option value="all">Todos los flujos</option>
            <option value="in">Entradas</option>
            <option value="out">Salidas</option>
          </select>

          <select 
            className="form-control"
            style={{ height: '38px', width: '150px', fontSize: '13px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'normal' | 'late' | 'early_exit')}
          >
            <option value="all">Todos los estados</option>
            <option value="normal">Normal</option>
            <option value="late">Tarde</option>
            <option value="early_exit">Salidas Anticipada</option>
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
                  second: '2-digit',
                  hour12: false
                });
                
                const isEntry = log.type === 'in';
                
                let statusBadgeClass = 'normal';
                let statusText = 'Normal';
                
                if (log.status === 'late') {
                  statusBadgeClass = 'late';
                  statusText = 'Tarde';
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
                        onClick={() => handleOpenTeacher(log)}
                        title="Exportar Comprobante PDF"
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
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Exportar Historial (CSV)</h3>
              <button className="modal-close" onClick={() => setShowExportModal(false)} style={{ fontSize: '24px' }}>
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '13px' }}>
                Seleccione qué registros desea exportar al archivo CSV.
              </p>
              
              <div className="export-options-list">
                <label className={`export-option-card ${exportDateOption === 'all' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="exportDateOption" 
                    value="all" 
                    checked={exportDateOption === 'all'} 
                    onChange={() => setExportDateOption('all')} 
                  />
                  <div className="option-info">
                    <strong>Todos los registros</strong>
                    <span>Exporta el historial completo ({filteredLogs.length} filas)</span>
                  </div>
                </label>

                <label className={`export-option-card ${exportDateOption === 'last' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="exportDateOption" 
                    value="last" 
                    checked={exportDateOption === 'last'} 
                    disabled={logs.length === 0}
                    onChange={() => setExportDateOption('last')} 
                  />
                  <div className="option-info">
                    <strong>Último día con actividad</strong>
                    <span>{getLatestLogDateStr() ? `Exportar día: ${getLatestLogDateStr()}` : 'Sin actividad registrada'}</span>
                  </div>
                </label>

                <label className={`export-option-card ${exportDateOption === 'particular' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="exportDateOption" 
                    value="particular" 
                    checked={exportDateOption === 'particular'} 
                    onChange={() => setExportDateOption('particular')} 
                  />
                  <div className="option-info">
                    <strong>Un día en particular</strong>
                    <span>Seleccione un día específico del calendario</span>
                  </div>
                </label>
              </div>

              {exportDateOption === 'particular' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Seleccione la fecha:
                  </label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={exportParticularDate} 
                    onChange={(e) => setExportParticularDate(e.target.value)} 
                    max={new Date().toISOString().substring(0, 10)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowExportModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => executeExport(getLogsToExport())}
                disabled={
                  (exportDateOption === 'last' && !getLatestLogDateStr()) ||
                  (exportDateOption === 'particular' && !exportParticularDate) ||
                  getLogsToExport().length === 0
                }
              >
                Exportar ({getLogsToExport().length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
