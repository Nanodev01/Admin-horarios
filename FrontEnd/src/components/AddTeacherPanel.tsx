import React, { useState, useEffect } from 'react';
import type { Teacher } from '../types';
import { apiService } from '../services/api';
import { socket } from '../services/socket';
import {
  UserPlus,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunes',     shortName: 'Lun' },
  { id: 2, name: 'Martes',    shortName: 'Mar' },
  { id: 3, name: 'Miércoles', shortName: 'Mié' },
  { id: 4, name: 'Jueves',    shortName: 'Jue' },
  { id: 5, name: 'Viernes',   shortName: 'Vie' },
  { id: 6, name: 'Sábado',    shortName: 'Sáb' },
  { id: 7, name: 'Domingo',   shortName: 'Dom' },
];

const DEFAULT_SCHEDULES = () => ({
  1: { active: true,  entryTime: '08:00', exitTime: '13:00' },
  2: { active: true,  entryTime: '08:00', exitTime: '13:00' },
  3: { active: true,  entryTime: '08:00', exitTime: '13:00' },
  4: { active: true,  entryTime: '08:00', exitTime: '13:00' },
  5: { active: true,  entryTime: '08:00', exitTime: '13:00' },
  6: { active: false, entryTime: '08:00', exitTime: '13:00' },
  7: { active: false, entryTime: '08:00', exitTime: '13:00' },
});

interface AddTeacherPanelProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Omit<Teacher, 'id' | 'status' | 'lastScanTime'>) => void;
}

