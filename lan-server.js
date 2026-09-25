const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);
const ROOT = __dirname;
const rooms = new Map();

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };
const server = http.createServer((request, response) => {
  const requested = decodeURIComponent((request.url || "/").split("?")[0]);
  const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT + path.sep)) { response.writeHead(403); response.end("Forbidden"); return; }
  fs.readFile(file, (error, data) => { if (error) { response.writeHead(404); response.end("Not found"); return; } response.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); response.end(data); });
});

const websocket = new WebSocketServer({ server });
function send(socket, message) { if (socket && socket.readyState === 1) socket.send(JSON.stringify(message)); }
function error(socket, message) { send(socket, { type: "server-error", message }); }
function validRoom(room) { return /^\d{6}$/.test(String(room || "")); }

websocket.on("connection", (socket) => {
  socket.id = crypto.randomBytes(4).toString("hex"); socket.role = "none"; socket.room = null;
  socket.on("message", (raw) => {
    let message; try { message = JSON.parse(raw.toString()); } catch { return error(socket, "BAD MESSAGE"); }
    if (message.type === "host") {
      const room = String(message.room || ""); if (!validRoom(room)) return error(socket, "ROOM CODE MUST BE 6 DIGITS"); if (rooms.has(room)) return error(socket, "ROOM CODE ALREADY IN USE");
      socket.role = "host"; socket.room = room; rooms.set(room, { host: socket, clients: new Map() }); send(socket, { type: "host-ready", room }); return;
    }
    if (message.type === "join") {
      const room = rooms.get(String(message.room || "")); if (!room) return error(socket, "ROOM NOT FOUND // ASK THE HOST TO CREATE IT FIRST"); if (room.clients.size >= 7) return error(socket, "ROOM IS FULL");
      socket.role = "client"; socket.room = String(message.room); room.clients.set(socket.id, socket); send(socket, { type: "joined", room: socket.room }); send(room.host, { type: "peer-join", peerId: socket.id }); return;
    }
    if (message.type === "send") {
      const room = rooms.get(socket.room); if (!room) return error(socket, "ROOM CLOSED");
      if (socket.role === "host") { const target = room.clients.get(String(message.to || "")); if (target) send(target, { type: "data", data: message.data }); }
      else if (socket.role === "client") send(room.host, { type: "data", from: socket.id, data: message.data });
    }
  });
  socket.on("close", () => {
    const room = rooms.get(socket.room); if (!room) return;
    if (socket.role === "host") { room.clients.forEach((client) => send(client, { type: "server-error", message: "HOST LEFT THE ROOM" })); rooms.delete(socket.room); }
    else { room.clients.delete(socket.id); send(room.host, { type: "peer-leave", peerId: socket.id }); }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`IRONCLASH LAN server running on port ${PORT}`);
  console.log(`On this computer: http://localhost:${PORT}`);
  console.log("On the same Wi-Fi: http://<this-computers-LAN-IP>:" + PORT);
});
