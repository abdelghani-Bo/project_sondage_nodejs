let ioInstance = null;

function setupSocketIO(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Join a specific class room
    socket.on('join_class', ({ classId, userId, userName }) => {
      if (classId) {
        const roomName = `class_${classId}`;
        socket.join(roomName);
        socket.to(roomName).emit('user_joined_room', {
          userId,
          userName,
          message: `${userName || 'Un participant'} a rejoint la session.`
        });
      }
    });

    // Leave class room
    socket.on('leave_class', ({ classId, userId, userName }) => {
      if (classId) {
        const roomName = `class_${classId}`;
        socket.leave(roomName);
        socket.to(roomName).emit('user_left_room', {
          userId,
          userName,
          message: `${userName || 'Un participant'} a quitté la session.`
        });
      }
    });

    // Join exam teacher monitoring room
    socket.on('join_exam_monitor', ({ examId }) => {
      if (examId) {
        socket.join(`exam_monitor_${examId}`);
      }
    });

    socket.on('disconnect', () => {
      // socket disconnected
    });
  });

  return io;
}

function getIO() {
  return ioInstance;
}

// Helper broadcast functions
function emitToClass(classId, event, data) {
  if (ioInstance && classId) {
    ioInstance.to(`class_${classId}`).emit(event, data);
  }
}

function emitToExamMonitor(examId, event, data) {
  if (ioInstance && examId) {
    ioInstance.to(`exam_monitor_${examId}`).emit(event, data);
  }
}

module.exports = {
  setupSocketIO,
  getIO,
  emitToClass,
  emitToExamMonitor
};
