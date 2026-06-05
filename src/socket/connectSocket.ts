/* eslint-disable no-console */
import { Server as HTTPServer } from 'http';
import mongoose from 'mongoose';

import { Server as ChatServer, Socket } from 'socket.io';

import User from '../app/modules/user/user.model';
import config from '../config';
import jwtHelpers from '../helpers/jwtHelpers';


import { USER_STATUS } from '../app/modules/user/user.constant';
import handleQuizEvents from './handleQuizEvents';
import { SOCKET_EVENTS } from './socket.constant';

let io: ChatServer;


// Socket Auth Middleware — verifies JWT access token
const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const token =
      socket.handshake.headers?.authorization?.replace('Bearer ', '') || '';
    console.log("token from socket", token)
    if (!token) {
      return next(new Error('Authentication token is missing'));
    }

    // Verify JWT using the same secret as HTTP auth middleware
    let decoded;
    try {
      decoded = jwtHelpers.verifyToken(token, config.jwt_access_token_secret!);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return next(new Error('Invalid or expired token'));
    }
    console.log(decoded)
    const userId = decoded.id;
    console.log(userId)
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return next(new Error('Invalid token payload'));
    }

    const currentUser = await User.findById(userId)
      .select('-password')
      .lean();

    if (!currentUser) {
      return next(new Error('User not found'));
    }

    // Check if user is deleted or inactive
    if (currentUser.deletedAt) {
      return next(new Error('Account has been deleted'));
    }

    if (currentUser.status === USER_STATUS.BLOCKED) {
      return next(new Error('Account is deactivated'));
    }

    // Check if token was issued before password change
    if (
      currentUser.passwordChangedAt &&
      decoded.iat &&
      new Date(decoded.iat * 1000) < new Date(currentUser.passwordChangedAt)
    ) {
      return next(new Error('Password changed, please login again'));
    }

    socket.data.userId = currentUser._id.toString();

    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication failed'));
  }
};

// Handle individual socket connection
const handleConnection = async (socket: Socket) => {
  const currentUserId: string = socket.data.userId;

  console.log(`User connected: ${currentUserId}`);

  // Join personal room
  try {
    socket.join(currentUserId);
    const sockets = await io.in(currentUserId).fetchSockets();

    if (sockets.length === 1) {
      await User.updateOne(
        { _id: currentUserId },
        { $set: { isOnline: true } }
      );
    }
  } catch (err) {
    console.error('Failed to join role channel:', currentUserId, err);
  }


  // Test notification (only available in non-production)


  // Register chat and location event handlers
  handleQuizEvents(io, socket, currentUserId);

  // Disconnect cleanup
  socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
    console.log(`User disconnected: ${currentUserId}`);
  });
};

// Initialize socket server — registers middleware and connection handler ONCE
const connectSocket = (server: HTTPServer) => {
  console.log("Initializing Socket.io server...");
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: "*",
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization', 'Content-Type'],
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000,
      connectTimeout: 45000,
    });

    // Register middleware and connection handler ONCE (inside the if block)
    io.use(socketAuthMiddleware);
    io.on(SOCKET_EVENTS.CONNECTION, handleConnection);
  }

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

export { connectSocket, getSocketIO };

