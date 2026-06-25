import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let lectorProcess: ChildProcess | null = null;
let isPaused = false;

/**
 * Inicia el proceso background de lector.py
 */
export function startLector() {
  if (lectorProcess) {
    return;
  }

  isPaused = false;
  let pyCommand = 'python3';
  if (process.platform === 'win32') {
    pyCommand = 'python';
  }

  console.log("🔌 [LectorManager] Iniciando lector de huellas (lector.py)...");
  
  const scriptPath = path.resolve('hardware/lector.py');
  lectorProcess = spawn(pyCommand, [scriptPath]);

  lectorProcess.stdout?.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
      console.log(`[Lector-Python]: ${message}`);
    }
  });

  lectorProcess.stderr?.on('data', (data) => {
    const errorMsg = data.toString().trim();
    if (errorMsg) {
      console.error(`[Lector-Python-Error]: ${errorMsg}`);
    }
  });

  lectorProcess.on('close', (code) => {
    console.log(`🔌 [LectorManager] El proceso de lector.py se cerró con código: ${code}`);
    lectorProcess = null;
    
    // Si no fue pausado manualmente por enrolamiento, se reconecta automáticamente
    if (!isPaused) {
      console.log("🔌 [LectorManager] Reiniciando lector en 3 segundos...");
      setTimeout(startLector, 3000);
    }
  });
}

/**
 * Detiene temporalmente lector.py liberando el puerto serie (UART)
 */
export function stopLector(): Promise<void> {
  return new Promise((resolve) => {
    if (!lectorProcess) {
      resolve();
      return;
    }

    console.log("🔌 [LectorManager] Deteniendo lector.py para liberar el puerto UART...");
    isPaused = true;
    
    lectorProcess.on('close', () => {
      resolve();
    });

    lectorProcess.kill();
    lectorProcess = null;
  });
}
