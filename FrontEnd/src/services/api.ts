// frontend/src/services/api.ts
import type { Teacher, ScanLog } from '../types';

// Mientras programás en tu casa usás localhost. 
// Cuando lo pases a la escuela, ponés la IP fija de la Raspberry (ej: 'http://192.168.1.50:3000/api')
const API_BASE_URL = 'http://192.168.1.103:3000/api';

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
