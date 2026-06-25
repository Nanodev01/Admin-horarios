// backend/src/routes/teachers.ts
import { Router } from 'express';
import { prisma } from '../db.js';
import { spawn, ChildProcess } from 'child_process';
import { startLector, stopLector } from '../utils/lectorManager.js';

const router = Router();

let activeEnrollProcess: ChildProcess | null = null;

// Helper para formatear schedules de Array a Objeto para el Frontend
function formatTeacherResponse(teacher: any) {
  if (!teacher) return null;
  const schedulesMap: { [day: number]: { entryTime: string; exitTime: string } } = {};
  if (teacher.schedules) {
    teacher.schedules.forEach((s: any) => {
      schedulesMap[s.dayNumber] = {
        entryTime: s.entryTime,
        exitTime: s.exitTime
      };
    });
  }
  
  // Clonamos el objeto y reemplazamos schedules por el mapa
  const formatted = { ...teacher };
  formatted.schedules = schedulesMap;
  return formatted;
}

// GET: Obtener todos los profesores
router.get('/', async (_req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { schedules: true }
    });
    res.json(teachers.map(formatTeacherResponse));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los profesores' });
  }
});

// POST: Crear un nuevo profesor y sus horarios asociados (Optimizado en 1 consulta)
router.post('/', async (req, res) => {
  const { name, dni, subject, entryTime, exitTime, fingerprintId, schedules } = req.body;
  try {
    const schedulesList = schedules && typeof schedules === 'object'
      ? Object.entries(schedules).map(([dayStr, val]: [string, any]) => ({
          dayNumber: Number(dayStr),
          entryTime: val.entryTime,
          exitTime: val.exitTime
        }))
      : [];

    // Creamos el docente y sus horarios en una única transacción atómica de Prisma
    const fullyCreatedTeacher = await prisma.teacher.create({
      data: {
        name,
        dni,
        subject,
        entryTime,
        exitTime,
        fingerprintId: String(fingerprintId),
        status: 'absent',
        active: true,
        schedules: {
          create: schedulesList
        }
      },
      include: { schedules: true }
    });

    res.status(201).json(formatTeacherResponse(fullyCreatedTeacher));
  } catch (error) {
    console.error("Error al crear profesor:", error);
    res.status(400).json({ error: 'Error al crear el profesor. El ID de huella o DNI ya existen.' });
  }
});

// PUT: Actualizar un profesor existente y sus horarios (Optimizado en 1 consulta)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, dni, subject, entryTime, exitTime, fingerprintId, active, schedules } = req.body;
  try {
    const schedulesList = schedules && typeof schedules === 'object'
      ? Object.entries(schedules).map(([dayStr, val]: [string, any]) => ({
          dayNumber: Number(dayStr),
          entryTime: val.entryTime,
          exitTime: val.exitTime
        }))
      : [];

    // Actualizamos docente, limpiamos horarios viejos e insertamos los nuevos en una sola consulta
    const fullyUpdatedTeacher = await prisma.teacher.update({
      where: { id },
      data: {
        name,
        dni,
        subject,
        entryTime,
        exitTime,
        fingerprintId: String(fingerprintId),
        active,
        schedules: {
          deleteMany: {}, // Limpiar horarios anteriores
          create: schedulesList
        }
      },
      include: { schedules: true }
    });

    res.json(formatTeacherResponse(fullyUpdatedTeacher));
  } catch (error) {
    console.error("Error al actualizar profesor:", error);
    res.status(400).json({ error: 'Error al actualizar el registro del profesor.' });
  }
});

