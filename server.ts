import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, addDoc } from "firebase/firestore";
import fs from "fs";

// Initialize Firebase using the generated config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  console.log("Firebase initialized in server");
} else {
  console.warn("firebase-applet-config.json not found. Firestore will not be used in the backend.");
}


async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Initialize Socket.io with CORS
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Socket.io Connection Logic
  io.on("connection", (socket) => {
    const tenantId = socket.handshake.query.tenantId || socket.handshake.headers["tenant-id"];
    const clientType = socket.handshake.query.clientType || socket.handshake.headers["client-type"];
    const machineName = socket.handshake.query.machineName || socket.handshake.headers["machine-name"] || "Unknown";

    if (!tenantId) {
      console.log("Connection rejected: No tenantId provided.");
      socket.disconnect();
      return;
    }

    const roomName = `tenant_${tenantId}`;
    socket.join(roomName);

    console.log(`[${clientType}] connected to ${roomName} (Machine: ${machineName})`);

    // Only agents broadcast their status to the room
    if (clientType === "agent") {
      const updateAgentStatus = async (status: string, activeWindow: string) => {
        if (!db) return;
        try {
          // Keep agent ID deterministic based on tenantId and machineName to prevent duplicates
          const agentId = `${tenantId}_${machineName}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
          await setDoc(doc(db, "agents", agentId), {
            tenantId,
            machineName,
            status,
            activeWindow,
            lastUpdate: Date.now()
          });
        } catch (e) {
          console.error("Failed to update agent status in Firestore:", e);
        }
      };

      const recordEvent = async (type: string, extraData: any = {}) => {
        if (!db) return;
        try {
          // Generate a unique ID (random alphanumeric)
          const eventId = Math.random().toString(36).substring(2, 15);
          await setDoc(doc(db, "events", eventId), {
            tenantId,
            machineName,
            type,
            timestamp: Date.now(),
            ...extraData
          });
        } catch (e) {
          console.error("Failed to record event in Firestore:", e);
        }
      };

      updateAgentStatus("online", "Connected");
      io.to(roomName).emit("AGENT_ONLINE", { machineName, timestamp: Date.now() });

      socket.on("WINDOW_CHANGED", (data) => {
        console.log(`[${roomName}] Window changed on ${data.machineName}: ${data.windowTitle}`);
        updateAgentStatus("online", data.windowTitle);
        recordEvent("WINDOW_CHANGED", { windowTitle: data.windowTitle });
        io.to(roomName).emit("WINDOW_CHANGED", data);
      });

      socket.on("ALERT_IDLE_OR_SCREEN_OFF", (data) => {
        console.log(`[${roomName}] Idle Alert on ${data.machineName}: ${data.idleTimeSeconds}s`);
        updateAgentStatus("idle", "Idle/Away");
        recordEvent("ALERT_IDLE_OR_SCREEN_OFF", { idleTimeSeconds: data.idleTimeSeconds });
        io.to(roomName).emit("ALERT_IDLE_OR_SCREEN_OFF", data);
      });
      
      socket.on("ACTIVITY_RESUMED", (data) => {
        console.log(`[${roomName}] Activity resumed on ${data.machineName}`);
        updateAgentStatus("online", "Resumed Activity");
        recordEvent("ACTIVITY_RESUMED");
        io.to(roomName).emit("ACTIVITY_RESUMED", data);
      });

      socket.on("disconnect", () => {
        console.log(`[${clientType}] disconnected from ${roomName} (Machine: ${machineName})`);
        updateAgentStatus("offline", "Disconnected");
        io.to(roomName).emit("AGENT_OFFLINE", { machineName, timestamp: Date.now() });
      });
    }
  });

  // REST API Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: Date.now() });
  });

  // Vite middleware for frontend development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
