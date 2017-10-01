from socketIO_client import SocketIO
import pygame
import os
import time

done = False

pygame.init()
screen = pygame.display.set_mode((0,0),pygame.FULLSCREEN)

image1 = pygame.image.load("./test1.jpg")
image2 = pygame.image.load("./test2.jpg")

back1 = pygame.Surface(screen.get_size())
back1 = back1.convert()
# back1.blit(image1,(0,0))

back2 = pygame.Surface(screen.get_size())
back2 = back2.convert()
back2.blit(image2,(0,0))

def on_projector_response(*args):
    print('Projector', args)
    screen.blit(back2,(0,0))
    pygame.display.flip()	
	
def on_connect_response(*args):
    print('Connected', args)	
    socketIO.emit('add projector')
	
	
def on_disconnect_response(*args):
    print('Disconnect', args)	
    # socketIO.emit('add projector')
    pygame.quit()	
	
socketIO = SocketIO('http://192.168.1.99')
socketIO.on('connect', on_connect_response)
socketIO.on('disconnect', on_disconnect_response)
socketIO.on('projector', on_projector_response)
socketIO.wait()


while not done:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            done = True
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                done = True
            if event.key == pygame.K_LEFT:
                screen.blit(back1,(0,0))
                pygame.display.flip()
            if event.key == pygame.K_RIGHT:
                screen.blit(back2,(0,0))
                pygame.display.flip()
    
pygame.quit()