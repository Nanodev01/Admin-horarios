import sys
import time
import serial
import adafruit_fingerprint

# Asegurar salida sin buffering para que Node.js reciba los prints al instante
sys.stdout.reconfigure(line_buffering=True)

if len(sys.argv) < 2:
    print("ERROR: Falta el ID de slot para enrolar")
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

def enrolar():
    # Paso 1: Poner el dedo la primera vez
    print("APOYAR_DEDO_1")
    # Timeout de 15 segundos para colocar el dedo
    inicio = time.time()
    while True:
        res = finger.get_image()
        if res == adafruit_fingerprint.OK:
            break
        if time.time() - inicio > 15:
            print("ERROR: Tiempo de espera agotado (dedo no detectado)")
            sys.exit(1)
        time.sleep(0.2)

    # Procesar primer modelo
    print("PROCESANDO_1")
    if finger.image_2_tz(1) != adafruit_fingerprint.OK:
        print("ERROR: No se pudo procesar la imagen de la huella")
        sys.exit(1)

    # Paso 2: Retirar el dedo y volver a colocar
    print("RETIRAR_DEDO")
    time.sleep(2)
    print("APOYAR_DEDO_2")
    
    # Timeout de 15 segundos para la segunda colocación
    inicio = time.time()
    while True:
        res = finger.get_image()
        if res == adafruit_fingerprint.OK:
            break
        if time.time() - inicio > 15:
            print("ERROR: Tiempo de espera agotado en la confirmación")
            sys.exit(1)
        time.sleep(0.2)

    # Procesar segundo modelo
    print("PROCESANDO_2")
    if finger.image_2_tz(2) != adafruit_fingerprint.OK:
        print("ERROR: No se pudo procesar la confirmación")
        sys.exit(1)

    # Crear modelo
    print("CREANDO_MODELO")
    if finger.create_model() != adafruit_fingerprint.OK:
        print("ERROR: Las huellas no coinciden. Intente de nuevo")
        sys.exit(1)

    # Guardar en slot
    print(f"GUARDANDO_{id_slot}")
    if finger.store_model(id_slot) == adafruit_fingerprint.OK:
        print("EXITO")
    else:
        print("ERROR: No se pudo guardar en el hardware")
        sys.exit(1)

if __name__ == "__main__":
    if finger.read_sysparam() == adafruit_fingerprint.OK:
        enrolar()
    else:
        print("ERROR: No se detecta el sensor AS608 físicamente")
        sys.exit(1)
