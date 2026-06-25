// backend/src/routes/teachers.ts
import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// GET: Obtener todos los profesores
router.get('/', async (_req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { schedules: true }
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los profesores' });
  }
});

// POST: Crear un nuevo profesor (Desde tu formulario de administración)
router.post('/', async (req, res) => {
  const { name, dni, subject, entryTime, exitTime, fingerprintId } = req.body;
  try {
    const newTeacher = await prisma.teacher.create({
      data: {
        name,
        dni,
        subject,
        entryTime,
        exitTime,
        fingerprintId: String(fingerprintId),
        status: 'absent',
        active: true
      }
    });
    res.status(201).json(newTeacher);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear el profesor. El ID de huella o DNI ya existen.' });
  }
});

export default router;