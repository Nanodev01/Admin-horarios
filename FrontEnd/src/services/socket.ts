
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000'; // cambiar por la ip de la rpi

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});