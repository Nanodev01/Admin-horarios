import React, { useState } from 'react';
import type { Teacher } from '../types';
import { Fingerprint, Info, Cpu } from 'lucide-react';
import { getDayNumber } from '../services/db';

interface FingerprintSimulatorProps {
  teachers: Teacher[];
  currentTime: Date;
  onScan: (fingerprintId: string) => { success: boolean; message: string };
}

export const FingerprintSimulator: React.FC<FingerprintSimulatorProps> = ({ 
  teachers, 
  currentTime,
  onScan 
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [customFingerprintId, setCustomFingerprintId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: 'Esperando huella dactilar...'
  });

  const getActiveTeachers = () => teachers.filter(t => t.active);

  const handleScan = () => {
    let fingerprintId = '';
    
    if (selectedTeacherId) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (teacher) fingerprintId = teacher.fingerprintId;
    } else if (customFingerprintId.trim()) {
      fingerprintId = customFingerprintId.trim();
    }

    if (!fingerprintId) {
      setScanResult({
        status: 'error',
        message: 'Seleccione un docente o ingrese un ID de huella manual.'
      });
      return;
    }

    // Trigger scanning animation
    setScanning(true);
    setScanResult({
      status: 'idle',
      message: 'Escaneando huella... No retire el dedo.'
    });

    setTimeout(() => {
      setScanning(false);
      const res = onScan(fingerprintId);
      
      if (res.success) {
        setScanResult({
          status: 'success',
          message: res.message
        });
      } else {
        setScanResult({
          status: 'error',
          message: res.message
        });
      }
    }, 1500);
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="simulator-container">
      {/* Scalability Notice & Architecture Explanation */}
      <div 
        className="panel-card" 
        style={{ 
          marginBottom: '32px', 
          borderLeft: '4px solid var(--color-secondary)',
          background: 'rgba(6, 182, 212, 0.05)'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <Cpu size={24} className="text-secondary" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Arquitectura Escalable para Lector Físico Biométrico
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Esta aplicación está diseñada siguiendo el patrón de inyección de dependencias. Para integrar un lector de huellas dactilares físico (ej. Arduino NodeMCU ESP8266 + Sensor ZFM-20 o lector USB digitalPersona) en el futuro, solo debe reemplazar el método de simulación por un endpoint de API REST (ej. <code>/api/biometrics/scan</code>) o un WebSocket. El sistema ya utiliza los mismos identificadores numéricos que guardan los sensores biométricos.
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Left Side: Hardware device UI */}
        <div className="panel-card flex items-center justify-between" style={{ flexDirection: 'column', gap: '20px' }}>
          <div className="panel-title w-full">
            <Fingerprint size={20} className="text-primary" />
            <h2>Lector Biométrico ZK-9500</h2>
          </div>

          <div className="device-simulator">
            {/* LEDs indicators */}
            <div className="device-leds">
              <div className="led led-power active" title="Encendido"></div>
              <div 
                className={`led led-status ${
                  scanResult.status === 'success' ? 'success' : 
                  scanResult.status === 'error' ? 'error' : ''
                }`}
                title="Estado de Operación"
              ></div>
            </div>

            {/* Screen */}
            <div 
              className={`device-screen ${
                scanResult.status === 'success' ? 'success' : 
                scanResult.status === 'error' ? 'error' : ''
              }`}
            >
              {scanning ? (
                <>
                  <div>ANALIZANDO...</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Procesando minucias</div>
                </>
              ) : scanResult.status === 'success' ? (
                <>
                  <div>AUTORIZADO</div>
                  <div style={{ fontSize: '10px' }}>Acceso Registrado</div>
                </>
              ) : scanResult.status === 'error' ? (
                <>
                  <div>DENEGADO</div>
                  <div style={{ fontSize: '10px' }}>Huella Inválida</div>
                </>
              ) : (
                <>
                  <div>INGRESE HUELLA</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dispositivo Activo</div>
                </>
              )}
            </div>

            {/* Scanner Bed */}
            <div 
              className={`scanner-container ${
                scanning ? 'scanning' : 
                scanResult.status === 'success' ? 'success' : 
                scanResult.status === 'error' ? 'error' : 'ready'
              }`}
              onClick={scanning ? undefined : handleScan}
            >
              <div className="laser-line"></div>
              <Fingerprint className="fingerprint-icon" />
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Presione sobre el sensor para colocar la huella dactilar
            </p>
          </div>
          
          {scanResult.status !== 'idle' && (
            <div 
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: scanResult.status === 'success' ? 'var(--color-present-bg)' : 'var(--color-late-bg)',
                border: `1px solid ${scanResult.status === 'success' ? 'var(--color-present-border)' : 'var(--color-late-border)'}`,
                color: scanResult.status === 'success' ? 'var(--color-present)' : 'var(--color-late)',
                fontSize: '13px',
                textAlign: 'center',
                fontWeight: 500
              }}
            >
              {scanResult.message}
            </div>
          )}
        </div>

        {/* Right Side: Simulation triggers */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <Info size={20} className="text-secondary" />
              <h2>Configurar Huella a Simular</h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Seleccionar Docente Registrado</label>
              <select 
                className="form-control"
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setCustomFingerprintId('');
                }}
                disabled={scanning}
              >
                <option value="">-- Seleccionar Docente --</option>
                {getActiveTeachers().map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} (Huella ID: {teacher.fingerprintId}) [{teacher.status === 'present' ? 'Adentro' : 'Afuera'}]
                  </option>
                ))}
              </select>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--text-muted)',
                fontSize: '12px'
              }}
            >
              - o ingresar huella no registrada -
            </div>

            <div className="form-group">
              <label>ID de Huella Manual (Para simular error o huella externa)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. 9999"
                value={customFingerprintId}
                onChange={(e) => {
                  setCustomFingerprintId(e.target.value);
                  setSelectedTeacherId('');
                }}
                disabled={scanning}
              />
            </div>

            {selectedTeacher && (
              <div 
                style={{ 
                  padding: '12px', 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Datos del Profesor Seleccionado:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Materia:</span>
                  <span>{selectedTeacher.subject}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Horario Hoy:</span>
                  <span>
                    {(() => {
                      const dayNumber = getDayNumber(currentTime);
                      const todaySchedule = selectedTeacher.schedules?.[dayNumber];
                      if (todaySchedule) {
                        return `${todaySchedule.entryTime} - ${todaySchedule.exitTime}`;
                      } else if (selectedTeacher.schedules) {
                        return 'No trabaja hoy';
                      }
                      return `${selectedTeacher.entryTime} - ${selectedTeacher.exitTime}`;
                    })()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Estado Actual:</span>
                  <span className={selectedTeacher.status === 'present' ? 'text-present' : 'text-muted'} style={{ fontWeight: 600 }}>
                    {selectedTeacher.status === 'present' ? 'Dentro del Instituto' : 'Fuera del Instituto'}
                  </span>
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleScan}
              disabled={scanning || (!selectedTeacherId && !customFingerprintId.trim())}
              style={{ width: '100%', padding: '12px' }}
            >
              <Fingerprint size={18} />
              <span>{scanning ? 'Simulando Escaneo...' : 'Simular Lectura de Huella'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
