import socket
import fcntl
import struct
import time
import pygame
import atexit


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
            print("Host: ", host)
            self.sock.connect((host, port))
            return True
        except ConnectionRefusedError as e:
            print("ConnectionRefused error({0}): {1}".format(e.errno, e.strerror))
            return False

    def addProjector(self):
        code = struct.pack(">I", CODE_ADD_PROJECTOR)
        len = struct.pack(">I", 0)
        self.sock.send(code + len)

    def receive(self):
        code = self.sock.recv(4)
        code = struct.unpack(">I", code)[0]
        timer = self.sock.recv(4)
        timer = struct.unpack(">I", timer)[0]
        self.lastLength = self.sock.recv(4)
        self.lastLength = struct.unpack(">I", self.lastLength)[0]
        #print("Receive operation: " + str(self.lastOpCode) + " with length: " + str(self.lastLength))
        if code == 0:
            if timer != 0:
                time.sleep(float(timer) - time.time() - 0.02)

            self.enableProjector(True)
            time.sleep(0.3)
            self.enableProjector(False)



#### SocketHandler instance

s = SocketHandler()

def exit_handler():
    print('Close')


atexit.register(exit_handler)

while True:

    try:
        s.initSocket()
        if s.connect(HOST, PORT):
            s.addProjector()
            while True:
                s.receive()

    except TimeoutError as e:
        print('Timeout Error: ', e)

    except ConnectionResetError as e:
        print('Connection Reset Error: ', e)

    except IOError as e:
        print('IOError: ', e)

    time.sleep(3)
