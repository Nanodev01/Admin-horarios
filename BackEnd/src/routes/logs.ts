// backend/src/routes/logs.ts
import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { getDayNumber } from '../utils/dateHelper.js';

const router = Router();

// Helper para calcular el estado de la fichada (normal, tarde, salida anticipada, fuera de horario)
function calculateStatus(teacher: any, type: 'in' | 'out', now: Date): 'normal' | 'late' | 'early_exit' | 'outside_schedule' {
  let entryTime = '';
  let exitTime = '';

  if (teacher.schedules && teacher.schedules.length > 0) {
    const dayNumber = getDayNumber(now);
    const schedule = teacher.schedules.find((s: any) => s.dayNumber === dayNumber);
    if (!schedule) {
      return 'outside_schedule';
    }
    entryTime = schedule.entryTime;
    exitTime = schedule.exitTime;
  } else {
    entryTime = teacher.entryTime || '08:00';
    exitTime = teacher.exitTime || '13:00';
  }

  const [entryH, entryM] = entryTime.split(':').map(Number);
  const [exitH, exitM] = exitTime.split(':').map(Number);
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  const entryMinutes = entryH * 60 + entryM;
  const exitMinutes = exitH * 60 + exitM;
  const currentMinutes = currentH * 60 + currentM;

  if (type === 'in') {
    // Tolerancia para llegada tarde: 15 minutos
    if (currentMinutes <= entryMinutes + 15) {
      return 'normal';
    } else if (currentMinutes > entryMinutes + 15 && currentMinutes < exitMinutes) {
      return 'late';
    } else {
      return 'outside_schedule';
    }
  } else { // type === 'out'
    // Tolerancia para salida anticipada: 10 minutos antes del horario de salida
    if (currentMinutes >= exitMinutes - 10) {
      return 'normal';
    } else if (currentMinutes >= entryMinutes && currentMinutes < exitMinutes - 10) {
      return 'early_exit';
    } else {
      return 'outside_schedule';
    }
  }
}

// GET: http://localhost:3000/api/logs (Para las tablas de la ART del Admin)
router.get('/', async (_req, res) => {
  try {
    const logs = await prisma.scanLog.findMany({ orderBy: { timestamp: 'desc' } });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial de logs' });
  }
});

// POST: http://localhost:3000/api/logs/scan
// 🚀 ESTA RUTA RECIBE LA FICHADA
router.post('/scan', async (req, res) => {
  try {
    const { fingerprintId } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({ error: 'Falta el fingerprintId' });
    }

    // 1. Buscamos al docente en SQLite por el ID de su huella
    const teacher = await prisma.teacher.findUnique({
      where: { fingerprintId: String(fingerprintId) },
      include: { schedules: true }
    });

    if (!teacher || !teacher.active) {
      // 📢 Avisamos por WebSocket a la pantalla terminal que la huella es inválida
      req.io.emit('fichada-error', { message: 'Huella no registrada o usuario inactivo' });
      return res.status(404).json({ error: 'Huella no válida' });
    }

    // Determinar tipo (Entrada/Salida) en base a su estado actual
    const type = teacher.status === 'present' ? 'out' : 'in';
    const now = new Date();
    const timestamp = now.toISOString();
    const status = calculateStatus(teacher, type, now);
    
    // Generar un hash de seguridad único e inalterable para el comprobante (SHA-256)
    const hashInput = `${timestamp}_${teacher.id}_${status}_${type}`;
    const securityHash = crypto.createHash('sha256').update(hashInput).digest('hex').toUpperCase();

    // 2. Guardamos la fichada en SQLite
    const newLog = await prisma.scanLog.create({
      data: {
        teacherId: teacher.id,
        teacherName: teacher.name,
        teacherSubject: teacher.subject,
        fingerprintId: teacher.fingerprintId,
        timestamp,
        type,
        status,
        securityHash
      }
    });

    // 3. Actualizamos el estado actual del profesor en la base de datos
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        status: type === 'in' ? 'present' : 'absent',
        lastScanTime: timestamp
      }
    });

    // 4. Emitimos WebSockets en tiempo real a la pantalla Terminal y el Dashboard
    req.io.emit('fichada-exitosa', newLog);
    req.io.emit('huella-detectada', {
      teacherId: teacher.id,
      name: teacher.name,
      subject: teacher.subject,
      fingerprintId: teacher.fingerprintId,
      currentStatus: updatedTeacher.status
    });

    return res.status(200).json(newLog);

  } catch (error) {
    console.error("Error en /scan:", error);
    return res.status(500).json({ error: 'Error interno al procesar el marcado' });
  }
});

export default router;