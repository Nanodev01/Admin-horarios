import type { ScanLog } from '../types';

export function printReceipt(log: ScanLog, dni: string) {
  const dateObj = new Date(log.timestamp);
  const formattedDate = dateObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' / ');
  const formattedTime = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const isEntry = log.type === 'in';
  const typeStr = isEntry ? 'INGRESO / ENTRADA' : 'EGRESO / SALIDA';

  let statusStr = 'VALIDADO / EXITOSO';
  if (log.status === 'late') statusStr = 'VALIDADO / INGRESO TARDÍO';
  else if (log.status === 'early_exit') statusStr = 'VALIDADO / SALIDA ANTICIPADA';
  else if (log.status === 'outside_schedule') statusStr = 'VALIDADO / FUERA DE HORARIO';

  const datePart = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  const cleanId = log.id.replace('l_', '').toUpperCase();
  const trxId = `TRX-${datePart}-${cleanId}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Registro Biométrico - ${log.teacherName}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            color: #000;
            background-color: #fff;
            margin: 0;
            padding: 30px;
            font-size: 12px;
            line-height: 1.5;
        }
        .container {
            border: 2px solid #000;
            padding: 20px;
            max-width: 700px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 18px;
            text-transform: uppercase;
            margin: 0 0 5px 0;
        }
        .header p {
            margin: 3px 0;
        }
        .section-title {
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            margin-top: 20px;
            padding-bottom: 3px;
        }
        table {
            width: 100%;
            margin-top: 10px;
            border-collapse: collapse;
        }
        td {
            padding: 6px 0;
            vertical-align: top;
        }
        .w-35 { width: 35%; font-weight: bold; }
        .w-65 { width: 65%; }
        .hash-box {
            font-family: monospace;
            font-size: 10px;
            background-color: #fff;
            border: 1px solid #000;
            padding: 10px;
            margin-top: 10px;
            word-break: break-all;
        }
        .footer {
            margin-top: 40px;
            font-size: 10px;
            text-align: justify;
            border-top: 1px dashed #000;
            padding-top: 10px;
        }
        .signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
        }
        .signature-line {
            width: 40%;
            border-top: 1px solid #000;
            text-align: center;
            padding-top: 5px;
            font-size: 11px;
        }
        .no-print-bar {
            background: #1e1b4b;
            color: #fff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin-bottom: 20px;
            border-radius: 8px;
            max-width: 700px;
            margin: 0 auto 20px auto;
        }
        .print-btn {
            background: #6366f1;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            transition: background 0.2s;
        }
        .print-btn:hover {
            background: #4f46e5;
        }
        @media print {
            .no-print-bar {
                display: none !important;
            }
            body {
                padding: 0;
            }
            .container {
                border: none;
                padding: 0;
            }
        }
    </style>
</head>
<body>

<div class="no-print-bar">
    <span style="font-size: 13px;">Comprobante de Asistencia generado correctamente</span>
    <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>

<div class="container">
    
    <div class="header">
        <h1>ESCUELA Sec. N°13  Gdor. Ricardo Lopez Jordan</h1>
        <p><strong>Comprobante de Registro Biométrico de Asistencia</strong></p>
        <p>Validez de Control de Presentismo / Constancia para Cobertura de A.R.T.</p>
    </div>

    <table>
        <tr>
            <td class="w-35">NÚMERO DE TRANSACCIÓN:</td>
            <td class="w-65">${trxId}</td>
        </tr>
        <tr>
            <td class="w-35">ESTADO DEL REGISTRO:</td>
            <td class="w-65"><strong>${statusStr}</strong></td>
        </tr>
    </table>

    <div class="section-title">Datos del Personal de la Institución</div>
    <table>
        <tr>
            <td class="w-35">APELLIDO Y NOMBRE:</td>
            <td class="w-65">${log.teacherName}</td>
        </tr>
        <tr>
            <td class="w-35">DOCUMENTO (DNI/ID):</td>
            <td class="w-65">${dni}</td>
        </tr>
        <tr>
            <td class="w-35">FUNCIÓN / CARGO:</td>
            <td class="w-65">${log.teacherSubject}</td>
        </tr>
    </table>

    <div class="section-title">Detalles del Marcado Cronológico (Timestamp)</div>
    <table>
        <tr>
            <td class="w-35">FECHA DE REGISTRO:</td>
            <td class="w-65">${formattedDate}</td>
        </tr>
        <tr>
            <td class="w-35">HORA DE INGRESO (SERVER):</td>
            <td class="w-65">${formattedTime}</td>
        </tr>
        <tr>
            <td class="w-35">TIPO DE MOVIMIENTO:</td>
            <td class="w-65">${typeStr}</td>
        </tr>
    </table>

    <div class="section-title">Evidencia Técnica e Inalterabilidad Digital</div>
    <table>
        <tr>
            <td class="w-35">MÉTODO DE VERIFICACIÓN:</td>
            <td class="w-65">Biométrico Hardware (Sensor Óptico AS608 UART)</td>
        </tr>
        <tr>
            <td class="w-35">ID BIOMÉTRICO ASIGNADO:</td>
            <td class="w-65">ID #${log.fingerprintId.padStart(3, '0')} (Asociado unívocamente a Legajo de Origen)</td>
        </tr>
        <tr>
            <td class="w-35">FIRMA DIGITAL (HASH MD5/SHA256):</td>
            <td class="w-65">
                <div class="hash-box">
                    ${log.securityHash}
                </div>
            </td>
        </tr>
    </table>

    <div class="footer">
        <strong>NOTA LEGAL DE AUDITORÍA:</strong> Este documento constituye una constancia digital de presencia emitida por el servidor central de la institución. La verificación biométrica por huella dactilar garantiza el principio de no repudio. El código Hash superior vincula de forma matemática e indisoluble la identidad del docente, la fecha, la hora exacta del servidor y el identificador físico del hardware. Cualquier alteración de estos datos anula la validez del presente comprobante ante auditorías de la Aseguradora de Riesgos del Trabajo (A.R.T.).
    </div>

    <div class="signatures">
        <div class="signature-line">
            Firma y Aclaración Responsable Institucional
        </div>
        <div class="signature-line">
            Firma del Agente / Docente (Opcional)
        </div>
    </div>

</div>

</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}
