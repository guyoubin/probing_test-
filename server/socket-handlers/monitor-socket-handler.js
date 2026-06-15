const Monitor = require("../model/monitor");
const Heartbeat = require("../model/heartbeat");
const Database = require("../database");
const CyberProbeServer = require("../cyberprobe-server");

function monitorSocketHandler(socket) {
    // "getMonitorList" - Get all monitors for the user
    socket.on("getMonitorList", async (data, callback) => {
        try {
            const monitors = Monitor.getMonitorList(Database.db, socket.user.id);
            callback({ ok: true, monitors });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "addMonitor" - Add a new monitor and start its beat
    socket.on("addMonitor", async (data, callback) => {
        try {
            const monitorData = { ...data, user_id: socket.user.id };
            const monitor = Monitor.create(Database.db, monitorData);

            const server = CyberProbeServer.getInstance();
            server.addMonitor(monitor);

            // Join monitor room for heartbeat push
            socket.join(`monitor:${monitor.id}`);

            // Notify all clients in the user's scope about monitor list change
            _emitMonitorList(server.io, socket.user.id);

            callback({ ok: true, monitor });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "editMonitor" - Edit a monitor (stop old beat, start new beat)
    socket.on("editMonitor", async (data, callback) => {
        try {
            const { id, ...updateData } = data;
            if (!id) {
                return callback({ ok: false, error: "Monitor ID is required" });
            }

            const existing = Monitor.findById(Database.db, id);
            if (!existing || existing.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            const monitor = Monitor.update(Database.db, id, updateData);

            const server = CyberProbeServer.getInstance();
            server.restartMonitor(id);

            _emitMonitorList(server.io, socket.user.id);

            callback({ ok: true, monitor });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "deleteMonitor" - Delete a monitor and stop its beat
    socket.on("deleteMonitor", async (data, callback) => {
        try {
            const { id } = data;
            if (!id) {
                return callback({ ok: false, error: "Monitor ID is required" });
            }

            const existing = Monitor.findById(Database.db, id);
            if (!existing || existing.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            const server = CyberProbeServer.getInstance();
            server.removeMonitor(id);

            Monitor.delete(Database.db, id);

            socket.leave(`monitor:${id}`);

            _emitMonitorList(server.io, socket.user.id);

            callback({ ok: true });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "pauseMonitor" - Pause a monitor's beat
    socket.on("pauseMonitor", async (data, callback) => {
        try {
            const { id } = data;
            if (!id) {
                return callback({ ok: false, error: "Monitor ID is required" });
            }

            const existing = Monitor.findById(Database.db, id);
            if (!existing || existing.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            Monitor.update(Database.db, id, { active: 0 });

            const server = CyberProbeServer.getInstance();
            const monitor = server.monitorList[id];
            if (monitor) {
                monitor.active = 0;
                monitor.stop();
            }

            _emitMonitorList(server.io, socket.user.id);

            callback({ ok: true });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "resumeMonitor" - Resume a monitor's beat
    socket.on("resumeMonitor", async (data, callback) => {
        try {
            const { id } = data;
            if (!id) {
                return callback({ ok: false, error: "Monitor ID is required" });
            }

            const existing = Monitor.findById(Database.db, id);
            if (!existing || existing.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            Monitor.update(Database.db, id, { active: 1 });

            const server = CyberProbeServer.getInstance();
            const monitor = server.monitorList[id];
            if (monitor) {
                monitor.active = 1;
                if (server.io) {
                    monitor.start(server.io);
                }
            }

            _emitMonitorList(server.io, socket.user.id);

            callback({ ok: true });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "getMonitorDetail" - Get monitor detail + recent heartbeats
    socket.on("getMonitorDetail", async (data, callback) => {
        try {
            const { id, heartbeatLimit } = data || {};
            if (!id) {
                return callback({ ok: false, error: "Monitor ID is required" });
            }

            const monitor = Monitor.findById(Database.db, id);
            if (!monitor || monitor.user_id !== socket.user.id) {
                return callback({ ok: false, error: "Monitor not found" });
            }

            const heartbeats = Heartbeat.getByMonitorId(Database.db, id, heartbeatLimit || 50);

            // Join the monitor room for real-time heartbeat push
            socket.join(`monitor:${id}`);

            callback({ ok: true, monitor, heartbeats });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });
}

/**
 * Emit updated monitor list to all sockets belonging to a user
 */
function _emitMonitorList(io, userId) {
    const monitors = Monitor.getMonitorList(Database.db, userId);
    // Emit to all connected sockets (simple approach)
    io.emit("monitorList", { ok: true, monitors });
}

module.exports = { monitorSocketHandler };
