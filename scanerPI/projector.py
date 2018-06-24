import socket
import fcntl
import struct
import json
import time
import pygame
import atexit
import RPi.GPIO as GPIO
import subprocess


SHOW = GPIO.HIGH
HIDE = GPIO.LOW



GPIO_PORT=11

CODE_EXECUTE_SHELL = 1010
CODE_LOG_DATA = 1020

GPIO.setmode(GPIO.BOARD)
GPIO.setwarnings(False)

GPIO.setup(GPIO_PORT, GPIO.OUT, initial=SHOW)


HOST = '192.168.1.99'
PORT = 81

CODE_ADD_PROJECTOR = 999



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


time.sleep(3)


# picture display size
width = 1280
height = 800
# number of pictures
pictures = 2

# picture names
pic_names = ['grid.png', 'pic4.png']

# USB stick name
usb_name = "/home/pi/"


class SocketHandler:




    def __init__(self):
        print('Init')
        self.windowSurfaceObj = pygame.display.set_mode((width, height), pygame.FULLSCREEN)
        pygame.display.set_caption('')

        image0 = pygame.image.load(usb_name + pic_names[0])
        self.image0 = pygame.transform.scale(image0, (width, height))

        image1 = pygame.image.load(usb_name + pic_names[1])
        self.image1 = pygame.transform.scale(image1, (width, height))
        self.enableProjector(False)

    def enableProjector(self, enable):
        if enable == True:
            self.windowSurfaceObj.blit(self.image0, (0, 0))
            pygame.display.update()
        else:
            self.windowSurfaceObj.blit(self.image1, (0, 0))
            pygame.display.update()



    def initSocket(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def connect(self, host, port):
        try:
            # host = socket.gethostbyname(host)
            #print("Host: ", host)
            self.sock.connect((host, port))
            return True
        except ConnectionRefusedError as e:
            #print("ConnectionRefused error({0}): {1}".format(e.errno, e.strerror))
            return False

    def executeShell(self, data):
        cmd = json.loads(data.decode('utf-8'))
        process = ''
        try:
            process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)
            for line in process.stdout:
                self.logData(line.decode('utf-8'), False)
                time.sleep(0.001)
        except Exception as e:
            # time.sleep(1)
            self.logData("Error execute shell", False)

        if process != '':
            process.kill()

    def addProjector(self):
        code = struct.pack(">I", CODE_ADD_PROJECTOR)
        len = struct.pack(">I", 0)
        self.sock.send(code + len)

    def logData(self, data, is_json=True):
        if is_json:
            data = json.dumps(data).encode('utf-8')
        else:
            data = data.encode('utf-8')

        dataLength = len(data)
        self.setHeader(CODE_LOG_DATA, dataLength)
        self.sock.send(data)

    def setHeader(self, opCode, length):
        c = struct.pack(">I", opCode)
        l = struct.pack(">I", length)
        self.sock.send(c + l)

    def receive(self):
        code = self.sock.recv(4)
        code = struct.unpack(">I", code)[0]
        timer = self.sock.recv(4)
        timer = struct.unpack(">I", timer)[0]
        self.lastLength = self.sock.recv(4)
        self.lastLength = struct.unpack(">I", self.lastLength)[0]
        if code == 0:
            data = self.sock.recv(self.lastLength)
            cmd = json.loads(data.decode('utf-8'))
            cmd['timer'] = timer
            self.logData(cmd)

            if timer != 0:
                timer = float(timer)
                lightStart = float(cmd['lightStart']) / 1000.0 + timer
                lightFinish = float(cmd['lightFinish']) / 1000.0 + timer
                projectorStart = float(cmd['projectorStart']) / 1000.0 + timer
                projectorFinish = float(cmd['projectorFinish']) / 1000.0 + timer
                stop = float(5.0) + timer

                isLStart = False
                isLFinish = False
                isPStart = False
                isPFinish = False

                while True:
                    time.sleep(0.001)
                    tm = time.time()
                    if tm >= lightStart and not isLStart:
                        isLStart = True
                        GPIO.output(GPIO_PORT, HIDE)
                    if tm >= lightFinish and not isLFinish:
                        isLFinish = True
                        GPIO.output(GPIO_PORT, SHOW)
                    if tm >= projectorStart and not isPStart:
                        isPStart = True
                        self.enableProjector(True)
                    if tm >= projectorFinish and not isPFinish:
                        isPFinish = True
                        self.enableProjector(False)
                    if tm >= stop:
                        self.logData("finish set", False)
                        break

        if code == CODE_EXECUTE_SHELL:
            payload = self.sock.recv(self.lastLength)
            self.executeShell(payload)


#### SocketHandler instance
s = SocketHandler()

def exit_handler():
    pygame.display.quit()


atexit.register(exit_handler)

while True:

    try:
        s.initSocket()
        if s.connect(HOST, PORT):
            s.addProjector()
            while True:
                s.receive()

    except TimeoutError as e:
        time.sleep(3)
    except ConnectionResetError as e:
        time.sleep(3)
    except IOError as e:
        time.sleep(3)
    # except Exception as e:
        # time.sleep(3)

    time.sleep(3)
