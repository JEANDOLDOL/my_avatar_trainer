// src/services/socket.js
import { io } from "socket.io-client";

const justUrl = process.env.REACT_APP_FRONTEND_just_UR; // url 리다이렉트

const socket = io(`https://techn0.shop`, {
  autoConnect: true,
});

export default socket;
