const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require("path");
const config = require("./config");
const Database = require("./database");
const CyberProbeServer = require("./cyberprobe-server");
const Notification = require("./model/notification");
const { generalSocketHandler } = require("./socket-handlers/general-socket-handler");
const { monitorSocketHandler } = require("./socket-handlers/monitor-socket-handler");
const { reportSocketHandler } = require("./socket-handlers/report-socket-handler");
const { chartSocketHandler } = require("./socket-handlers/chart-socket-handler");
const { probeNodeSocketHandler } = require("./socket-handlers/probe-node-socket-handler");

async function main() {
    // Init database
    await Database.connect();
    await Database.patch();

    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, { cors: { origin: "*" } });

    // Serve static files (built frontend)
    app.use(express.static(path.join(__dirname, "../dist")));
    app.use(express.json());

    // API routes
    app.use("/api", require("./routers/api-router"));

    // SPA fallback
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../dist/index.html"));
    });

    // Socket.IO auth + handlers
    io.use(require("./auth").socketAuth);

    io.on("connection", (socket) => {
        generalSocketHandler(socket);
        monitorSocketHandler(socket);
        reportSocketHandler(socket);
        chartSocketHandler(socket);
        probeNodeSocketHandler(socket);
    });

    // Init server
    const server = CyberProbeServer.getInstance();
    server.io = io;
    server.app = app;
    await server.initAfterDatabaseReady();

    // Init notification providers
    Notification.init();

    httpServer.listen(config.port, () => {
        console.log(`CyberProbe listening on port ${config.port}`);
    });
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
