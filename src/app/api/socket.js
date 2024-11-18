import { Server } from "socket.io";

let io;

export default function handler(req, res) {
  if (!io) {
    io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      // Listen for custom events
      socket.on("message", (data) => {
        console.log("Message received:", data);

        // Broadcast the message to all clients
        io.emit("message", data);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }
  res.end();
}
