import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const useSocket = () => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      autoConnect: true
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.io connected:', socketRef.current.id);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinExpenseRoom = (expenseId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_expense', expenseId);
    }
  };

  const leaveExpenseRoom = (expenseId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_expense', expenseId);
    }
  };

  const onCommentReceived = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('comment_received', callback);
    }
  };

  const offCommentReceived = (callback) => {
    if (socketRef.current) {
      socketRef.current.off('comment_received', callback);
    }
  };

  const joinGroupRoom = (groupId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_group', groupId);
    }
  };

  const leaveGroupRoom = (groupId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_group', groupId);
    }
  };

  const onGroupUpdated = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('group_updated', callback);
    }
  };

  const offGroupUpdated = (callback) => {
    if (socketRef.current) {
      socketRef.current.off('group_updated', callback);
    }
  };

  return {
    socket: socketRef.current,
    joinExpenseRoom,
    leaveExpenseRoom,
    onCommentReceived,
    offCommentReceived,
    joinGroupRoom,
    leaveGroupRoom,
    onGroupUpdated,
    offGroupUpdated
  };
};
export default useSocket;
