import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import fs from "fs";
import { initDb } from "./src/db.js";
import authRoutes from "./src/routes/auth.js";
import candidateRoutes from "./src/routes/candidates.js";
import agentRoutes from "./src/routes/agents.js";
import paymentRoutes from "./src/routes/payments.js";
import dashboardRoutes from "./src/routes/dashboard.js";
import sslRoutes from "./src/routes/sslcommerz.js";
import packageRoutes from "./src/routes/packages.js";
import employerRoutes from "./src/routes/employers.js";

// Initialize Database
initDb();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3001');

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', true);

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });
  
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
  app.use('/uploads', express.static(uploadsDir));

  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/packages", packageRoutes);
  app.use("/api/sslcommerz", sslRoutes);
  app.use("/api/employers", employerRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please stop the process using it or set a different PORT.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer();
