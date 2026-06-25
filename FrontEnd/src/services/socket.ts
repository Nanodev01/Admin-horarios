import { io } from 'socket.io-client';
import { BACKEND_IP } from './api';

const SOCKET_URL = `http://${BACKEND_IP}:3000`;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});