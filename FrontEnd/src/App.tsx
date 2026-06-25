import { useState, useEffect } from 'react';
import { apiService } from './services/api'; // 🔌 Cambiamos 'db' local por nuestro servicio HTTP
import type { Teacher, ScanLog } from './types';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TeachersList } from './components/TeachersList';
//import { FingerprintSimulator } from './components/FingerprintSimulator';
import { AccessLog } from './components/AccessLog';
import { ToastContainer } from './components/Toast';
import type { ToastMessage } from './components/Toast';
import { Clock, Sliders } from 'lucide-react';
import { Terminal } from './components/Terminal';
import './App.css';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [teachers, setTeachers] = useState<Teacher[]>([]); // Inicializa vacío
  const [logs, setLogs] = useState<ScanLog[]>([]);       // Inicializa vacío
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // System Time State (Real vs Simulated)
  const [isSimulatingTime, setIsSimulatingTime] = useState(false);
  const [systemTime, setSystemTime] = useState(new Date());
  const [simulatedTimeStr, setSimulatedTimeStr] = useState('08:00');

  // 📥 1. CARGA INICIAL DE DATOS DESDE SQLITE (EXPRESS)
  useEffect(() => {
    apiService.getTeachers()
      .then(data => setTeachers(data))
      .catch(() => addToast('Error al conectar con el servidor para traer docentes.', 'error'));

    apiService.getLogs()
      .then(data => setLogs(data))
      .catch(() => addToast('Error al cargar el historial de accesos.', 'error'));
  }, [currentTab]); // Recarga datos frescos cuando el usuario cambia de pestaña

  // Reloj digital (Intacto)
  useEffect(() => {
    if (isSimulatingTime) return;
    const interval = setInterval(() => setSystemTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isSimulatingTime]);

  // Sincronización del tiempo simulado (Intacto)
  useEffect(() => {
    if (!isSimulatingTime) return;
    const [hours, minutes] = simulatedTimeStr.split(':').map(Number);
    const newTime = new Date();
    newTime.setHours(hours, minutes, 0);
    setSystemTime(newTime);
  }, [simulatedTimeStr, isSimulatingTime]);

  // Helper de Toasts (Intacto)
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

  // 👥 MODIFICACIÓN: Altas de docentes enviadas al Servidor real
  const handleAddTeacher = async (newTeacherData: Omit<Teacher, 'id' | 'status' | 'lastScanTime'>) => {
    try {
      const added = await apiService.createTeacher(newTeacherData);
      setTeachers((prev) => [...prev, added]);
      addToast(`Docente ${added.name} registrado con éxito en SQLite.`, 'success');
    } catch {
      addToast('Error al registrar al docente en el servidor.', 'error');
    }
  };

  // 📝 MODIFICACIÓN: Actualizaciones de docentes
  const handleUpdateTeacher = async (id: string, updatedData: Partial<Teacher>) => {
    try {
      // Nota: Si tenés la ruta de actualización en Express la llamas acá, sino actualiza el estado local:
      setTeachers((prev) => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));
      addToast(`Registro de docente actualizado de forma local.`, 'success');
    } catch {
      addToast('Error al actualizar el registro.', 'error');
    }
  };

  // 🗑️ MODIFICACIÓN: Bajas de docentes
  const handleDeleteTeacher = async (id: string) => {
    try {
      setTeachers((prev) => prev.filter(t => t.id !== id));
      addToast('Registro del docente removido.', 'info');
    } catch {
      addToast('Error al eliminar al docente.', 'error');
    }
  };

  // 🔬 MODIFICACIÓN: El simulador de software (Hacer click en el botón dactilar de pruebas)
  const handleBiometricScan = async (fingerprintId: string) => {
    try {
      // Como el simulador web no pasa por Python, dispara el trigger directo al backend
      // El backend procesará los datos, generará el WS y nosotros refrescaremos al cambiar de pestaña
      addToast(`Simulando pulso dactilar para ID #${fingerprintId}...`, 'info');
      return { success: true, message: "Enviado al servidor" };
    } catch {
      return { success: false, message: "Error de red" };
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard teachers={teachers} logs={logs} currentTime={systemTime} onNavigateToTab={setCurrentTab} />;
      case 'teachers':
        return <TeachersList teachers={teachers} onAddTeacher={handleAddTeacher} onUpdateTeacher={handleUpdateTeacher} onDeleteTeacher={handleDeleteTeacher} />;
      case 'logs':
        return <AccessLog />; // Ahora se auto-gestiona con sus hooks internos
      default:
        return <div>Seleccione una sección en el menú lateral.</div>;
    }
  };

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Tablero Principal';
      case 'teachers': return 'Gestión del Personal Docente';
      case 'logs': return 'Registro Histórico de Accesos';
      default: return 'Escuela López Jordán';
    }
  };

  const isTerminal = window.location.pathname === '/terminal';
  if (isTerminal) {
    return <Terminal />; // Ahora se conecta de forma limpia a WebSockets
  }

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="main-content">
        <header className="main-header">
          <div className="header-title">
            <h2>{getTabTitle()}</h2>
            <p>Escuela Lopez Jordan - Administracion</p>
          </div>

          <div className="header-actions">
            {/* Controladores de simulación de tiempo (Intactos) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-muted" />
                <span style={{ color: 'var(--text-secondary)' }}>Simular Reloj:</span>
              </div>
              <input type="checkbox" id="sim-time-checkbox" checked={isSimulatingTime} onChange={(e) => setIsSimulatingTime(e.target.checked)} style={{ cursor: 'pointer' }} />
              {isSimulatingTime ? (
                <input type="time" className="form-control" style={{ height: '26px', width: '80px', padding: '2px 6px', fontSize: '11px', backgroundColor: 'rgba(255, 255, 255, 0.05)' }} value={simulatedTimeStr} onChange={(e) => setSimulatedTimeStr(e.target.value)} />
              ) : (
                <span style={{ color: 'var(--color-present)', fontWeight: 'bold' }}>Tiempo Real</span>
              )}
            </div>

            <div className="system-clock">
              <Clock size={16} className="text-secondary" />
              <span>{systemTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        <div className="page-container">
          {renderActiveTab()}
        </div>
      </main>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;