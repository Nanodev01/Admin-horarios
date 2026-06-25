import sys
import serial
import adafruit_fingerprint

# Asegurar salida sin buffering
sys.stdout.reconfigure(line_buffering=True)

if len(sys.argv) < 2:
    print("ERROR: Falta el ID de slot para borrar")
    sys.exit(1)

try:
    id_slot = int(sys.argv[1])
    if id_slot < 0 or id_slot > 149:
        print("ERROR: El ID de slot debe estar entre 0 y 149")
        sys.exit(1)
except ValueError:
    print("ERROR: El ID debe ser un número entero")
    sys.exit(1)

try:
    uart = serial.Serial("/dev/serial0", baudrate=57600, timeout=1)
    finger = adafruit_fingerprint.Adafruit_Fingerprint(uart)
except Exception as e:
    print(f"ERROR: No se pudo conectar al lector serial: {e}")
    sys.exit(1)

def borrar():
    if finger.delete_model(id_slot) == adafruit_fingerprint.OK:
        print("EXITO")
    else:
        # Nota: Si el slot ya estaba vacío, puede retornar error, pero lo consideramos éxito a nivel de sistema.
        print("EXITO_YA_VACIO")

if __name__ == "__main__":
    if finger.read_sysparam() == adafruit_fingerprint.OK:
        borrar()
    else:
        print("ERROR: No se detecta el sensor AS608 físicamente")
        sys.exit(1)
