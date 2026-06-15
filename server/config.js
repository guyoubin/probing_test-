const path = require("path");
module.exports = {
    port: parseInt(process.env.PORT) || 3001,
    dataDir: path.resolve(process.env.DATA_DIR || "./data"),
    jwtSecret: process.env.JWT_SECRET || "cyberprobe-secret-change-me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    demoMode: process.env.DEMO_MODE === "1",
};
