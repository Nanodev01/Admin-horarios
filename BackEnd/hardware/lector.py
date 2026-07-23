# backend/hardware/lector.py
import time
import os
import json
#import board
#import busio
import adafruit_fingerprint
import requests


# 1. CONFIGURACIÓN DEL PUERTO SERIE DEL SENSOR AS608
# Si conectás el lector por los pines GPIO de la Raspberry (TX/RX):
#uart = busio.UART(board.TX, board.RX, baudrate=57600)

# NOTA: Si usás un adaptador USB a Serial para conectar el AS608 por USB, 
# en Linux se suele usar la librería 'serial' común apuntando a '/dev/ttyUSB0':
import serial
uart = serial.Serial("/dev/serial0", baudrate=57600, timeout=1)

finger = adafruit_fingerprint.Adafruit_Fingerprint(uart)

# 1.5 CONFIGURACIÓN DE DETECCIÓN DACTILAR (Cables T-3.3 y T-OUT)
# T-3.3: Alimentación del detector de tacto. Se conecta al pin de 3.3V (Pin 17 de la Raspberry Pi).
# T-OUT: Salida del detector de tacto. Se conecta al pin GPIO 24 (Pin 18 de la Raspberry Pi).
#
# ¿Para qué sirven?
# Sirven para saber si hay un dedo apoyado en el lector a nivel de hardware (capacitivo),
# antes de iniciar la lectura óptica y transmisión serie. De esta forma, evitamos que la Raspberry Pi
# esté consultando (polling) constantemente por el puerto serie, reduciendo el uso de CPU a casi 0% en reposo.
GPIO_PIN_TOUCH = 24
TOUCH_STATE_ACTIVE = 0 # 1 = GPIO.HIGH (Active High), cambialo a 0 si tu módulo es Active-Low
has_gpio = False

try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(GPIO_PIN_TOUCH, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    has_gpio = True
    print("🔋 Detector dactilar capacitivo activo (GPIO 24 / Pin 18). Ahorro de CPU habilitado.")
except ImportError:
    print("⚠️ RPi.GPIO no está disponible. Usando método de sondeo continuo (polling) por UART.")
except Exception as e:
    print(f"⚠️ No se pudo inicializar el pin GPIO: {e}. Usando método de sondeo continuo (polling) por UART.")

# 2. CONFIGURACIÓN DE LA URL DEL BACKEND (NODE.JS)
# Como corre adentro de la misma Raspberry, le pega a 'localhost'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
config_path = os.path.join(BASE_DIR, 'config.json')

# 2. Leer el archivo JSON
with open(config_path, 'r') as f:
    config = json.load(f)

# 3. Guardar la URL en una variable
API_URL = f"{config['BHOST']}/api/logs/scan"

print("⏳ Inicializando sensor AS608...")

# Verificamos si la Raspberry se puede comunicar con el chip del lector
if finger.read_sysparam() == adafruit_fingerprint.OK:
    print("✅ ¡Sensor AS608 detectado con éxito!")
    print(f"Capacidad de memoria: {finger.library_size} huellas.")
else:
    print("❌ No se pudo encontrar el sensor AS608. Revisá las conexiones físicas.")
    exit(1)

print("\n🚀 El lector está activo. Esperando que un profesor apoye el dedo...\n")

# 3. BUCLE INFINITO DE VIGILANCIA
while True:
    # Si tenemos GPIO habilitado, verificamos primero si hay un dedo tocando el lector
    if has_gpio:
        is_touching = GPIO.input(GPIO_PIN_TOUCH) == TOUCH_STATE_ACTIVE
        if not is_touching:
            time.sleep(0.1)  # mini pausa para no consumir recursos
            continue

    # Intentamos capturar una imagen del dedo en el sensor
    resultado_imagen = finger.get_image()
    
    if resultado_imagen == adafruit_fingerprint.OK:
        print("☝️ ¡Dedo detectado! Procesando imagen...")
        
        # Convertimos la imagen de la huella en un mapa de características
        if finger.image_2_tz(1) == adafruit_fingerprint.OK:
            print("🔍 Buscando coincidencia en la memoria interna...")
            
            # Buscamos en la memoria flash si ese mapa coincide con algún ID guardado
            if finger.finger_fast_search() == adafruit_fingerprint.OK:
                # ¡ENCONTRADO! finger.finger_id nos da el número de slot (ej: 5)
                id_encontrado = finger.finger_id
                confianza = finger.confidence
                print(f"🎯 ¡Huella Encontrada! ID: #{id_encontrado} (Confianza: {confianza})")
                
                # 4. DISPARO HTTP HACIA EL BACKEND DE NODE.JS
                try:
                    payload = {"fingerprintId": str(id_encontrado)}
                    response = requests.post(API_URL, json=payload)
                    
                    if response.status_code == 200:
                        print("📡 ID enviado con éxito al servidor Express.")
                    else:
                        print(f"⚠️ El servidor Express respondió con error: {response.status_code}")
                except requests.exceptions.RequestException as e:
                    print(f"🚨 No se pudo conectar con el servidor Node.js: {e}")
                    
            else:
                print("❌ Huella no reconocida en el sensor.")
                try:
                    payload = {"fingerprintId": "unknown"}
                    response = requests.post(API_URL, json=payload)
                    if response.status_code == 404:
                        print("📡 Mensaje de huella no reconocida enviado al servidor Express.")
                except requests.exceptions.RequestException as e:
                    print(f"🚨 No se pudo enviar el error al servidor Node.js: {e}")
        
        # Pequeña pausa para evitar lecturas duplicadas del mismo dedo
        print("\n⏳ Soltá el sensor para la próxima lectura...")
        time.sleep(2)
        print("🚀 Esperando huella...\n")
        
    elif resultado_imagen == adafruit_fingerprint.NOFINGER:
        # Si no hay ningún dedo apoyado, el bucle gira rápido pero con un mini respiro (0.1s)
        # para no prender fuego el procesador de la Raspberry Pi
        time.sleep(0.1)
