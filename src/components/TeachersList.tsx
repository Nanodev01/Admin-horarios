import React, { useState } from 'react';
import type { Teacher } from '../types';
import { Plus, Edit, Trash2, X, Search, Clock, Fingerprint, Users } from 'lucide-react';

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
  const [subject, setSubject] = useState('');
  const [entryTime, setEntryTime] = useState('08:00');
  const [exitTime, setExitTime] = useState('13:00');
  const [fingerprintId, setFingerprintId] = useState('');
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setSubject('');
    setEntryTime('08:00');
    setExitTime('13:00');
    // Auto-generate a logical next fingerprint ID (e.g. max + 1)
    const maxId = teachers.reduce((max, t) => {
      const num = parseInt(t.fingerprintId);
      return isNaN(num) ? max : Math.max(max, num);
    }, 1000);
    setFingerprintId(String(maxId + 1));
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setSubject(teacher.subject);
    setEntryTime(teacher.entryTime);
    setExitTime(teacher.exitTime);
    setFingerprintId(teacher.fingerprintId);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeacher(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!name.trim()) return setFormError('El nombre es obligatorio.');
    if (!subject.trim()) return setFormError('La materia es obligatoria.');
    if (!entryTime) return setFormError('El horario de entrada es obligatorio.');
    if (!exitTime) return setFormError('El horario de salida es obligatorio.');
    if (!fingerprintId.trim()) return setFormError('El ID de Huella es obligatorio.');

    // Check unique fingerprint ID
    const duplicate = teachers.find(t => 
      t.fingerprintId === fingerprintId && 
      (!editingTeacher || t.id !== editingTeacher.id)
    );
    if (duplicate) {
      return setFormError(`El ID de Huella ${fingerprintId} ya está asignado a ${duplicate.name}.`);
    }

    if (editingTeacher) {
      onUpdateTeacher(editingTeacher.id, {
        name,
        subject,
        entryTime,
        exitTime,
        fingerprintId
      });
    } else {
      onAddTeacher({
        name,
        subject,
        entryTime,
        exitTime,
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
                  <div className="info-row">
                    <span className="info-label flex items-center gap-2">
                      <Clock size={12} />
                      Horario registrado:
                    </span>
                    <span className="info-value">{teacher.entryTime} - {teacher.exitTime}</span>
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

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="entryTime">Hora de Entrada</label>
                    <input
                      type="time"
                      id="entryTime"
                      className="form-control"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="exitTime">Hora de Salida</label>
                    <input
                      type="time"
                      id="exitTime"
                      className="form-control"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="fingerprintId">ID Biométrico (Asociado al Lector de Huellas)</label>
                  <input
                    type="text"
                    id="fingerprintId"
                    className="form-control"
                    placeholder="Ej. 1006"
                    value={fingerprintId}
                    onChange={(e) => setFingerprintId(e.target.value)}
                    disabled={!!editingTeacher} // Keep same hardware link on edit to avoid configuration mismatch
                    required
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    * Código numérico único para mapear el sensor de huella dactilar al sistema.
                  </p>
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
