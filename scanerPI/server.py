import subprocess
import os
import socket
import fcntl
import struct
import json
import time
import datetime
import picamera
import picamera.array
import atexit

configFile = '/home/pi/camera.json';

HOST = '192.168.1.99'
# HOST = '192.168.10.2'

PORT = 81

CODE_PING_PONG = 100

CODE_ADD_SCANNER = 1000

CODE_TAKE_THUMB = 1001
CODE_TAKE_PREVIEW = 1002
CODE_TAKE_PHOTO = 1003

CODE_SET_PHOTO_SETTINGS = 1004

CODE_UPLOAD_THUMB = 1005
CODE_UPLOAD_PREVIEW = 1006
CODE_UPLOAD_PHOTO1 = 1007
CODE_UPLOAD_PHOTO2 = 1008

CODE_SET_SCANNER_NUMBER = 1009
CODE_EXECUTE_SHELL = 1010
CODE_UPDATE_BUSY_STATE = 1011

CODE_LOG_DATA = 1020

MAX_RES = (3280, 2464)


def _json_object_hook(d): return namedtuple('X', d.keys())(*d.values())


def json2obj(data): return json.loads(data, object_hook=_json_object_hook)


def get_ip_address(ifname):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        return socket.inet_ntoa(
            fcntl.ioctl(s.fileno(), 0x8915, struct.pack('256s', bytes(ifname[:15], 'utf-8')))[20:24])
    except IOError as e:
        return ''


while True:
    current_ip = get_ip_address('eth0')
    if len(current_ip) > 2:
        break

    current_ip = get_ip_address('wlan0')
    if len(current_ip) > 2:
        break
    time.sleep(2)

print("Current IP: ", current_ip)


