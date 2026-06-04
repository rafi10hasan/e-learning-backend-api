
import { Server as IOServer, Socket } from 'socket.io';
import { SOCKET_EVENTS } from './socket.constant';


//
const handleQuizEvents = async (
  io: IOServer,
  socket: Socket,
  currentUserId: string,
): Promise<void> => {

  // create conversation
  socket.on(SOCKET_EVENTS.CREATE_CONVERSATION, async (data, callback) => {
   
  });

  // join conversation
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (conversationId: string) => {
   
  });


  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId?: string) => {
   
  });

  socket.on(SOCKET_EVENTS.GET_CONVERSATIONS, async (query) => {
    
  });


  socket.on(SOCKET_EVENTS.GET_USER_STATUS, (targetUserId?: string) => {
   
  });

  socket.on(SOCKET_EVENTS.TYPING, ({ conversationId }) => {
   
  });

  socket.on(SOCKET_EVENTS.STOP_TYPING, ({ conversationId }) => {
  
  });

 
};

export default handleQuizEvents;
