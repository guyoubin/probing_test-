const User = require("../model/user");
const Database = require("../database");
const config = require("../config");
const Monitor = require("../model/monitor");
const Heartbeat = require("../model/heartbeat");

function generalSocketHandler(socket) {
    // "login" - User login, return JWT
    socket.on("login", async (data, callback) => {
        try {
            const { username, password } = data || {};
            if (!username || !password) {
                return callback({ ok: false, error: "Username and password are required" });
            }

            const user = await User.findByUsername(Database.db, username);
            if (!user) {
                return callback({ ok: false, error: "Invalid credentials" });
            }

            const valid = await User.verifyPassword(password, user.password);
            if (!valid) {
                return callback({ ok: false, error: "Invalid credentials" });
            }

            if (!user.active) {
                return callback({ ok: false, error: "Account is disabled" });
            }

            const token = user.generateJWT(config.jwtSecret, config.jwtExpiresIn);
            callback({
                ok: true,
                token,
                user: { id: user.id, username: user.username },
            });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "setup" - First-time admin creation
    socket.on("setup", async (data, callback) => {
        try {
            const existingUser = Database.db.prepare("SELECT id FROM user LIMIT 1").get();
            if (existingUser) {
                return callback({ ok: false, error: "Setup already completed" });
            }

            const { username, password } = data || {};
            if (!username || !password) {
                return callback({ ok: false, error: "Username and password are required" });
            }
            if (password.length < 6) {
                return callback({ ok: false, error: "Password must be at least 6 characters" });
            }

            const user = await User.create(Database.db, username, password);
            const token = user.generateJWT(config.jwtSecret, config.jwtExpiresIn);

            // Update socket user after setup
            socket.user = user;

            callback({
                ok: true,
                token,
                user: { id: user.id, username: user.username },
            });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "loginByToken" - Token-based login
    socket.on("loginByToken", async (data, callback) => {
        try {
            const { token } = data || {};
            if (!token) {
                return callback({ ok: false, error: "Token is required" });
            }

            const decoded = User.verifyJWT(token, config.jwtSecret);
            const user = await User.findById(Database.db, decoded.id);
            if (!user) {
                return callback({ ok: false, error: "User not found" });
            }
            if (!user.active) {
                return callback({ ok: false, error: "Account is disabled" });
            }

            // Update socket user
            socket.user = user;

            callback({
                ok: true,
                token,
                user: { id: user.id, username: user.username },
            });
        } catch (err) {
            callback({ ok: false, error: "Invalid token" });
        }
    });

    // "getSystemStatus" - Return system status overview
    socket.on("getSystemStatus", async (data, callback) => {
        try {
            const userCount = Database.db.prepare("SELECT COUNT(*) as count FROM user").get().count;
            const monitorCount = Database.db.prepare("SELECT COUNT(*) as count FROM monitor").get().count;
            const heartbeatCount = Database.db.prepare("SELECT COUNT(*) as count FROM heartbeat").get().count;

            const CyberProbeServer = require("../cyberprobe-server");
            const server = CyberProbeServer.getInstance();
            const activeMonitorCount = Object.values(server.monitorList).filter(m => m.active).length;

            callback({
                ok: true,
                setupRequired: userCount === 0,
                userCount,
                monitorCount,
                activeMonitorCount,
                heartbeatCount,
                monitorTypes: Object.keys(server.monitorTypeList),
                demoMode: config.demoMode,
            });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });
}

module.exports = { generalSocketHandler };
