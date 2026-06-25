
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.1.103:3000'; // IP de la Raspberry Pi

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});