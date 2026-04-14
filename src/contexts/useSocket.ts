import { useContext } from 'react';
import { SocketContext } from './SocketContextCore';
import type { SocketContextType } from './SocketContextCore';

export const useSocket = (): SocketContextType => useContext(SocketContext);
