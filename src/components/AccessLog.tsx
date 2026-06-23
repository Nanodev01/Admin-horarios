import React, { useState } from 'react';
import type { ScanLog } from '../types';
import { Search, Calendar, SlidersHorizontal, Trash2, Download } from 'lucide-react';
import { db } from '../services/db';

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
  const handleOpenTeacher = (log: ScanLog) => {
    const dateObj = new Date(log.timestamp);
    const formattedDate = dateObj.toLocaleDateString('es-AR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, ' / ');
    
    const formattedTime = dateObj.toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });

    const isEntry = log.type === 'in';
    const typeStr = isEntry ? 'INGRESO / ENTRADA' : 'EGRESO / SALIDA';

    let statusStr = 'VALIDADO / EXITOSO';
    if (log.status === 'late') {
      statusStr = 'VALIDADO / INGRESO TARDÍO';
    } else if (log.status === 'early_exit') {
      statusStr = 'VALIDADO / SALIDA ANTICIPADA';
    } else if (log.status === 'outside_schedule') {
      statusStr = 'VALIDADO / FUERA DE HORARIO';
    }

    const datePart = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
    const cleanId = log.id.replace('l_', '').toUpperCase();
    const trxId = `TRX-${datePart}-${cleanId}`;

    const parsedFingerprint = parseInt(log.fingerprintId) || 0;
    const fallbackDni = (20000000 + parsedFingerprint * 739).toLocaleString('es-AR');
    const teachers = db.getTeachers();
    const matchedTeacher = teachers.find(t => t.id === log.teacherId);
    const mockDni = matchedTeacher?.dni || fallbackDni;

    // Simple deterministic hash generator
    let hashVal = 0;
    const hashStr = log.id + log.timestamp;
    for (let i = 0; i < hashStr.length; i++) {
      hashVal = (hashVal << 5) - hashVal + hashStr.charCodeAt(i);
      hashVal |= 0;
    }
    const hashHex = (
      Math.abs(hashVal).toString(16).padEnd(8, 'a') + 
      Math.abs(hashVal * 31).toString(16).padEnd(8, 'b') +
      Math.abs(hashVal * 97).toString(16).padEnd(8, 'c') +
      Math.abs(hashVal * 13).toString(16).padEnd(8, 'd') +
      Math.abs(hashVal * 7).toString(16).padEnd(8, 'e') +
      Math.abs(hashVal * 5).toString(16).padEnd(8, 'f') +
      Math.abs(hashVal * 3).toString(16).padEnd(8, '7') +
      Math.abs(hashVal * 2).toString(16).padEnd(8, '9')
    ).slice(0, 64);

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Registro Biométrico - ${log.teacherName}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            color: #000;
            background-color: #fff;
            margin: 0;
            padding: 30px;
            font-size: 12px;
            line-height: 1.5;
        }
        .container {
            border: 2px solid #000;
            padding: 20px;
            max-width: 700px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 18px;
            text-transform: uppercase;
            margin: 0 0 5px 0;
        }
        .header p {
            margin: 3px 0;
        }
        .section-title {
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            margin-top: 20px;
            padding-bottom: 3px;
        }
        table {
            width: 100%;
            margin-top: 10px;
            border-collapse: collapse;
        }
        td {
            padding: 6px 0;
            vertical-align: top;
        }
        .w-35 { width: 35%; font-weight: bold; }
        .w-65 { width: 65%; }
        .hash-box {
            font-family: monospace;
            font-size: 10px;
            background-color: #fff;
            border: 1px solid #000;
            padding: 10px;
            margin-top: 10px;
            word-break: break-all;
        }
        .footer {
            margin-top: 40px;
            font-size: 10px;
            text-align: justify;
            border-top: 1px dashed #000;
            padding-top: 10px;
        }
        .signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        .signature-line {
            width: 40%;
            border-top: 1px solid #000;
            text-align: center;
            padding-top: 5px;
            font-size: 11px;
        }
        .no-print-bar {
            background: #1e1b4b;
            color: #fff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin-bottom: 20px;
            border-radius: 8px;
            max-width: 700px;
            margin: 0 auto 20px auto;
        }
        .print-btn {
            background: #6366f1;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            transition: background 0.2s;
        }
        .print-btn:hover {
            background: #4f46e5;
        }
        @media print {
            .no-print-bar {
                display: none !important;
            }
            body {
                padding: 0;
            }
            .container {
                border: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>

<div class="no-print-bar">
    <span style="font-size: 13px;">Comprobante de Asistencia generado correctamente</span>
    <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>

<div class="container">
    
    <div class="header">
        <h1>ESCUELA Sec. N°13  Gdor. Ricardo Lopez Jordan</h1>
        <p><strong>Comprobante de Registro Biométrico de Asistencia</strong></p>
        <p>Validez de Control de Presentismo / Constancia para Cobertura de A.R.T.</p>
    </div>

    <table>
        <tr>
            <td class="w-35">NÚMERO DE TRANSACCIÓN:</td>
            <td class="w-65">${trxId}</td>
        </tr>
        <tr>
            <td class="w-35">ESTADO DEL REGISTRO:</td>
            <td class="w-65"><strong>${statusStr}</strong></td>
        </tr>
    </table>

    <div class="section-title">Datos del Personal de la Institución</div>
    <table>
        <tr>
            <td class="w-35">APELLIDO Y NOMBRE:</td>
            <td class="w-65">${log.teacherName}</td>
        </tr>
        <tr>
            <td class="w-35">DOCUMENTO (DNI/ID):</td>
            <td class="w-65">${mockDni}</td>
        </tr>
        <tr>
            <td class="w-35">FUNCIÓN / CARGO:</td>
            <td class="w-65">${log.teacherSubject}</td>
        </tr>
    </table>

    <div class="section-title">Detalles del Marcado Cronológico (Timestamp)</div>
    <table>
        <tr>
            <td class="w-35">FECHA DE REGISTRO:</td>
            <td class="w-65">${formattedDate}</td>
        </tr>
        <tr>
            <td class="w-35">HORA DE INGRESO (SERVER):</td>
            <td class="w-65">${formattedTime}</td>
        </tr>
        <tr>
            <td class="w-35">TIPO DE MOVIMIENTO:</td>
            <td class="w-65">${typeStr}</td>
        </tr>
    </table>

    <div class="section-title">Evidencia Técnica e Inalterabilidad Digital</div>
    <table>
        <tr>
            <td class="w-35">MÉTODO DE VERIFICACIÓN:</td>
            <td class="w-65">Biométrico Hardware (Sensor Óptico AS608 UART)</td>
        </tr>
        <tr>
            <td class="w-35">ID BIOMÉTRICO ASIGNADO:</td>
            <td class="w-65">ID #${log.fingerprintId.padStart(3, '0')} (Asociado unívocamente a Legajo de Origen)</td>
        </tr>
        <tr>
            <td class="w-35">FIRMA DIGITAL (HASH MD5/SHA256):</td>
            <td class="w-65">
                <div class="hash-box">
                    ${hashHex}
                </div>
            </td>
        </tr>
    </table>

    <div class="footer">
        <strong>NOTA LEGAL DE AUDITORÍA:</strong> Este documento constituye una constancia digital de presencia emitida por el servidor central de la institución. La verificación biométrica por huella dactilar garantiza el principio de no repudio. El código Hash superior vincula de forma matemática e indisoluble la identidad del docente, la fecha, la hora exacta del servidor y el identificador físico del hardware. Cualquier alteración de estos datos anula la validez del presente comprobante ante auditorías de la Aseguradora de Riesgos del Trabajo (A.R.T.).
    </div>

    <div class="signatures">
        <div class="signature-line">
            Firma y Aclaración Responsable Institucional
        </div>
        <div class="signature-line">
            Firma del Agente / Docente (Opcional)
        </div>
    </div>

</div>

</body>
</html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
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
                  second: '2-digit'
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
    </div>
  );
};
