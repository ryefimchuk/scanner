import os
import socket
import fcntl
import struct
import json
import time
import picamera
import picamera.array
import atexit


HOST = '192.168.1.99'
PORT = 81


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


MAX_RES = (3280, 2464)


def _json_object_hook(d): return namedtuple('X', d.keys())(*d.values())
def json2obj(data): return json.loads(data, object_hook=_json_object_hook)


def get_ip_address(ifname):
	try:
		s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
		return socket.inet_ntoa(fcntl.ioctl(s.fileno(), 0x8915, struct.pack('256s', bytes(ifname[:15], 'utf-8')))[20:24])
	except IOError as e:
		return '';
		
current_ip = get_ip_address('eth0')
if current_ip == '':
	current_ip = get_ip_address('wlan0')

print("Current IP: ", current_ip )


class SocketHandler:
	frames = 2
	camera = picamera.PiCamera()

	payload = ''
	lastOpCode = 0
	lastLength = 0


	def __init__(self):
		self.camera.resolution = MAX_RES
		self.camera.framerate = 15
		self.camera.ISO = 200
		self.camera.awb_mode = 'off'
		self.camera.awb_gains = (1.8, 1.5)
		self.camera.shutter_speed = 60000
		self.camera.exposure_mode = 'off'
		self.camera.start_preview()
		time.sleep(2)
			
	def initSocket(self):
		self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)				
			
	def filenames(self):
		frame = 0
		while frame < self.frames:
			yield './image%02d.jpg' % frame
			frame += 1


			
	def connect(self, host, port):
		try:
			#host = socket.gethostbyname(host)
			print("Host: ", host)
			self.sock.connect((host, port))
			return True
		except ConnectionRefusedError as e: 
			print ("ConnectionRefused error({0}): {1}".format(e.errno, e.strerror))			
			return False

	def setHeader(self, opCode, length):
		print("OpCode: ", opCode)
		print("Length: ", length)
		c = struct.pack(">I", opCode)
		l = struct.pack(">I", length)
		self.sock.send(c + l)
		
			
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
		print ('Sending file...')
		l = f.read(1024 * 4)
		while (l):
			##print ('Sending...')
			self.sock.send(l)
			l = f.read(1024 * 4)
		f.close()
		print ('File sent')
		
			
	def receive(self):
		if self.lastOpCode == 0:
			self.payload = ''
			self.lastOpCode = self.sock.recv(4)
			self.lastOpCode = struct.unpack(">I", self.lastOpCode)[0]
			self.lastLength = self.sock.recv(4)
			self.lastLength = struct.unpack(">I", self.lastLength)[0]
			print("Receive operation: " + str(self.lastOpCode) + " with length: " + str(self.lastLength))
			return

		while len(self.payload) < self.lastLength:
			chunk = self.sock.recv(self.lastLength-len(self.payload))
			self.payload = self.payload + chunk.decode('utf-8')		
			
		
		if self.lastOpCode == CODE_TAKE_THUMB:
			self.takeThumb()

		if self.lastOpCode == CODE_TAKE_PREVIEW:
			self.takePreview()
		
		if self.lastOpCode == CODE_TAKE_PHOTO:
			self.takePhoto()
			
		if self.lastOpCode == CODE_ADD_SCANNER:
			print(self.payload)
			
		if self.lastOpCode == CODE_SET_PHOTO_SETTINGS:
			self.setPhotoSettings(self.payload)
			
		if self.lastOpCode == CODE_SET_SCANNER_NUMBER:
			self.setScannerNumber(self.payload)	
			

		self.lastOpCode = 0
		self.lastLength = 0
		self.payload = ''
		


		
	def setScannerNumber(self, data):
		number = json.loads(data)
		print(number)

		
		
		
	def setPhotoSettings(self, data):
		settings = json.loads(data)
		
		if settings['awb']:
		
			self.camera.awb_mode = settings['awb'];
			#self.camera.awb_mode = settings['awb'];
			#if settings['awb'] == 'off'
				
	
			
	def takeThumb(self):
		print("Take thumb")
		thumbFileName = './thumb.jpg'
		self.camera.resolution = (160, 90)
		self.camera.capture_sequence([thumbFileName], 'jpeg', use_video_port=True)
		time.sleep(1)
		self.sendFile(CODE_UPLOAD_THUMB, thumbFileName)

		
	def takePreview(self):
		print("Take preview")
		previewFileName = './preview.jpg'
		self.camera.resolution = MAX_RES
		self.camera.capture_sequence([previewFileName], 'jpeg', use_video_port=True)
		time.sleep(1)
		self.sendFile(CODE_UPLOAD_PREVIEW, previewFileName)

		
		
	def takePhoto(self):
		print("Take photo")
		start = time.time()
		self.camera.resolution = MAX_RES
		self.camera.capture_sequence(self.filenames(), 'jpeg', use_video_port=True)
		finish = time.time()
		print('Captured %d frames at %.2ffps' % (self.frames, self.frames / (finish - start)))
		print('Timing: %.3f' % (finish - start))

		time.sleep(1)
		
		counter = 0
		for filesName in self.filenames():
			self.sendFile(CODE_UPLOAD_PHOTO1 + counter, filesName)
			counter = counter +1
			#sleep(1)
		


#### SocketHandler instance

s = SocketHandler()


def exit_handler():
    s.camera.close()

atexit.register(exit_handler)



while True:

	try:
		s.initSocket()
		if s.connect(HOST, PORT):

			scanner = {}
			scanner['ip'] = current_ip
			scanner['numb'] = 10
			scanner['files'] = []

			s.sendJSON(CODE_ADD_SCANNER, scanner)

			while True:
				s.receive()
				
	except TimeoutError as e:
		print('Timeout Error: ', e)
		
	except ConnectionResetError as e:
		print('Connection Reset Error: ', e)

	time.sleep(2)

