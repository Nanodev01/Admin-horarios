// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from "./generated/prisma/client"
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
    url: 'file:./dev.db'
})
const app = express();
const prisma = new PrismaClient({ adapter });
const PORT = 3000; // El puerto donde escuchará el servidor

// Middlewares
app.use(cors()); // Permite que tu React (que corre en el puerto 5173) le mande datos a este backend
app.use(express.json()); // Permite al servidor entender formatos JSON

// ==========================================
// RUTA 1: OBTENER TODOS LOS PROFESORES (Para las tablas de React)
// ==========================================
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { schedules: true } // Te los trae con sus horarios agendados
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los profesores' });
  }
});

// ==========================================
// RUTA 2: REGISTRAR UN PROFESOR NUEVO
// ==========================================
app.post('/api/teachers', async (req, res) => {
  const { name, dni, subject, entryTime, exitTime, fingerprintId } = req.body;

  try {
    const newTeacher = await prisma.teacher.create({
      data: {
        name,
        dni,
        subject,
        entryTime,
        exitTime,
        fingerprintId,
        status: 'absent',
        active: true
      }
    });
    res.status(201).json(newTeacher);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear el profesor. El DNI o FingerprintId ya existen' });
  }
});

// Arrancar el servidor
app.listen(PORT, () => {
  console.log(`[LOG] Servidor backend corriendo en http://localhost:${PORT}`);
});