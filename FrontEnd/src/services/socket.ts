import { io } from 'socket.io-client';
import config from '../../../config.json';

const SOCKET_URL = `http://${config.BIP}:${config.PORT}`;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});