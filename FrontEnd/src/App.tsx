import { useState, useEffect } from 'react';
import { db } from './services/db';
import type { Teacher, ScanLog } from './types';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TeachersList } from './components/TeachersList';
import { FingerprintSimulator } from './components/FingerprintSimulator';
import { AccessLog } from './components/AccessLog';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { Clock, Sliders, RotateCcw } from 'lucide-react';
import { Terminal } from './components/Terminal';
import './App.css';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>(() => db.getTeachers());
  const [logs, setLogs] = useState<ScanLog[]>(() => db.getLogs());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // System Time State (Real vs Simulated)
  const [isSimulatingTime, setIsSimulatingTime] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date());
  const [simulatedTimeStr, setSimulatedTimeStr] = useState('08:00'); // HH:MM for simulation

  // Update clock every second if not simulating
  useEffect(() => {
    if (isSimulatingTime) return;
    
    const interval = setInterval(() => {
      setSystemTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isSimulatingTime]);

  // Set system time based on simulated string
  useEffect(() => {
    if (!isSimulatingTime) return;
    
    const [hours, minutes] = simulatedTimeStr.split(':').map(Number);
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSystemTime(newTime);
  }, [simulatedTimeStr, isSimulatingTime]);

  // Sync state between tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'school_scan_logs') {
        setLogs(db.getLogs());
      }
      if (e.key === 'school_teachers') {
        setTeachers(db.getTeachers());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper to add toast
  const addToast = (text: string, type: 'success' | 'error' | 'info') => {
    const newToast: ToastMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  // Add teacher callback
  const handleAddTeacher = (newTeacherData: Omit<Teacher, 'id' | 'status' | 'lastScanTime'>) => {
    try {
      const added = db.addTeacher(newTeacherData);
      setTeachers(db.getTeachers());
      addToast(`Docente ${added.name} registrado con éxito.`, 'success');
    } catch {
      addToast('Error al registrar al docente.', 'error');
    }
  };

  // Update teacher callback
  const handleUpdateTeacher = (id: string, updatedData: Partial<Teacher>) => {
    try {
      db.updateTeacher(id, updatedData);
      setTeachers(db.getTeachers());
      addToast(`Registro de docente actualizado.`, 'success');
    } catch {
      addToast('Error al actualizar el registro.', 'error');
    }
  };

  // Delete teacher callback
  const handleDeleteTeacher = (id: string) => {
    try {
      db.deleteTeacher(id);
      setTeachers(db.getTeachers());
      addToast('Registro del docente eliminado.', 'info');
    } catch {
      addToast('Error al eliminar al docente.', 'error');
    }
  };

  // Biometric Scan Callback (processes entry/exit)
  const handleBiometricScan = async (fingerprintId: string) => {
    const result = await db.registerScan(fingerprintId, systemTime);
    
    // Sync React states
    setTeachers(db.getTeachers());
    setLogs(db.getLogs());

    if (result.success) {
      addToast(result.message, 'success');
      return { success: true, message: result.message };
    } else {
      addToast(result.message, 'error');
      return { success: false, message: result.message };
    }
  };

  // Clear logs callback
  const handleClearLogs = () => {
    db.saveLogs([]);
    setLogs([]);
    addToast('Historial de accesos vaciado correctamente.', 'info');
  };

  // Reset database entirely
  const handleResetDatabase = () => {
    if (window.confirm('¿Desea restablecer todos los datos a la configuración inicial de fábrica?')) {
      db.resetDatabase();
      setTeachers(db.getTeachers());
      setLogs(db.getLogs());
      addToast('Base de datos restablecida a valores iniciales.', 'info');
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard 
            teachers={teachers} 
            logs={logs} 
            currentTime={systemTime}
            onNavigateToTab={setCurrentTab}
          />
        );
      case 'teachers':
        return (
          <TeachersList 
            teachers={teachers}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacher={handleUpdateTeacher}
            onDeleteTeacher={handleDeleteTeacher}
          />
        );
      case 'biometrics':
        return (
          <FingerprintSimulator 
            teachers={teachers}
            currentTime={systemTime}
            onScan={handleBiometricScan}
          />
        );
      case 'logs':
        return (
          <AccessLog 
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        );
      default:
        return <div>Seleccione una sección en el menú lateral.</div>;
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Tablero Principal';
      case 'teachers': return 'Gestión del Personal Docente';
      case 'biometrics': return 'Lector Biométrico (Simulador)';
      case 'logs': return 'Registro Histórico de Accesos';
      default: return 'Escuela López Jordán';
    }
  };

  const isTerminal = window.location.pathname === '/terminal';
  if (isTerminal) {
    return <Terminal initialLogs={logs} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-title">
            <h2>{getTabTitle()}</h2>
            <p>Escuela Lopez Jordan - Administracion</p>
          </div>

          <div className="header-actions">
            {/* Time controller widget for testing schedules */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            >
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-muted" />
                <span style={{ color: 'var(--text-secondary)' }}>Simular Reloj:</span>
              </div>
              
              <input
                type="checkbox"
                id="sim-time-checkbox"
                checked={isSimulatingTime}
                onChange={(e) => setIsSimulatingTime(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              
              {isSimulatingTime ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="form-control"
                    style={{ 
                      height: '26px', 
                      width: '80px', 
                      padding: '2px 6px', 
                      fontSize: '11px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }}
                    value={simulatedTimeStr}
                    onChange={(e) => setSimulatedTimeStr(e.target.value)}
                  />
                </div>
              ) : (
                <span style={{ color: 'var(--color-present)', fontWeight: 'bold' }}>Tiempo Real</span>
              )}
            </div>

            {/* Current Display Time */}
            <div className="system-clock">
              <Clock size={16} className="text-secondary" />
              <span>
                {systemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Settings Reset Shortcut */}
            <button 
              className="btn btn-secondary btn-icon-only" 
              onClick={handleResetDatabase}
              title="Restablecer base de datos completa"
              style={{ padding: '8px' }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="page-container">
          {renderActiveTab()}
        </div>
      </main>

      {/* Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
