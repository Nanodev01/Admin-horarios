export interface Teacher {
  id: string;
  name: string;
  subject: string;
  entryTime: string; // HH:MM format
  exitTime: string;  // HH:MM format
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
}
