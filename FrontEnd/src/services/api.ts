// frontend/src/services/api.ts
import type { Teacher, ScanLog } from '../types';

// Mientras programás en tu casa usás localhost. 
// Cuando lo pases a la escuela, ponés la IP fija de la Raspberry (ej: 'http://192.168.1.50:3000/api')
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const API_BASE_URL = `http://${hostname}:3000/api`;

export const apiService = {
  // ==========================================
  // 👥 SECCIÓN: PROFESORES (ABM del Admin)
  // ==========================================
  
  // GET: Traer todos los profesores de la base de datos SQLite
  async getTeachers(): Promise<Teacher[]> {
    const response = await fetch(`${API_BASE_URL}/teachers`);
    if (!response.ok) throw new Error('Error al obtener la lista de profesores');
    return response.json();
  },

  // POST: Guardar un profesor nuevo desde el formulario
  async createTeacher(teacherData: Omit<Teacher, 'id' | 'active' | 'status' | 'lastScanTime'>): Promise<Teacher> {
    const response = await fetch(`${API_BASE_URL}/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherData),
    });
    if (!response.ok) throw new Error('Error al registrar el docente en el servidor');
    return response.json();
  },

  // PUT: Actualizar los datos de un profesor y sus horarios
  async updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<Teacher> {
    const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacherData),
    });
    if (!response.ok) throw new Error('Error al actualizar el registro del docente');
    return response.json();
  },

  // DELETE: Eliminar un profesor de la base de datos
  async deleteTeacher(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar al docente del servidor');
  },

  // POST: Iniciar el proceso de enrolamiento físico en el sensor
  async startEnrollment(fingerprintId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/teachers/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprintId }),
    });
    if (!response.ok) throw new Error('Error al iniciar el enrolamiento en el sensor');
  },

  // POST: Cancelar el proceso de enrolamiento físico activo
  async cancelEnrollment(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/teachers/enroll/cancel`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Error al cancelar el enrolamiento');
  },

  // ==========================================
  // 📋 SECCIÓN: LOGS / HISTORIAL (Para la ART)
  // ==========================================
  
  // GET: Traer el historial completo de marcados para las tablas de AccessLog.tsx
  async getLogs(): Promise<ScanLog[]> {
    const response = await fetch(`${API_BASE_URL}/logs`);
    if (!response.ok) throw new Error('Error al obtener el historial de accesos');
    return response.json();
  },

  // POST: Enviar el Log con el Hash ya calculado en React para guardarlo en SQLite
  async createLog(logCompleto: Omit<ScanLog, 'id'>): Promise<ScanLog> {
    const response = await fetch(`${API_BASE_URL}/logs/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logCompleto),
    });
    if (!response.ok) throw new Error('Error al impactar la asistencia en la base de datos');
    return response.json();
  }
};
