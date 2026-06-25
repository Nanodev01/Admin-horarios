import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import teacherRoutes from './routes/teachers';
import logRoutes from './routes/logs';

const app = express();
const PORT = 3000;

// 1. Configuración de Middlewares
app.use(cors({ origin: '*' })); // Permite conexiones desde cualquier IP (PC de secretarios, KANO, etc.)
app.use(express.json());

// Logger de Peticiones HTTP
app.use((req, _res, next) => {
  console.log(`📡 [HTTP] ${req.method} ${req.url} - Body: ${JSON.stringify(req.body)}`);
  next();
});

// 2. Crear Servidor HTTP combinado para Express y WebSockets
const httpServer = createServer(app);

// 3. Inicializar Socket.io (El altavoz en tiempo real)
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // Permite que React se conecte al WebSocket libremente
    methods: ['GET', 'POST']
  }
});

// Canal de comunicación para verificar quién se conecta
io.on('connection', (socket) => {
  console.log(`🔌 Pantalla conectada al WebSocket (ID: ${socket.id})`);
  
  socket.on('disconnect', () => {
    console.log('❌ Pantalla desconectada del WebSocket');
  });
});

// 4. Inyectar el objeto 'io' en las rutas para que puedan usarlo
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// 5. Vincular las rutas ordenadas
app.use('/api/teachers', teacherRoutes);
app.use('/api/logs', logRoutes);

import { startLector, stopLector } from './utils/lectorManager.js';

// 6. Arrancar el servidor escuchando hacia afuera (0.0.0.0)
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Backend e IO corriendo en http://0.0.0.0:${PORT}`);
  // Levantar lector biométrico de huellas
  startLector();
});

// Limpieza de procesos hijos al cerrar el servidor
process.on('SIGINT', async () => {
  await stopLector();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await stopLector();
  process.exit(0);
});

// 📝 Truco TypeScript: Para que req.io no tire error de tipos, agregamos esta declaración abajo:
declare global {
  namespace Express {
    interface Request {
      io: Server;
    }
  }
}