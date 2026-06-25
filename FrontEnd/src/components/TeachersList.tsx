import React, { useState, useEffect } from 'react';
import type { Teacher } from '../types';
import { Plus, Edit, Trash2, X, Search, Clock, Fingerprint, Users } from 'lucide-react';
import { apiService } from '../services/api';
import { socket } from '../services/socket';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Lunes', shortName: 'Lun' },
  { id: 2, name: 'Martes', shortName: 'Mar' },
  { id: 3, name: 'Miércoles', shortName: 'Mié' },
  { id: 4, name: 'Jueves', shortName: 'Jue' },
  { id: 5, name: 'Viernes', shortName: 'Vie' },
  { id: 6, name: 'Sábado', shortName: 'Sáb' },
  { id: 7, name: 'Domingo', shortName: 'Dom' }
];

interface TeachersListProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Omit<Teacher, 'id' | 'status' | 'lastScanTime'>) => void;
  onUpdateTeacher: (id: string, updatedData: Partial<Teacher>) => void;
  onDeleteTeacher: (id: string) => void;
}

export const TeachersList: React.FC<TeachersListProps> = ({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [dni, setDni] = useState('');
  const [subject, setSubject] = useState('');
  const [schedulesState, setSchedulesState] = useState<{
    [day: number]: { active: boolean; entryTime: string; exitTime: string }
  }>({
    1: { active: true, entryTime: '08:00', exitTime: '13:00' },
    2: { active: true, entryTime: '08:00', exitTime: '13:00' },
    3: { active: true, entryTime: '08:00', exitTime: '13:00' },
    4: { active: true, entryTime: '08:00', exitTime: '13:00' },
    5: { active: true, entryTime: '08:00', exitTime: '13:00' },
    6: { active: false, entryTime: '08:00', exitTime: '13:00' },
    7: { active: false, entryTime: '08:00', exitTime: '13:00' }
  });
  const [selectedDayTab, setSelectedDayTab] = useState(1);
  const [fingerprintId, setFingerprintId] = useState('');
  const [formError, setFormError] = useState('');

  // Biometric enrollment state
  const [enrollStatus, setEnrollStatus] = useState<{ step: number; message: string; error?: boolean; success?: boolean } | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Listen to Socket.io events for the physical enrollment progress
  useEffect(() => {
    socket.on('enroll-step', (data: { step: number; message: string; error?: boolean; success?: boolean }) => {
      setEnrollStatus(data);
      if (data.error || data.success) {
        setIsEnrolling(false);
      }
    });

    return () => {
      socket.off('enroll-step');
    };
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
      console.error("Error al cancelar enrolamiento:", err);
    }
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setDni('');
    setSubject('');
    setSelectedDayTab(1);
    setSchedulesState({
      1: { active: true, entryTime: '08:00', exitTime: '13:00' },
      2: { active: true, entryTime: '08:00', exitTime: '13:00' },
      3: { active: true, entryTime: '08:00', exitTime: '13:00' },
      4: { active: true, entryTime: '08:00', exitTime: '13:00' },
      5: { active: true, entryTime: '08:00', exitTime: '13:00' },
      6: { active: false, entryTime: '08:00', exitTime: '13:00' },
      7: { active: false, entryTime: '08:00', exitTime: '13:00' }
    });
    // Auto-generate a logical next fingerprint ID (first unused slot between 1 and 149)
    const usedIds = new Set(teachers.map(t => parseInt(t.fingerprintId)).filter(num => !isNaN(num)));
    let nextId = 1;
    while (usedIds.has(nextId) && nextId <= 149) {
      nextId++;
    }
    setFingerprintId(String(nextId));
    setEnrollStatus(null);
    setIsEnrolling(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setDni(teacher.dni || '');
    setSubject(teacher.subject);
    setSelectedDayTab(1);
    
    const newState: typeof schedulesState = {};
    for (let i = 1; i <= 7; i++) {
      if (teacher.schedules && teacher.schedules[i]) {
        newState[i] = {
          active: true,
          entryTime: teacher.schedules[i].entryTime,
          exitTime: teacher.schedules[i].exitTime
        };
      } else if (!teacher.schedules && i <= 5) {
        newState[i] = {
          active: true,
          entryTime: teacher.entryTime || '08:00',
          exitTime: teacher.exitTime || '13:00'
        };
      } else {
        newState[i] = {
          active: false,
          entryTime: '08:00',
          exitTime: '13:00'
        };
      }
    }
    setSchedulesState(newState);
    setFingerprintId(teacher.fingerprintId);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    handleCancelEnroll();
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!name.trim()) return setFormError('El nombre es obligatorio.');
    if (!dni.trim()) return setFormError('El DNI es obligatorio.');
    if (!subject.trim()) return setFormError('La materia es obligatoria.');
    if (!fingerprintId.trim()) return setFormError('El ID de Huella es obligatorio.');

    // Check unique fingerprint ID
    const duplicate = teachers.find(t => 
      t.fingerprintId === fingerprintId && 
      (!editingTeacher || t.id !== editingTeacher.id)
    );
    if (duplicate) {
      return setFormError(`El ID de Huella ${fingerprintId} ya está asignado a ${duplicate.name}.`);
    }

    // Format schedules
    const schedules: { [day: number]: { entryTime: string; exitTime: string } } = {};
    let firstActiveEntry = '';
    let firstActiveExit = '';
    
    Object.keys(schedulesState).forEach((key) => {
      const dayId = Number(key);
      const sched = schedulesState[dayId];
      if (sched.active) {
        schedules[dayId] = {
          entryTime: sched.entryTime,
          exitTime: sched.exitTime
        };
        if (!firstActiveEntry) {
          firstActiveEntry = sched.entryTime;
          firstActiveExit = sched.exitTime;
        }
      }
    });

    if (Object.keys(schedules).length === 0) {
      return setFormError('Debe seleccionar al menos un día de trabajo con su respectivo horario.');
    }

    if (editingTeacher) {
      onUpdateTeacher(editingTeacher.id, {
        name,
        dni,
        subject,
        entryTime: firstActiveEntry,
        exitTime: firstActiveExit,
        schedules,
        fingerprintId
      });
    } else {
      onAddTeacher({
        name,
        dni,
        subject,
        entryTime: firstActiveEntry,
        exitTime: firstActiveExit,
        schedules,
        fingerprintId,
        active: true
      });
    }

    handleCloseModal();
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro que desea eliminar al docente ${name}?`)) {
      onDeleteTeacher(id);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.fingerprintId.includes(searchQuery)
  );

  return (
    <div className="teachers-list-container">
      {/* Search and Action Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, materia o huella..."
            className="form-control"
            style={{ paddingLeft: '38px', height: '42px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search 
            size={18} 
            className="text-muted" 
            style={{ position: 'absolute', left: '12px', top: '12px' }} 
          />
        </div>

        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} />
          <span>Registrar Nuevo Profesor</span>
        </button>
      </div>

      {/* Grid of Teachers */}
      {filteredTeachers.length === 0 ? (
        <div className="panel-card text-center" style={{ padding: '60px' }}>
          <Users size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No se encontraron profesores registrados.</p>
        </div>
      ) : (
        <div className="teacher-grid">
          {filteredTeachers.map((teacher) => {
            const initials = teacher.name
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div key={teacher.id} className="teacher-card">
                <div className="teacher-card-header">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '10px', 
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                      }}
                    >
                      {initials}
                    </div>
                    <div className="teacher-card-info">
                      <h4>{teacher.name}</h4>
                      <p>{teacher.subject}</p>
                    </div>
                  </div>
                  <span className={`badge ${teacher.status === 'present' ? 'present' : 'absent'}`} style={{ fontSize: '10px' }}>
                    {teacher.status === 'present' ? 'En Escuela' : 'Ausente'}
                  </span>
                </div>

                <div className="teacher-card-body">
                  <div className="info-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                    <span className="info-label flex items-center gap-2" style={{ marginBottom: '4px' }}>
                      <Clock size={12} />
                      Horarios semanales:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '14px', width: '100%' }}>
                      {(() => {
                        const DAYS = [
                          { id: 1, short: 'Lun' },
                          { id: 2, short: 'Mar' },
                          { id: 3, short: 'Mié' },
                          { id: 4, short: 'Jue' },
                          { id: 5, short: 'Vie' },
                          { id: 6, short: 'Sáb' },
                          { id: 7, short: 'Dom' }
                        ];
                        const activeDays = DAYS.filter(d => teacher.schedules?.[d.id]);
                        
                        if (activeDays.length === 0) {
                          return (
                            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span style={{ fontWeight: 600 }}>Lun - Vie:</span>
                              <span>{teacher.entryTime} - {teacher.exitTime}</span>
                            </div>
                          );
                        }

                        const groups: { [timeStr: string]: string[] } = {};
                        activeDays.forEach(d => {
                          const sched = teacher.schedules?.[d.id];
                          if (sched) {
                            const timeStr = `${sched.entryTime} - ${sched.exitTime}`;
                            if (!groups[timeStr]) groups[timeStr] = [];
                            groups[timeStr].push(d.short);
                          }
                        });

                        return Object.entries(groups).map(([timeStr, days]) => (
                          <div 
                            key={timeStr} 
                            style={{ 
                              fontSize: '12px', 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              color: 'var(--text-secondary)',
                              borderBottom: '1px dashed rgba(255, 255, 255, 0.05)',
                              paddingBottom: '4px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                              {days.join(', ')}:
                            </span>
                            <span style={{ fontWeight: 500 }}>{timeStr}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="info-row">
                    <span className="info-label flex items-center gap-2">
                      <Fingerprint size={12} />
                      ID Lector Huellas:
                    </span>
                    <span className="info-value" style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                      {teacher.fingerprintId}
                    </span>
                  </div>
                </div>

                <div className="teacher-card-actions">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flexGrow: 1 }}
                    onClick={() => openEditModal(teacher)}
                  >
                    <Edit size={14} />
                    <span>Editar</span>
                  </button>
                  <button 
                    className="btn btn-danger btn-sm btn-icon-only"
                    onClick={() => handleDelete(teacher.id, teacher.name)}
                    title="Eliminar docente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTeacher ? 'Modificar Registro Docente' : 'Registrar Nuevo Docente'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div 
                    style={{ 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      color: '#f87171',
                      fontSize: '13px',
                      marginBottom: '16px'
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="teacherName">Nombre Completo del Profesor</label>
                  <input
                    type="text"
                    id="teacherName"
                    className="form-control"
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="teacherDni">DNI / Documento del Profesor</label>
                  <input
                    type="text"
                    id="teacherDni"
                    className="form-control"
                    placeholder="Ej. 34.802.780"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="teacherSubject">Materia / Cargo Administrativo</label>
                  <input
                    type="text"
                    id="teacherSubject"
                    className="form-control"
                    placeholder="Ej. Matemática de 4to año"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div style={{ margin: '20px 0', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Configuración de Horarios por Día
                  </h4>

                  <div className="form-group">
                    <label htmlFor="daySelector" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Seleccionar día de la semana</label>
                    <select
                      id="daySelector"
                      className="form-control"
                      value={selectedDayTab}
                      onChange={(e) => setSelectedDayTab(Number(e.target.value))}
                    >
                      {DAYS_OF_WEEK.map((day) => {
                        const hasSched = schedulesState[day.id]?.active;
                        return (
                          <option key={day.id} value={day.id}>
                            {day.name} {hasSched ? ' (Activo)' : ' (No asiste)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {(() => {
                    const day = DAYS_OF_WEEK.find(d => d.id === selectedDayTab)!;
                    const sched = schedulesState[selectedDayTab] || { active: false, entryTime: '08:00', exitTime: '13:00' };
                    return (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          backgroundColor: sched.active ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                          border: sched.active ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid var(--border-color)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          marginTop: '8px'
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, cursor: 'pointer', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={sched.active}
                            onChange={(e) => {
                              setSchedulesState(prev => ({
                                ...prev,
                                [selectedDayTab]: { ...prev[selectedDayTab], active: e.target.checked }
                              }));
                            }}
                            style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            El docente asiste los días {day.name}
                          </span>
                        </label>

                        {sched.active ? (
                          <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Entrada</label>
                              <input
                                type="time"
                                className="form-control"
                                style={{ height: '32px', padding: '4px 8px', fontSize: '12px' }}
                                value={sched.entryTime}
                                onChange={(e) => {
                                  setSchedulesState(prev => ({
                                    ...prev,
                                    [selectedDayTab]: { ...prev[selectedDayTab], entryTime: e.target.value }
                                  }));
                                }}
                                required={sched.active}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Salida</label>
                              <input
                                type="time"
                                className="form-control"
                                style={{ height: '32px', padding: '4px 8px', fontSize: '12px' }}
                                value={sched.exitTime}
                                onChange={(e) => {
                                  setSchedulesState(prev => ({
                                    ...prev,
                                    [selectedDayTab]: { ...prev[selectedDayTab], exitTime: e.target.value }
                                  }));
                                }}
                                required={sched.active}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            El docente no asiste a la institución los días {day.name}.
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="form-group">
                  <label htmlFor="fingerprintId">ID Biométrico (Memoria del Lector)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      id="fingerprintId"
                      className="form-control"
                      placeholder="Ej. 5"
                      min="1"
                      max="149"
                      value={fingerprintId}
                      onChange={(e) => setFingerprintId(e.target.value)}
                      disabled={!!editingTeacher || isEnrolling}
                      required
                      style={{ flexGrow: 1 }}
                    />
                    {!editingTeacher && (
                      <button
                        type="button"
                        className={`btn ${isEnrolling ? 'btn-danger' : 'btn-primary'}`}
                        onClick={isEnrolling ? handleCancelEnroll : handleStartEnroll}
                        disabled={!fingerprintId || parseInt(fingerprintId) < 1 || parseInt(fingerprintId) > 149}
                        style={{ whiteSpace: 'nowrap', height: '42px', padding: '0 16px' }}
                      >
                        {isEnrolling ? 'Cancelar' : 'Iniciar Enrolamiento'}
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    * Código numérico asignado a la memoria interna del lector (rango de 1 a 149).
                  </p>

                  {/* Panel de estado de enrolamiento interactivo */}
                  {enrollStatus && (
                    <div
                      className="enroll-status-panel"
                      style={{
                        marginTop: '16px',
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: enrollStatus.error 
                          ? 'rgba(239, 68, 68, 0.08)' 
                          : enrollStatus.success 
                            ? 'rgba(34, 197, 94, 0.08)' 
                            : 'rgba(99, 102, 241, 0.08)',
                        border: `1px solid ${
                          enrollStatus.error 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : enrollStatus.success 
                              ? 'rgba(34, 197, 94, 0.2)' 
                              : 'rgba(99, 102, 241, 0.2)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Fingerprint 
                          size={20} 
                          className={isEnrolling ? 'pulsing-kiosk-fingerprint' : ''} 
                          style={{
                            color: enrollStatus.error 
                              ? '#f87171' 
                              : enrollStatus.success 
                                ? '#4ade80' 
                                : '#818cf8'
                          }}
                        />
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {enrollStatus.success 
                            ? 'Enrolamiento Exitoso' 
                            : enrollStatus.error 
                              ? 'Fallo en Enrolamiento' 
                              : `Paso ${enrollStatus.step} de 7`}
                        </strong>
                      </div>
                      
                      <p style={{ 
                        margin: 0, 
                        fontSize: '12px', 
                        lineHeight: '1.4',
                        color: enrollStatus.error 
                          ? '#f87171' 
                          : enrollStatus.success 
                            ? '#4ade80' 
                            : 'var(--text-secondary)'
                      }}>
                        {enrollStatus.message}
                      </p>

                      {isEnrolling && (
                        <div style={{ 
                          marginTop: '12px', 
                          height: '4px', 
                          backgroundColor: 'rgba(255,255,255,0.05)', 
                          borderRadius: '2px', 
                          overflow: 'hidden' 
                        }}>
                          <div style={{ 
                            height: '100%', 
                            backgroundColor: 'var(--color-primary)', 
                            width: `${(enrollStatus.step / 7) * 100}%`,
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTeacher ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
