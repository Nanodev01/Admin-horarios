// backend/src/routes/logs.ts
import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

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
// 🚀 ESTA RUTA RECIBE LA FICHADA (Ya sea desde Python o desde React)
router.post('/scan', async (req, res) => {
  try {
    // Caso A: Si viene de Python, solo vendrá el fingerprintId. 
    // Caso B: Si viene de React, vendrá el objeto cocinado con su hash.
    const { fingerprintId, teacherId, teacherName, teacherSubject, timestamp, type, status, securityHash } = req.body;

    // --- FLUJO CUANDO DETECTA EL DISPARO DEL SENSOR (PYTHON) ---
    if (!securityHash) {
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

      // 2. Devolvemos los datos del profesor a quien corresponda procesar el hash
      // 📢 ¡Acá disparamos el WebSocket! Le mandamos los datos frescos a tu React
      req.io.emit('huella-detectada', {
        teacherId: teacher.id,
        name: teacher.name,
        subject: teacher.subject,
        fingerprintId: teacher.fingerprintId,
        currentStatus: teacher.status // 'present' o 'absent'
      });

      return res.json({ success: true, message: 'ID detectado y enviado por WebSocket a React.' });
    }

    // --- FLUJO CUANDO TU COMPONENTE DE REACT MANDA EL LOG CON EL HASH YA HECHO ---
    const newLog = await prisma.scanLog.create({
      data: {
        teacherId,
        teacherName,
        teacherSubject,
        fingerprintId,
        timestamp,
        type,
        status,
        securityHash
      }
    });

    // Actualizamos el estado actual del profesor en la base de datos
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        status: type === 'in' ? 'present' : 'absent',
        lastScanTime: timestamp
      }
    });

    // 📢 Le avisamos a la pantalla Terminal que el guardado fue exitoso para que cierre la animación
    req.io.emit('fichada-exitosa', { name: teacherName, status: status, type: type });

    return res.status(201).json(newLog);

  } catch (error) {
    console.error("Error en /scan:", error);
    return res.status(500).json({ error: 'Error interno al procesar el marcado' });
  }
});

export default router;