// DELETE: Eliminar un profesor de la base de datos y de la memoria física del sensor
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Buscar el docente para obtener su fingerprintId
    const teacher = await prisma.teacher.findUnique({
      where: { id }
    });

    if (teacher) {
      console.log(`🗑️ Iniciando borrado de huella física ID ${teacher.fingerprintId} para el docente ${teacher.name}`);
      
      // 2. Detener temporalmente lector.py
      await stopLector();

      let pyCommand = 'python3';
      if (process.platform === 'win32') pyCommand = 'python';

      // 3. Ejecutar script de borrado físico en el hardware
      await new Promise<void>((resolve) => {
        const child = spawn(pyCommand, ['hardware/borrar_huella.py', String(teacher.fingerprintId)]);
        
        child.stdout.on('data', (data) => {
          console.log(`[Borrar-Python]: ${data.toString().trim()}`);
        });

        child.stderr.on('data', (data) => {
          console.error(`[Borrar-Python-Error]: ${data.toString().trim()}`);
        });

        child.on('close', (code) => {
          console.log(`🗑️ Borrado físico finalizado con código: ${code}`);
          resolve();
        });
      });

      // 4. Reiniciar lector.py
      startLector();
    }

    // 5. Eliminar el registro de la base de datos SQLite (las claves foráneas eliminarán en cascada los horarios/logs)
    await prisma.teacher.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Docente eliminado correctamente de la base de datos y de la memoria del sensor.' });
  } catch (error) {
    console.error("Error al eliminar profesor:", error);
    res.status(500).json({ error: 'Error al eliminar al docente.' });
  }
});



// POST: Trigger fingerprint enrollment script
router.post('/enroll', async (req, res) => {
  const { fingerprintId } = req.body;
  if (!fingerprintId) {
    return res.status(400).json({ error: 'Falta el fingerprintId' });
  }

  // Cancelar proceso activo anterior si existe
  if (activeEnrollProcess) {
    activeEnrollProcess.kill();
    activeEnrollProcess = null;
  }

  // 1. Detener temporalmente lector.py para liberar el puerto UART
  await stopLector();

  let pyCommand = 'python3';
  if (process.platform === 'win32') {
    pyCommand = 'python';
  }

  console.log(`🎬 Iniciando script de enrolamiento para huella ID: ${fingerprintId}`);
  const child = spawn(pyCommand, ['hardware/enrolar_api.py', String(fingerprintId)]);
  activeEnrollProcess = child;

  const io = req.io;

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      console.log(`[Enrolamiento-Python]: ${line}`);

      if (line === 'APOYAR_DEDO_1') {
        io.emit('enroll-step', { step: 1, message: '👉 Apoye el dedo en el sensor...' });
      } else if (line === 'PROCESANDO_1') {
        io.emit('enroll-step', { step: 2, message: '📸 Procesando primer modelo...' });
      } else if (line === 'RETIRAR_DEDO') {
        io.emit('enroll-step', { step: 3, message: '👈 Retire el dedo del sensor...' });
      } else if (line === 'APOYAR_DEDO_2') {
        io.emit('enroll-step', { step: 4, message: '👉 Vuelva a apoyar el dedo para confirmar...' });
      } else if (line === 'PROCESANDO_2') {
        io.emit('enroll-step', { step: 5, message: '📸 Procesando confirmación...' });
      } else if (line === 'CREANDO_MODELO') {
        io.emit('enroll-step', { step: 6, message: '🧠 Creando plantilla de huella...' });
      } else if (line === 'EXITO') {
        io.emit('enroll-step', { step: 7, success: true, message: '✅ ¡Huella enrolada y guardada con éxito!' });
        activeEnrollProcess = null;
        // Reiniciar lector.py
        startLector();
      } else if (line.startsWith('ERROR:')) {
        io.emit('enroll-step', { step: 8, error: true, message: line.substring(6).trim() });
        activeEnrollProcess = null;
        // Reiniciar lector.py
        startLector();
      }
    }
  });

  child.stderr.on('data', (data) => {
    console.error('stderr:', data.toString());
  });

  child.on('close', (code) => {
    if (activeEnrollProcess === child) {
      if (code !== 0) {
        io.emit('enroll-step', { step: 8, error: true, message: 'El enrolamiento finalizó de forma inesperada.' });
      }
      activeEnrollProcess = null;
      // Reiniciar lector.py si se cerró
      startLector();
    }
  });

  return res.json({ success: true, message: 'Proceso de enrolamiento iniciado en el hardware.' });
});

// POST: Cancel fingerprint enrollment
router.post('/enroll/cancel', (req, res) => {
  if (activeEnrollProcess) {
    activeEnrollProcess.kill();
    activeEnrollProcess = null;
    req.io.emit('enroll-step', { step: 8, error: true, message: 'Enrolamiento cancelado por el usuario.' });
    // Reiniciar lector.py
    startLector();
    return res.json({ success: true, message: 'Enrolamiento cancelado.' });
  }
  return res.json({ success: true, message: 'No hay procesos activos.' });
});

export default router;