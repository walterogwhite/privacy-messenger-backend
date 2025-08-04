// socket/socketHandler.js
const connectedUsers = new Map();

function socketHandler(io, database) {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('join', async ({ username }) => {
      try {
        const user = await database.createUser(username);
        if (!user) {
          socket.emit('error', { message: 'Failed to create user' });
          return;
        }

        connectedUsers.set(user.id, { user, socketId: socket.id });
        socket.userId = user.id;
        socket.user = user;

        // Send initial data
        const groups = await database.getGroups();
        const onlineUsers = await database.getOnlineUsers();

        socket.emit('groups-updated', groups);
        socket.emit('users-updated', onlineUsers);

        // Notify others
        socket.broadcast.emit('user-connected', user);
        io.emit('users-updated', Array.from(connectedUsers.values()).map(u => u.user));

        console.log(`👤 User ${username} joined`);
      } catch (error) {
        console.error('Error handling user join:', error);
        socket.emit('error', { message: 'Failed to join' });
      }
    });

    socket.on('send-message', async (messageData) => {
      try {
        if (!socket.user) return;

        const message = await database.addMessage({
          ...messageData,
          sender: socket.user.username,
          senderInfo: socket.user
        });

        if (message) {
          io.emit('new-message', message);
          console.log(`💬 Message sent in ${message.groupId} by ${message.sender}`);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('mark-message-viewed', async (messageId, groupId) => {
      try {
        // Mark as viewed and encrypt after delay
        setTimeout(async () => {
          const encrypted = await database.encryptMessage(messageId, groupId);
          if (encrypted) {
            io.emit('message-encrypted', messageId, groupId);
            console.log(`🔒 Message ${messageId} encrypted`);
          }
        }, 1000);
      } catch (error) {
        console.error('Error marking message as viewed:', error);
      }
    });

    socket.on('create-group', async ({ name, description, isPrivate }) => {
      try {
        if (!socket.user) return;

        const group = await database.createGroup(name, socket.user.id, description, isPrivate);
        if (group) {
          const groups = await database.getGroups();
          io.emit('groups-updated', groups);
          console.log(`📂 Group created: ${name} by ${socket.user.username}`);
        }
      } catch (error) {
        console.error('Error creating group:', error);
        socket.emit('error', { message: 'Failed to create group' });
      }
    });

    socket.on('start-call', async ({ type, groupId }) => {
      try {
        if (!socket.user) return;

        const call = await database.createCall(type, groupId, socket.user.id);
        if (call) {
          socket.to(groupId).emit('call-request', call);
          console.log(`📞 ${type} call started in ${groupId} by ${socket.user.username}`);
        }
      } catch (error) {
        console.error('Error starting call:', error);
        socket.emit('error', { message: 'Failed to start call' });
      }
    });

    socket.on('accept-call', async (callId) => {
      try {
        await database.updateCallStatus(callId, 'active');
        socket.broadcast.emit('call-accepted', callId);
      } catch (error) {
        console.error('Error accepting call:', error);
      }
    });

    socket.on('end-call', async (callId) => {
      try {
        await database.updateCallStatus(callId, 'ended');
        io.emit('call-ended', callId);
        console.log(`📞 Call ${callId} ended`);
      } catch (error) {
        console.error('Error ending call:', error);
      }
    });

    socket.on('call-signal', ({ to, signal, callId }) => {
      const targetUser = Array.from(connectedUsers.values()).find(u => u.user.id === to);
      if (targetUser) {
        io.to(targetUser.socketId).emit('call-signal', {
          from: socket.userId,
          signal,
          callId
        });
      }
    });

    socket.on('typing-start', (groupId) => {
      if (socket.user) {
        socket.broadcast.emit('typing-start', socket.user.id, groupId);
      }
    });

    socket.on('typing-stop', (groupId) => {
      if (socket.user) {
        socket.broadcast.emit('typing-stop', socket.user.id, groupId);
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (socket.userId) {
          await database.updateUserStatus(socket.userId, false);
          connectedUsers.delete(socket.userId);

          socket.broadcast.emit('user-disconnected', socket.userId);
          io.emit('users-updated', Array.from(connectedUsers.values()).map(u => u.user));

          console.log(`🔌 User disconnected: ${socket.user?.username}`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
}

module.exports = socketHandler;