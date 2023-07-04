const express = require("express");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const connectDB = require("./config/database");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const { Socket } = require("socket.io");

const app = express();

dotenv.config({ path: "backend/config/.env" });

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(notFound);
app.use(errorHandler);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, console.log(`Server Started on port ${PORT}`));

//socket
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log("connected to socket.io");

  //connecting to user
  socket.on("setup", (userId) => {
    if (userId !== undefined || null) {
      socket.join(userId);
      socket.emit("connected");
      console.log("logged: " + userId);
    }
  });

  //joining chat room
  socket.on("joinChat", (chatRoomId) => {
    socket.join(chatRoomId);
    console.log("joined: " + chatRoomId);
  });

  //pooling for new messages
  socket.on("newMessage", (newMessageRecieved) => {
    if (newMessageRecieved.chat) {
      const chat = newMessageRecieved.chat;
      if (!chat.users) return;

      for (const user of chat.users) {
        if (user._id !== newMessageRecieved.sender._id) {
          console.log("sent to " + user._id);
          socket.in(user._id).emit("notify", newMessageRecieved);
        }
      }
    }
  });

  //chatroom events
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("notTyping", (room) => socket.in(room).emit("notTyping"));

  //closing socket
  socket.off("setup", () => {
    console.log("Disconnected: " + userId);
    socket.leave(userId);
  });
});
