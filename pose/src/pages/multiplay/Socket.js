import io from "socket.io-client";
const socket = io("http://localhost:3002/"); // Server URL

export default socket;