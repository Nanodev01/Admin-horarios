
import { io } from 'socket.io-client';

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const SOCKET_URL = `http://${hostname}:3000`;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});