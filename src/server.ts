import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { chatAgent } from "./lib/agent";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Chat endpoint
  app.post("/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "messages must be an array" });
      }

      const response = await chatAgent(messages);
      res.json(response);
    } catch (error: any) {
      console.error("Error in /chat:", error);
      if (error?.message?.includes("API key not valid") || error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API_KEY")) {
         return res.status(401).json({ error: "Invalid API key. Please configure a valid GEMINI_API_KEY in the Secrets panel (Settings menu)." });
      }
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
