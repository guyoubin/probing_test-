const jwt = require("jsonwebtoken");
const config = require("./config");
const User = require("./model/user");
const Database = require("./database");

function authMiddleware(req, res, next) {
    let token = null;

    // Try cookie first
    if (req.headers.cookie) {
        const cookies = req.headers.cookie.split(";").reduce((acc, c) => {
            const [key, ...val] = c.trim().split("=");
            acc[key] = val.join("=");
            return acc;
        }, {});
        token = cookies["cyberprobe-token"] || null;
    }

    // Fall back to Authorization header
    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(" ");
        if (parts.length === 2 && parts[0] === "Bearer") {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const decoded = User.verifyJWT(token, config.jwtSecret);
        const user = User.findById(Database.db, decoded.id);
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        if (!user.active) {
            return res.status(403).json({ error: "User account is disabled" });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

function socketAuth(socket, next) {
    let token = null;

    // Try cookie from handshake headers
    const cookieHeader = socket.request.headers.cookie;
    if (cookieHeader) {
        const cookies = cookieHeader.split(";").reduce((acc, c) => {
            const [key, ...val] = c.trim().split("=");
            acc[key] = val.join("=");
            return acc;
        }, {});
        token = cookies["cyberprobe-token"] || null;
    }

    // Fall back to auth object in handshake
    if (!token && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
    }

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {
        const decoded = User.verifyJWT(token, config.jwtSecret);
        const user = User.findById(Database.db, decoded.id);
        if (!user) {
            return next(new Error("User not found"));
        }
        if (!user.active) {
            return next(new Error("User account is disabled"));
        }
        socket.user = user;
        next();
    } catch (err) {
        return next(new Error("Invalid token"));
    }
}

module.exports = {
    authMiddleware,
    socketAuth,
};