class SocketHandler:
    frames = 3

    payload = ''
    lastOpCode = 0
    lastLength = 0
    timer = 0

    config = {'numb': ""}

    def __init__(self):
        self.getScannerNumber()

    def initSocket(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def filenames(self):
        frame = 0
        while frame < self.frames:
            yield './image%02d.jpg' % frame
            frame += 1

    def connect(self, host, port):
        try:
            # host = socket.gethostbyname(host)
            print("Host: ", host)
            self.sock.connect((host, port))
            return True
        except ConnectionRefusedError as e:
            print("ConnectionRefused error({0}): {1}".format(e.errno, e.strerror))
            return False

    def addScanner(self):
        scanner = {'ip': current_ip, 'numb': self.config['numb'], 'files': []}
        self.sendJSON(CODE_ADD_SCANNER, scanner)

    def updateBusyState(self, state):
        print("Update state: " + str(state))
        scanner = {'isBusy': state}
        self.sendJSON(CODE_UPDATE_BUSY_STATE, scanner)

    def setHeader(self, opCode, length):
        print("OpCode: ", opCode)
        print("Length: ", length)
        c = struct.pack(">I", opCode)
        l = struct.pack(">I", length)
        self.sock.send(c + l)

    def logData(self, data, is_json=True):
        if is_json:
            data = json.dumps(data).encode('utf-8')
        else:
            data = data.encode('utf-8')

        dataLength = len(data)
        self.setHeader(CODE_LOG_DATA, dataLength)
        self.sock.send(data)


    def sendJSON(self, opCode, obj):
        j = json.dumps(obj).encode('utf-8')
        self.sendRaw(opCode, j, len(j))

    def sendRaw(self, opCode, msg, length):
        self.setHeader(opCode, length)
        totalsent = 0

        while totalsent < length:
            sent = self.sock.send(msg[totalsent:])
            if sent == 0:
                raise RuntimeError("socket connection broken")
            totalsent = totalsent + sent

    def sendFile(self, opCode, filename):
        length = os.path.getsize(filename)
        self.setHeader(opCode, length)

        f = open(filename, 'rb')
        print('Sending file...')
        l = f.read(1024 * 4)
        while (l):
            ##print ('Sending...')
            self.sock.send(l)
            l = f.read(1024 * 4)
        f.close()
        print('File sent')

    def receive(self):
        if self.lastOpCode == 0:
            self.payload = ''
            self.lastOpCode = self.sock.recv(4)
            self.lastOpCode = struct.unpack(">I", self.lastOpCode)[0]
            self.timer = self.sock.recv(4)
            self.timer = struct.unpack(">I", self.timer)[0]
            self.lastLength = self.sock.recv(4)
            self.lastLength = struct.unpack(">I", self.lastLength)[0]
            print("Receive operation: " + str(self.lastOpCode) + " with length: " + str(self.lastLength))
            return

        while len(self.payload) < self.lastLength:
            chunk = self.sock.recv(self.lastLength - len(self.payload))
            self.payload = self.payload + chunk.decode('utf-8')

        if self.lastOpCode == CODE_TAKE_THUMB:
            self.takeThumb()

        if self.lastOpCode == CODE_TAKE_PREVIEW:
            self.takePreview()

        if self.lastOpCode == CODE_TAKE_PHOTO:
            self.takePhoto(self.timer)

        if self.lastOpCode == CODE_PING_PONG:
            print("Ping")

        if self.lastOpCode == CODE_ADD_SCANNER:
            print(self.payload)

        if self.lastOpCode == CODE_SET_PHOTO_SETTINGS:
            self.setPhotoSettings(self.payload)

        if self.lastOpCode == CODE_SET_SCANNER_NUMBER:
            self.config['numb'] = self.payload
            self.setScannerNumber()

        if self.lastOpCode == CODE_EXECUTE_SHELL:
            self.executeShell(self.payload)

        self.timer = 0
        self.lastOpCode = 0
        self.lastLength = 0
        self.payload = ''

    def executeShell(self, data):
        cmd = json.loads(data)
        self.updateBusyState(True)
        process = ''
        try:
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)
            for line in process.stdout:
                self.logData(line.decode('utf-8'), False)
                print(line.decode('utf-8'))
        except Exception as e:
            print("Error execute shell({0})")

        if process != '':
            process.kill()

        self.updateBusyState(False)

    def getScannerNumber(self):
        try:
            file = open(configFile, "r")
            jdata = json.loads(file.read())
            self.config['numb'] = jdata['numb']
            file.close()
        except:
            print("File doesn't exist")

    def setScannerNumber(self):
        file = open(configFile, "w")
        file.write(json.dumps(self.config))
        file.close()

    def setPhotoSettings(self, data):
        self.settings = json.loads(data)

    def applySettings(self):
        settings = self.settings
        try:
            self.camera.awb_mode = settings.get('awb');

            if settings.get('awbgains') and settings.get('awb') == 'off':
                g = settings.get('awbgains').split(',')
                self.camera.awb_gains = (float(g[0]), float(g[1]))

                print(g[0] + " - " + g[1])
            else:
                self.camera.awb_gains = (1.0, 1.0)

            self.camera.exposure_mode = settings.get('exposure')
            self.camera.framerate = int(settings.get('framerate') or 15)
            self.camera.sharpness = int(settings.get('sharpness') or 0)
            self.camera.contrast = int(settings.get('contrast') or 0)
            self.camera.brightness = int(settings.get('brightness') or 50)
            self.camera.saturation = int(settings.get('saturation') or 0)
            self.camera.shutter_speed = int(settings.get('shutter') or 0)
            self.camera.iso = int(settings.get('ISO') or 100)
            self.camera.meter_mode = settings.get('metering')


        except ValueError as e:
            print("Value error({0}): {1}".format(e.errno, e.strerror))

    def takeThumb(self):
        print("Take thumb")
        thumbFileName = './thumb.jpg'
        self.camera = picamera.PiCamera()
        self.applySettings()
        self.camera.resolution = (160, 90)
        self.updateBusyState(True)
        self.camera.capture_sequence([thumbFileName], 'jpeg', use_video_port=True)
        time.sleep(0.2)
        self.sendFile(CODE_UPLOAD_THUMB, thumbFileName)
        self.updateBusyState(False)
        self.camera.close()

    def takePreview(self):
        print("Take preview")
        previewFileName = './preview.jpg'
        self.camera = picamera.PiCamera()
        self.applySettings()
        self.camera.resolution = MAX_RES
        self.updateBusyState(True)
        self.camera.capture_sequence([previewFileName], 'jpeg', use_video_port=True)
        time.sleep(0.2)
        self.sendFile(CODE_UPLOAD_PREVIEW, previewFileName)
        self.updateBusyState(False)
        self.camera.close()

    def takePhoto(self, timer):
        timer = time.time() + 2.0
        print("Take photo")
        self.camera = picamera.PiCamera()
        self.applySettings()
        self.camera.resolution = MAX_RES
        self.updateBusyState(True)

        print("Timer %d" % timer)
        if timer != 0:
            time_shift = float(timer) - time.time()
            time.sleep(max(time_shift, 0.0))

        self.camera.capture_sequence(self.filenames(), 'jpeg', use_video_port=True)
        time.sleep(1)

        self.sendFile(CODE_UPLOAD_PHOTO1, './image00.jpg')
        self.sendFile(CODE_UPLOAD_PHOTO2, './image02.jpg')

        self.updateBusyState(False)
        self.camera.close()


#### SocketHandler instance

s = SocketHandler()


def exit_handler():
    print('Close')


atexit.register(exit_handler)

while True:

    try:
        s.initSocket()
        if s.connect(HOST, PORT):
            s.addScanner()
            while True:
                s.receive()

    except TimeoutError as e:
        print('Timeout Error: '.format(e.errno, e.strerror))

    except ConnectionResetError as e:
        print('Connection Reset Error: '.format(e.errno, e.strerror))

    except IOError as e:
        print('IOError: '.format(e.errno, e.strerror))

    except RuntimeError as e:
        print('Runtime error')



    time.sleep(3)
