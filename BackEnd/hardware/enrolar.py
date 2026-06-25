import time
import adafruit_fingerprint
import serial

# Usamos la misma conexión serie que te funcionó antes
uart = serial.Serial("/dev/serial0", baudrate=57600, timeout=1) # O /dev/ttyUSB0 si usas USB
finger = adafruit_fingerprint.Adafruit_Fingerprint(uart)

def registrar_huella():
    id_slot = int(input("Ingresá un número de ID para tu huella (0 a 149): "))
    
    print("👉 Apoyá el dedo en el sensor...")
    while finger.get_image() != adafruit_fingerprint.OK:
        pass
    
    print("📸 Procesando primer modelo...")
    if finger.image_2_tz(1) != adafruit_fingerprint.OK:
        print("❌ Error al procesar. Intentá de nuevo.")
        return

    print("👉 Sacá el dedo y volvé a apoyarlo para confirmar...")
    time.sleep(2)
    while finger.get_image() != adafruit_fingerprint.OK:
        pass
    
    print("📸 Procesando segundo modelo...")
    if finger.image_2_tz(2) != adafruit_fingerprint.OK:
        print("❌ Error al procesar la confirmación.")
        return
    
    print("🧠 Creando plantilla matemática...")
    if finger.create_model() != adafruit_fingerprint.OK:
        print("❌ Las huellas no coinciden.")
        return
        
    print(# Guardamos en el chip
    f"💾 Guardando en el slot #{id_slot}...")
    if finger.store_model(id_slot) == adafruit_fingerprint.OK:
        print("✅ ¡Huella guardada con éxito en el hardware!")
    else:
        print("❌ No se pudo guardar en el chip.")

registrar_huella()
