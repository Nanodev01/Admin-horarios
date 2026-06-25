import React, { useState, useEffect, useRef } from 'react';
import type { ScanLog } from '../types';
import { apiService } from '../services/api'; // 🔌 Traemos las peticiones iniciales
import { socket } from '../services/socket';   // 📻 Traemos el sintonizador de WebSockets
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

// 🕰️ Subcomponente aislado para el reloj. 
// De esta forma, el tic-tac de cada segundo solo re-renderiza este pequeño componente 
// y no toda la pantalla de la terminal (evitando diffs de Virtual DOM costosos en la Raspberry Pi).
const KioskClock: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="giant-clock-container">
      <div className="giant-time">
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
      <div className="giant-date">
        <Calendar size={18} className="text-secondary" style={{ marginRight: '8px' }} />
        {formatFullDate(currentTime)}
      </div>
    </div>
  );
};

export const Terminal: React.FC = () => {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [latestLog, setLatestLog] = useState<ScanLog | null>(null);
  const [activeHighlight, setActiveHighlight] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('terminal_sound_enabled');
    return saved === 'true';
  });

  const soundEnabledRef = useRef(soundEnabled);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  // 📥 1. Cargar el historial del día apenas se prende la pantalla
  useEffect(() => {
    apiService.getLogs()
      .then(data => {
        setLogs(data);
        if (data.length > 0) setLatestLog(data[0]);
      })
      .catch(err => console.error("Error al cargar logs iniciales:", err));
  }, []);

  // 🔊 Tu generador nativo de pitidos (Intacto)
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
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        oscillator.start();
        oscillator.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
        oscillator.stop(audioCtx.currentTime + 0.22);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (error) {
      console.warn('AudioContext sound failed:', error);
    }
  };



  // 📻 2. AQUÍ CONECTAMOS EL WEBSOCKET (Reemplaza al StorageEvent)
  useEffect(() => {
    const onConnect = () => {
      console.log('📡 Terminal conectada al servidor Socket.io con éxito!');
      setSocketConnected(true);
    };

    const onDisconnect = () => {
      console.log('❌ Terminal desconectada del servidor Socket.io');
      setSocketConnected(false);
    };

    const onConnectError = (error: any) => {
      console.error('🚨 Error de conexión en Socket.io de Terminal:', error);
      setSocketConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Si ya está conectado al montar, marcar como conectado
    if (socket.connected) {
      setSocketConnected(true);
    }

    // Escuchamos cuando el Backend confirma que impactó una asistencia en SQLite
    socket.on('fichada-exitosa', (freshLog: ScanLog) => {
      // Agregamos el nuevo log arriba de todo en la lista de movimientos
      setLogs((prevLogs) => [freshLog, ...prevLogs]);
      setLatestLog(freshLog);
      setActiveHighlight(true);
      
      // Ejecutamos tu validador de sonido
      const isError = freshLog.status === 'outside_schedule';
      playBeep(isError ? 'error' : 'success');

      // Reseteamos el cartel flotante a los 8 segundos (tal como lo programaste)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setActiveHighlight(false);
      }, 8000);
    });

    // Escuchamos si salta un error de huella inválida en el sensor para tirar el beep de error
    socket.on('fichada-error', () => {
      playBeep('error');
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('fichada-exitosa');
      socket.off('fichada-error');
    };
  }, []);

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('terminal_sound_enabled', String(newVal));
  };


  const formatLogTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };
  const formatLogDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
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
          
          <div className={`terminal-header-badge ${socketConnected ? 'online' : 'offline'}`}>
            <span className={`pulse-indicator-dot ${socketConnected ? 'connected' : 'disconnected'}`}></span>
            {socketConnected ? 'En línea' : 'Desconectado'}
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
              <KioskClock />

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
