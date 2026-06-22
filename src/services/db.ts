import type { Teacher, ScanLog } from '../types';

const TEACHERS_KEY = 'school_teachers';
const LOGS_KEY = 'school_scan_logs';

const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't1',
    name: 'María Alejandra González',
    subject: 'Matemáticas y Álgebra',
    entryTime: '07:30',
    exitTime: '12:30',
    fingerprintId: '1001',
    active: true,
    status: 'absent',
    lastScanTime: null
  },
  {
    id: 't2',
    name: 'Carlos Alberto Rodríguez',
    subject: 'Historia Argentina y Cívica',
    entryTime: '08:00',
    exitTime: '13:00',
    fingerprintId: '1002',
    active: true,
    status: 'present',
    lastScanTime: new Date(new Date().setHours(7, 50, 0)).toISOString() // scanned in at 7:50
  },
  {
    id: 't3',
    name: 'Laura Beatriz Martínez',
    subject: 'Lengua y Literatura',
    entryTime: '13:00',
    exitTime: '18:00',
    fingerprintId: '1003',
    active: true,
    status: 'absent',
    lastScanTime: null
  },
  {
    id: 't4',
    name: 'Jorge Daniel Fernandez',
    subject: 'Física y Química',
    entryTime: '07:30',
    exitTime: '12:00',
    fingerprintId: '1004',
    active: true,
    status: 'absent',
    lastScanTime: null
  },
  {
    id: 't5',
    name: 'Silvia Estela Lopez',
    subject: 'Geografía',
    entryTime: '14:00',
    exitTime: '18:30',
    fingerprintId: '1005',
    active: true,
    status: 'present',
    lastScanTime: new Date(new Date().setHours(13, 55, 0)).toISOString()
  }
];

const INITIAL_LOGS: ScanLog[] = [
  {
    id: 'l1',
    teacherId: 't2',
    teacherName: 'Carlos Alberto Rodríguez',
    teacherSubject: 'Historia Argentina y Cívica',
    fingerprintId: '1002',
    timestamp: new Date(new Date().setHours(7, 50, 0)).toISOString(),
    type: 'in',
    status: 'normal'
  },
  {
    id: 'l2',
    teacherId: 't5',
    teacherName: 'Silvia Estela Lopez',
    teacherSubject: 'Geografía',
    fingerprintId: '1005',
    timestamp: new Date(new Date().setHours(13, 55, 0)).toISOString(),
    type: 'in',
    status: 'normal'
  }
];

export const db = {
  getTeachers(): Teacher[] {
    const data = localStorage.getItem(TEACHERS_KEY);
    if (!data) {
      localStorage.setItem(TEACHERS_KEY, JSON.stringify(INITIAL_TEACHERS));
      return INITIAL_TEACHERS;
    }
    return JSON.parse(data);
  },

  saveTeachers(teachers: Teacher[]): void {
    localStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
  },

  getLogs(): ScanLog[] {
    const data = localStorage.getItem(LOGS_KEY);
    if (!data) {
      localStorage.setItem(LOGS_KEY, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(data);
  },

  saveLogs(logs: ScanLog[]): void {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  },

  addTeacher(teacher: Omit<Teacher, 'id' | 'status' | 'lastScanTime'>): Teacher {
    const teachers = this.getTeachers();
    const newTeacher: Teacher = {
      ...teacher,
      id: 't_' + Math.random().toString(36).substr(2, 9),
      status: 'absent',
      lastScanTime: null
    };
    teachers.push(newTeacher);
    this.saveTeachers(teachers);
    return newTeacher;
  },

  updateTeacher(id: string, updatedData: Partial<Omit<Teacher, 'id' | 'fingerprintId'>>): Teacher {
    const teachers = this.getTeachers();
    const index = teachers.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Profesor no encontrado');
    
    teachers[index] = { ...teachers[index], ...updatedData };
    this.saveTeachers(teachers);
    return teachers[index];
  },

  deleteTeacher(id: string): void {
    const teachers = this.getTeachers().filter(t => t.id !== id);
    this.saveTeachers(teachers);
  },

  // This is the core logic for the fingerprint scanner or verify interface.
  // It handles check-in/check-out and categorizes the scan.
  registerScan(fingerprintId: string, timestamp: Date = new Date()): { success: boolean; message: string; log?: ScanLog; teacher?: Teacher } {
    const teachers = this.getTeachers();
    const teacher = teachers.find(t => t.fingerprintId === fingerprintId && t.active);
    
    if (!teacher) {
      return {
        success: false,
        message: `ID de Huella ${fingerprintId} no registrado o inactivo.`
      };
    }

    const type: 'in' | 'out' = teacher.status === 'present' ? 'out' : 'in';
    const timeString = timestamp.toTimeString().substring(0, 5); // HH:MM
    
    let logStatus: ScanLog['status'] = 'normal';

    if (type === 'in') {
      // Calculate if they are late
      const [scheduledHour, scheduledMin] = teacher.entryTime.split(':').map(Number);
      const [actualHour, actualMin] = timeString.split(':').map(Number);
      
      const scheduledMinutes = scheduledHour * 60 + scheduledMin;
      const actualMinutes = actualHour * 60 + actualMin;
      
      // If checked in > 15 minutes after scheduled entry time
      if (actualMinutes > scheduledMinutes + 15) {
        logStatus = 'late';
      }
    } else {
      // Calculate if they scanned out early
      const [scheduledHour, scheduledMin] = teacher.exitTime.split(':').map(Number);
      const [actualHour, actualMin] = timeString.split(':').map(Number);
      
      const scheduledMinutes = scheduledHour * 60 + scheduledMin;
      const actualMinutes = actualHour * 60 + actualMin;
      
      // Scanned out > 10 minutes before scheduled exit time
      if (actualMinutes < scheduledMinutes - 10) {
        logStatus = 'early_exit';
      }
    }

    // Update teacher presence status
    teacher.status = type === 'in' ? 'present' : 'absent';
    teacher.lastScanTime = timestamp.toISOString();
    this.saveTeachers(teachers);

    // Create access log
    const newLog: ScanLog = {
      id: 'l_' + Math.random().toString(36).substr(2, 9),
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherSubject: teacher.subject,
      fingerprintId: teacher.fingerprintId,
      timestamp: timestamp.toISOString(),
      type,
      status: logStatus
    };

    const logs = this.getLogs();
    logs.unshift(newLog); // Put latest logs first
    this.saveLogs(logs);

    let alertMessage = '';
    if (type === 'in') {
      alertMessage = `Entrada registrada: ${teacher.name}.`;
      if (logStatus === 'late') {
        alertMessage += ` (Tarde: Hora programada: ${teacher.entryTime})`;
      }
    } else {
      alertMessage = `Salida registrada: ${teacher.name}.`;
      if (logStatus === 'early_exit') {
        alertMessage += ` (Salida Anticipada: Hora programada: ${teacher.exitTime})`;
      }
    }

    return {
      success: true,
      message: alertMessage,
      log: newLog,
      teacher
    };
  },

  resetDatabase(): void {
    localStorage.removeItem(TEACHERS_KEY);
    localStorage.removeItem(LOGS_KEY);
    this.getTeachers();
    this.getLogs();
  }
};
