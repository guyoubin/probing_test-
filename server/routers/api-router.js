const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const User = require("../model/user");
const Monitor = require("../model/monitor");
const Heartbeat = require("../model/heartbeat");
const Database = require("../database");
const config = require("../config");
const { authMiddleware } = require("../auth");

// POST /api/setup - First-time setup (create admin user)
router.post("/setup", async (req, res) => {
    try {
        // Check if any user already exists
        const existingUser = Database.db.prepare("SELECT id FROM user LIMIT 1").get();
        if (existingUser) {
            return res.status(400).json({ error: "Setup already completed. An admin user exists." });
        }

        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const user = await User.create(Database.db, username, password);
        const token = user.generateJWT(config.jwtSecret, config.jwtExpiresIn);

        res.json({
            ok: true,
            token,
            user: { id: user.id, username: user.username },
        });
    } catch (err) {
        console.error("Setup error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/login - Login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const user = await User.findByUsername(Database.db, username);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await User.verifyPassword(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (!user.active) {
            return res.status(403).json({ error: "Account is disabled" });
        }

        const token = user.generateJWT(config.jwtSecret, config.jwtExpiresIn);

        // Set cookie
        res.cookie("cyberprobe-token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({
            ok: true,
            token,
            user: { id: user.id, username: user.username },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/status - System status (no auth required for setup check)
router.get("/status", (req, res) => {
    try {
        const userCount = Database.db.prepare("SELECT COUNT(*) as count FROM user").get().count;
        const monitorCount = Database.db.prepare("SELECT COUNT(*) as count FROM monitor").get().count;

        res.json({
            ok: true,
            setupRequired: userCount === 0,
            userCount,
            monitorCount,
            demoMode: config.demoMode,
        });
    } catch (err) {
        // If tables don't exist yet, setup is required
        res.json({
            ok: true,
            setupRequired: true,
            userCount: 0,
            monitorCount: 0,
            demoMode: config.demoMode,
        });
    }
});

// GET /api/reports/:id/download - Download report file
router.get("/reports/:id/download", authMiddleware, (req, res) => {
    try {
        const report = Database.db.prepare("SELECT * FROM report WHERE id = ?").get(req.params.id);
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        if (report.user_id !== req.user.id) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (!report.file_path || !fs.existsSync(report.file_path)) {
            return res.status(404).json({ error: "Report file not found" });
        }

        const ext = path.extname(report.file_path);
        const contentTypes = {
            ".html": "text/html",
            ".pdf": "application/pdf",
            ".json": "application/json",
            ".csv": "text/csv",
        };

        res.setHeader("Content-Type", contentTypes[ext] || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(report.file_path)}"`);
        fs.createReadStream(report.file_path).pipe(res);
    } catch (err) {
        console.error("Report download error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
