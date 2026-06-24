export interface DaySchedule {
  entryTime: string; // HH:MM format
  exitTime: string;  // HH:MM format
}

export interface Teacher {
  id: string;
  name: string;
  dni?: string; // Teacher DNI/ID
  subject: string;
  entryTime: string; // fallback/default entry time
  exitTime: string;  // fallback/default exit time
  schedules?: { [day: number]: DaySchedule }; // 1 for Monday, 2 for Tuesday, etc.
  fingerprintId: string; // Biometric reference ID
  active: boolean;
  status: 'present' | 'absent';
  lastScanTime: string | null;
}

export interface ScanLog {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherSubject: string;
  fingerprintId: string;
  timestamp: string; // Date ISO string
  type: 'in' | 'out';
  status: 'normal' | 'late' | 'early_exit' | 'outside_schedule';
  securityHash: string;
}

