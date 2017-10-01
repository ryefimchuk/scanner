from socketIO_client import SocketIO, LoggingNamespace

def on_connect_response(*args):
    print('on_connect_response', args)

socketIO = SocketIO('http://192.168.1.99', 80, LoggingNamespace)
socketIO.on('connect', on_connect_response)
socketIO.emit('aaa')
socketIO.wait(seconds=1)