import React, { useState, useEffect, useRef } from 'react';
import type { ScanLog } from '../types';
import { db } from '../services/db';
import { 
  Fingerprint, 
  Clock, 
  Calendar, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft,
  Info
} from 'lucide-react';

interface TerminalProps {
  initialLogs: ScanLog[];
}

export const Terminal: React.FC<TerminalProps> = ({ initialLogs }) => {
  const [logs, setLogs] = useState<ScanLog[]>(initialLogs);
  const [latestLog, setLatestLog] = useState<ScanLog | null>(() => {
    return initialLogs.length > 0 ? initialLogs[0] : null;
  });
  const [activeHighlight, setActiveHighlight] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('terminal_sound_enabled');
    return saved === 'true';
  });

  const soundEnabledRef = useRef(soundEnabled);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ref with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // AudioContext Beep Generator
  const playBeep = (type: 'success' | 'error') => {
    if (!soundEnabledRef.current) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        // Elegant bi-tone success beep
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        oscillator.start();
        
        // Schedule pitch change for the bi-tone
        oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08); // E6 note
        oscillator.stop(audioCtx.currentTime + 0.22);
      } else {
        oscillator.type = 'sawtooth';
        // Low pitch buzz warning sound
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3 note
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (error) {
      console.warn('AudioContext sound failed:', error);
    }
  };

  // Keep digital clock updated
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync state & setup highlights when new scan happens
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school_scan_logs') {
        const updatedLogs = db.getLogs();
        setLogs(updatedLogs);
        
        if (updatedLogs.length > 0) {
          const freshLog = updatedLogs[0];
          setLatestLog(freshLog);
          setActiveHighlight(true);
          
          // Sound effect helper execution
          const isError = freshLog.status === 'outside_schedule';
          playBeep(isError ? 'error' : 'success');

          // Reset the highlight after 8 seconds
          if (highlightTimerRef.current) {
            clearTimeout(highlightTimerRef.current);
          }
          highlightTimerRef.current = setTimeout(() => {
            setActiveHighlight(false);
          }, 8000);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('terminal_sound_enabled', String(newVal));
    
    // Play a brief test beep if sound is enabled
    if (newVal) {
      setTimeout(() => {
        try {
          const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextClass) return;
          const audioCtx = new AudioContextClass();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.05);
        } catch (e) {
          console.warn('Test beep failed', e);
        }
      }, 50);
    }
  };

  // Formatter helpers
  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
  };

  const formatLogTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatLogDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="terminal-view-container">
      {/* Top Kiosk Header */}
      <header className="terminal-header">
        <div className="terminal-brand">
          <div className="terminal-logo-ring">
            <Fingerprint size={24} className="text-secondary" />
          </div>
          <div>
            <h1>TERMINAL DE ASISTENCIA</h1>
            <p>Escuela Sec. N°13 Gdor. Ricardo López Jordán</p>
          </div>
        </div>
        
        <div className="terminal-header-controls">
          <button 
            className={`btn-sound-toggle ${soundEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Silenciar sonidos de marcado' : 'Activar sonido de confirmación'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}</span>
          </button>
          
          <div className="terminal-header-badge">
            <span className="pulse-indicator-dot"></span>
            En línea
          </div>
        </div>
      </header>

      {/* Main Terminal Grid */}
      <div className="terminal-grid">
        {/* Left Side: Real-Time Scanner Status / Highlight confirmation */}
        <section className="terminal-kiosk-status">
          {activeHighlight && latestLog ? (
            <div className={`kiosk-card scan-notification-card ${latestLog.type === 'in' ? 'check-in' : 'check-out'}`}>
              <div className="scan-card-decor"></div>
              
              <div className="scan-card-header">
                <div className="scan-icon-container">
                  <CheckCircle2 className="icon-success-check" size={64} />
                </div>
                <div className="scan-action-badge">
                  {latestLog.type === 'in' ? 'REGISTRO DE ENTRADA' : 'REGISTRO DE SALIDA'}
                </div>
              </div>

              <div className="scan-card-body">
                <span className="scan-label-top">Docente Identificado</span>
                <h2 className="scan-teacher-name">{latestLog.teacherName}</h2>
                <p className="scan-teacher-subject">{latestLog.teacherSubject}</p>
                
                <div className="scan-details-grid">
                  <div className="scan-detail-item">
                    <span className="detail-label">Hora Marcado</span>
                    <span className="detail-value highlight-value">
                      {formatLogTime(latestLog.timestamp)}
                    </span>
                  </div>
                  <div className="scan-detail-item">
                    <span className="detail-label">ID Huella</span>
                    <span className="detail-value highlight-value">
                      #{latestLog.fingerprintId.padStart(3, '0')}
                    </span>
                  </div>
                  <div className="scan-detail-item">
                    <span className="detail-label">Estado de Horario</span>
                    <span className="detail-value">
                      {latestLog.status === 'normal' && (
                        <span className="badge present" style={{ fontSize: '12px', padding: '6px 12px' }}>A Tiempo</span>
                      )}
                      {latestLog.status === 'late' && (
                        <span className="badge late" style={{ fontSize: '12px', padding: '6px 12px' }}>Ingreso Tardío</span>
                      )}
                      {latestLog.status === 'early_exit' && (
                        <span className="badge early" style={{ fontSize: '12px', padding: '6px 12px' }}>Salida Anticipada</span>
                      )}
                      {latestLog.status === 'outside_schedule' && (
                        <span className="badge absent" style={{ fontSize: '12px', padding: '6px 12px' }}>Fuera de Horario</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="scan-card-footer">
                <span className="success-pulse-banner">LECTURA VALIDADA CON ÉXITO</span>
              </div>
            </div>
          ) : (
            <div className="kiosk-card scan-idle-card">
              {/* Massive clock for kiosk display */}
              <div className="giant-clock-container">
                <div className="giant-time">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="giant-date">
                  <Calendar size={18} className="text-secondary" style={{ marginRight: '8px' }} />
                  {formatFullDate(currentTime)}
                </div>
              </div>

              <div className="kiosk-idle-content">
                <div className="fingerprint-scan-radar">
                  <div className="radar-ring r1"></div>
                  <div className="radar-ring r2"></div>
                  <div className="radar-ring r3"></div>
                  <Fingerprint size={80} className="pulsing-kiosk-fingerprint text-secondary" />
                </div>
                
                <h3>LECTOR BIOMÉTRICO ACTIVO</h3>
                <p>Aproxime su dedo al sensor dactilar para registrar su entrada o salida de la institución.</p>
                
                {!soundEnabled && (
                  <div className="sound-warning-banner" onClick={toggleSound}>
                    <Info size={14} style={{ marginRight: '6px', flexShrink: 0 }} />
                    <span>Haga clic para activar el sonido de confirmación.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Log Feed */}
        <section className="terminal-logs-panel panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <ArrowRightLeft size={18} className="text-secondary" />
              <h2>Últimos Movimientos Registrados</h2>
            </div>
            <span className="logs-count-badge">{logs.length} registros</span>
          </div>

          <div className="terminal-table-wrapper">
            {logs.length === 0 ? (
              <div className="terminal-empty-state">
                <AlertCircle size={32} className="text-muted" />
                <p>No se registran movimientos en el sistema el día de hoy.</p>
              </div>
            ) : (
              <table className="custom-table terminal-logs-table">
                <thead>
                  <tr>
                    <th>Hora / Fecha</th>
                    <th>Docente</th>
                    <th>ID Huella</th>
                    <th>Movimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((log) => {
                    const isEntry = log.type === 'in';
                    return (
                      <tr key={log.id} className={latestLog && latestLog.id === log.id && activeHighlight ? 'row-new-highlight' : ''}>
                        <td>
                          <div className="log-time-col">
                            <Clock size={12} className="text-muted" />
                            <strong>{formatLogTime(log.timestamp)}</strong>
                          </div>
                          <div className="log-date-col">{formatLogDate(log.timestamp)}</div>
                        </td>
                        <td>
                          <div className="log-teacher-name">{log.teacherName}</div>
                          <div className="log-teacher-sub">{log.teacherSubject}</div>
                        </td>
                        <td className="log-fp-id">
                          #{log.fingerprintId.padStart(3, '0')}
                        </td>
                        <td>
                          <span className={`badge ${isEntry ? 'present' : 'absent'}`} style={{ fontSize: '10px' }}>
                            {isEntry ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td>
                          {log.status === 'normal' && <span className="badge normal">A Tiempo</span>}
                          {log.status === 'late' && <span className="badge late">Tarde</span>}
                          {log.status === 'early_exit' && <span className="badge early">Anticipado</span>}
                          {log.status === 'outside_schedule' && <span className="badge absent">F. Horario</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="terminal-panel-footer">
            <span className="footer-sync-text">Las actualizaciones se sincronizan automáticamente en tiempo real.</span>
          </div>
        </section>
      </div>
    </div>
  );
};
