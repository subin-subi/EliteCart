import { Server } from "socket.io";

let io;

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
        }
    });

    io.on("connection", (socket) => {
        // console.log("Socket Connected:", socket.id);

        // Register a user room
        socket.on("register", (userId) => {
            socket.join(userId);
            console.log("User joined room:", userId);
        });

        // Send message event
        socket.on("sendMessage", (data) => {
            io.to(data.receiverId).emit("receiveMessage", data);
        });

        // On disconnect
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
}