export const AddTeacherPanel: React.FC<AddTeacherPanelProps> = ({ teachers, onAddTeacher }) => {
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [subject, setSubject] = useState('');
  const [fingerprintId, setFingerprintId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const [schedulesState, setSchedulesState] = useState<{
    [day: number]: { active: boolean; entryTime: string; exitTime: string }
  }>(DEFAULT_SCHEDULES());

  // El día seleccionado para editar su horario
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Biometric enrollment state
  const [enrollStatus, setEnrollStatus] = useState<{
    step: number; message: string; error?: boolean; success?: boolean
  } | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-assign next available fingerprint ID
  useEffect(() => {
    const usedIds = new Set(teachers.map(t => parseInt(t.fingerprintId)).filter(n => !isNaN(n)));
    let nextId = 1;
    while (usedIds.has(nextId) && nextId <= 149) nextId++;
    setFingerprintId(String(nextId));
  }, [teachers]);

  // Listen Socket.io enrollment events
  useEffect(() => {
    socket.on('enroll-step', (data: { step: number; message: string; error?: boolean; success?: boolean }) => {
      setEnrollStatus(data);
      if (data.error || data.success) setIsEnrolling(false);
    });
    return () => { socket.off('enroll-step'); };
  }, []);

  const handleStartEnroll = async () => {
    try {
      setIsEnrolling(true);
      setEnrollStatus({ step: 0, message: 'Iniciando conexión con el sensor en el servidor...' });
      await apiService.startEnrollment(fingerprintId);
    } catch (err: any) {
      setEnrollStatus({ step: 8, error: true, message: err.message || 'Error al conectar con el servidor.' });
      setIsEnrolling(false);
    }
  };

  const handleCancelEnroll = async () => {
    try {
      await apiService.cancelEnrollment();
      setEnrollStatus(null);
      setIsEnrolling(false);
    } catch (err) {
      console.error('Error al cancelar enrolamiento:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setDni('');
    setSubject('');
    setFormError('');
    setFormSuccess(false);
    setSchedulesState(DEFAULT_SCHEDULES());
    setSelectedDay(1);
    setEnrollStatus(null);
    setIsEnrolling(false);
    setIsSubmitting(false);
    // Recalculate next free fingerprint ID
    const usedIds = new Set(teachers.map(t => parseInt(t.fingerprintId)).filter(n => !isNaN(n)));
    let nextId = 1;
    while (usedIds.has(nextId) && nextId <= 149) nextId++;
    setFingerprintId(String(nextId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (isSubmitting) return;

    if (!name.trim())        return setFormError('El nombre es obligatorio.');
    if (!dni.trim())         return setFormError('El DNI es obligatorio.');
    if (!subject.trim())     return setFormError('La materia es obligatoria.');
    if (!fingerprintId.trim()) return setFormError('El ID de Huella es obligatorio.');

    const duplicate = teachers.find(t => t.fingerprintId === fingerprintId);
    if (duplicate) return setFormError(`El ID de Huella ${fingerprintId} ya está asignado a ${duplicate.name}.`);

    const schedules: { [day: number]: { entryTime: string; exitTime: string } } = {};
    let firstEntry = '';
    let firstExit = '';

    Object.keys(schedulesState).forEach(key => {
      const dayId = Number(key);
      const sched = schedulesState[dayId];
      if (sched.active) {
        schedules[dayId] = { entryTime: sched.entryTime, exitTime: sched.exitTime };
        if (!firstEntry) { firstEntry = sched.entryTime; firstExit = sched.exitTime; }
      }
    });

    if (Object.keys(schedules).length === 0) {
      return setFormError('Debe seleccionar al menos un día de trabajo con su respectivo horario.');
    }

    setIsSubmitting(true);
    onAddTeacher({
      name,
      dni,
      subject,
      entryTime: firstEntry,
      exitTime: firstExit,
      schedules,
      fingerprintId,
      active: true,
    });

    setFormSuccess(true);
    setTimeout(() => resetForm(), 2000);
  };

  const toggleDay = (dayId: number) => {
    setSchedulesState(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], active: !prev[dayId].active }
    }));
    // If activating, auto-select it for editing
    if (!schedulesState[dayId].active) {
      setSelectedDay(dayId);
    } else if (selectedDay === dayId) {
      // If deactivating the selected one, pick the first still-active
      const nextActive = DAYS_OF_WEEK.find(d => d.id !== dayId && schedulesState[d.id]?.active);
      if (nextActive) setSelectedDay(nextActive.id);
    }
  };

  const renderTimeSelects = (value: string, onChange: (v: string) => void) => {
    const [hour, minute] = value.split(':');
    const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    return (
      <div className="time-selects-row">
        <select
          className="form-control time-select"
          value={hour}
          onChange={e => onChange(`${e.target.value}:${minute}`)}
        >
          {hours.map(h => <option key={h} value={h}>{h} hs</option>)}
        </select>
        <span className="time-separator">:</span>
        <select
          className="form-control time-select"
          value={minute}
          onChange={e => onChange(`${hour}:${e.target.value}`)}
        >
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    );
  };

  const selectedSched = schedulesState[selectedDay] || { active: false, entryTime: '08:00', exitTime: '13:00' };
  const selectedDayInfo = DAYS_OF_WEEK.find(d => d.id === selectedDay)!;

  return (
    <div className="add-teacher-panel">
      {/* Panel Header */}
      <div className="add-panel-header">
        <div className="add-panel-header-title">
          <div className="add-panel-icon-ring">
            <UserPlus size={22} />
          </div>
          <div>
            <h2>Registrar Nuevo Docente</h2>
            <p>Complete los datos del docente y configure su horario semanal.</p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {formSuccess && (
        <div className="add-panel-success-banner">
          <CheckCircle2 size={20} />
          <span>¡Docente registrado con éxito en la base de datos!</span>
        </div>
      )}

      {/* Error Banner */}
      {formError && (
        <div className="add-panel-error-banner">
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-panel-form">
        {/* ======================== COLUMNA IZQUIERDA ======================== */}
        <div className="add-panel-col">
          <div className="add-panel-section panel-card">
            <h3 className="add-panel-section-title">
              <span className="section-number">1</span>
              Datos Personales
            </h3>

            <div className="form-group">
              <label htmlFor="ap-name">Nombre Completo</label>
              <input
                id="ap-name"
                type="text"
                className="form-control"
                placeholder="Ej. Juan Pérez"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="ap-dni">DNI / Documento</label>
              <input
                id="ap-dni"
                type="text"
                className="form-control"
                placeholder="Ej. 34.802.780"
                value={dni}
                onChange={e => setDni(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="ap-subject">Materia / Cargo</label>
              <input
                id="ap-subject"
                type="text"
                className="form-control"
                placeholder="Ej. Matemática de 4to año"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Biometric Section */}
          <div className="add-panel-section panel-card">
            <h3 className="add-panel-section-title">
              <span className="section-number">3</span>
              ID Biométrico
            </h3>

            <div className="form-group">
              <label htmlFor="ap-fp">ID del Lector de Huellas</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  id="ap-fp"
                  type="number"
                  className="form-control"
                  placeholder="Ej. 5"
                  min="1"
                  max="149"
                  value={fingerprintId}
                  onChange={e => setFingerprintId(e.target.value)}
                  disabled={isEnrolling}
                  style={{ flexGrow: 1 }}
                />
                <button
                  type="button"
                  className={`btn ${isEnrolling ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={isEnrolling ? handleCancelEnroll : handleStartEnroll}
                  disabled={!fingerprintId || parseInt(fingerprintId) < 1 || parseInt(fingerprintId) > 149}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <Fingerprint size={16} />
                  {isEnrolling ? 'Cancelar' : 'Enrolar'}
                </button>
              </div>
              <p className="ap-hint">
                <Info size={11} style={{ marginRight: '4px', flexShrink: 0 }} />
                Rango: 1–149. Se asigna automáticamente el próximo ID libre.
              </p>
            </div>

            {enrollStatus && (
              <div className={`enroll-status-panel ${enrollStatus.error ? 'enroll-error' : enrollStatus.success ? 'enroll-success' : 'enroll-progress'}`}>
                <div className="enroll-status-header">
                  <Fingerprint
                    size={18}
                    className={isEnrolling ? 'pulsing-kiosk-fingerprint' : ''}
                  />
                  <strong>
                    {enrollStatus.success
                      ? 'Enrolamiento Exitoso'
                      : enrollStatus.error
                        ? 'Fallo en Enrolamiento'
                        : `Paso ${enrollStatus.step} de 7`}
                  </strong>
                </div>
                <p className="enroll-status-msg">{enrollStatus.message}</p>
                {isEnrolling && (
                  <div className="enroll-progress-bar">
                    <div style={{ width: `${(enrollStatus.step / 7) * 100}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ======================== COLUMNA DERECHA ======================== */}
        <div className="add-panel-col">
          <div className="add-panel-section panel-card" style={{ flexGrow: 1 }}>
            <h3 className="add-panel-section-title">
              <span className="section-number">2</span>
              Horario Semanal
            </h3>

            {/* Day Toggle Grid */}
            <div className="day-toggle-grid">
              {DAYS_OF_WEEK.map(day => {
                const sched = schedulesState[day.id];
                const isActive = sched?.active ?? false;
                const isSelected = selectedDay === day.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    className={`day-toggle-btn ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (!isActive) {
                        // Activate and select
                        setSchedulesState(prev => ({
                          ...prev,
                          [day.id]: { ...prev[day.id], active: true }
                        }));
                        setSelectedDay(day.id);
                      } else if (isSelected) {
                        // Deactivate only if not the last active day
                        const activeDays = Object.values(schedulesState).filter(s => s.active).length;
                        if (activeDays > 1) {
                          setSchedulesState(prev => ({
                            ...prev,
                            [day.id]: { ...prev[day.id], active: false }
                          }));
                          const nextActive = DAYS_OF_WEEK.find(d => d.id !== day.id && schedulesState[d.id]?.active);
                          if (nextActive) setSelectedDay(nextActive.id);
                        }
                      } else {
                        // Just select (already active)
                        setSelectedDay(day.id);
                      }
                    }}
                  >
                    <span className="day-toggle-name">{day.shortName}</span>
                    {isActive && <span className="day-toggle-dot" />}
                  </button>
                );
              })}
            </div>

            <p className="ap-hint" style={{ marginBottom: '16px' }}>
              Clic en un día para activarlo/seleccionarlo. Hacé clic en el día seleccionado (activo) para desactivarlo.
            </p>

            {/* Selected Day Time Editor */}
            <div className={`day-schedule-editor ${selectedSched.active ? 'active-day' : 'inactive-day'}`}>
              <div className="day-editor-title">
                <Clock size={14} />
                <span>
                  {selectedSched.active
                    ? `Horario del ${selectedDayInfo.name}`
                    : `${selectedDayInfo.name} — Sin asistencia`}
                </span>
                <label className="day-active-toggle">
                  <input
                    type="checkbox"
                    checked={selectedSched.active}
                    onChange={() => toggleDay(selectedDay)}
                  />
                  <span>{selectedSched.active ? 'Activo' : 'Inactivo'}</span>
                </label>
              </div>

              {selectedSched.active ? (
                <div className="day-time-row">
                  <div className="day-time-col">
                    <label>Entrada</label>
                    {renderTimeSelects(selectedSched.entryTime, v =>
                      setSchedulesState(prev => ({
                        ...prev,
                        [selectedDay]: { ...prev[selectedDay], entryTime: v }
                      }))
                    )}
                  </div>
                  <div className="day-time-divider">→</div>
                  <div className="day-time-col">
                    <label>Salida</label>
                    {renderTimeSelects(selectedSched.exitTime, v =>
                      setSchedulesState(prev => ({
                        ...prev,
                        [selectedDay]: { ...prev[selectedDay], exitTime: v }
                      }))
                    )}
                  </div>
                </div>
              ) : (
                <p className="day-inactive-note">
                  El docente no asiste a la institución los días {selectedDayInfo.name}.
                </p>
              )}
            </div>

            {/* Weekly Summary */}
            <div className="weekly-summary">
              <span className="weekly-summary-title">Resumen semanal configurado:</span>
              <div className="weekly-summary-chips">
                {DAYS_OF_WEEK.filter(d => schedulesState[d.id]?.active).map(d => (
                  <span key={d.id} className="weekly-chip">
                    {d.shortName}: {schedulesState[d.id].entryTime} — {schedulesState[d.id].exitTime}
                  </span>
                ))}
                {!DAYS_OF_WEEK.some(d => schedulesState[d.id]?.active) && (
                  <span style={{ color: 'var(--color-late)', fontSize: '12px' }}>Ningún día activo</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Submit Footer */}
        <div className="add-panel-footer">
          <button type="button" className="btn btn-secondary" onClick={resetForm}>
            Limpiar Formulario
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <UserPlus size={16} />
            {isSubmitting ? 'Registrando...' : 'Registrar Docente'}
          </button>
        </div>
      </form>
    </div>
  );
};
