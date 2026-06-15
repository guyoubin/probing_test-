const Database = require("../database");
const ProbeNode = require("../model/probe-node");
const CyberProbeServer = require("../cyberprobe-server");
const crypto = require("crypto");

function probeNodeSocketHandler(socket) {
    // "getProbeNodeList" - Get all probe nodes
    socket.on("getProbeNodeList", async (data, callback) => {
        try {
            const nodes = ProbeNode.getList(Database.db);
            callback({ ok: true, nodes });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "addProbeNode" - Add a new probe node
    socket.on("addProbeNode", async (data, callback) => {
        try {
            const { name, hostname, region, latitude, longitude, capabilities, custom_labels } = data || {};
            if (!name) {
                return callback({ ok: false, error: "Node name is required" });
            }

            const apiKey = crypto.randomBytes(16).toString("hex");

            const node = ProbeNode.create(Database.db, {
                name,
                hostname,
                region,
                latitude,
                longitude,
                status: "offline",
                capabilities_json: capabilities,
                api_key: apiKey,
                custom_labels_json: custom_labels,
            });

            // Register in server runtime
            const server = CyberProbeServer.getInstance();
            server.probeNodeList[node.id] = node;

            callback({ ok: true, node, api_key: apiKey });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "deleteProbeNode" - Delete a probe node
    socket.on("deleteProbeNode", async (data, callback) => {
        try {
            const { id } = data;
            if (!id) {
                return callback({ ok: false, error: "Node ID is required" });
            }

            const node = ProbeNode.getById(Database.db, id);
            if (!node) {
                return callback({ ok: false, error: "Node not found" });
            }

            const server = CyberProbeServer.getInstance();
            delete server.probeNodeList[id];

            ProbeNode.delete(Database.db, id);
            callback({ ok: true });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "registerNode" - Node registration (called by the node itself)
    // Note: This endpoint allows nodes to register without full user auth
    // The node authenticates via its API key
    socket.on("registerNode", async (data, callback) => {
        try {
            const { api_key, hostname, capabilities } = data || {};
            if (!api_key) {
                return callback({ ok: false, error: "API key is required" });
            }

            const node = ProbeNode.findByApiKey(Database.db, api_key);
            if (!node) {
                return callback({ ok: false, error: "Invalid API key" });
            }

            // Update node info
            if (hostname) {
                Database.db.prepare("UPDATE probe_node SET hostname = ? WHERE id = ?").run(hostname, node.id);
            }

            ProbeNode.updateStatus(Database.db, node.id, "online");

            // Update runtime
            const server = CyberProbeServer.getInstance();
            const updatedNode = ProbeNode.getById(Database.db, node.id);
            server.probeNodeList[node.id] = updatedNode;

            callback({ ok: true, node: updatedNode });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });

    // "nodeHeartbeat" - Node heartbeat (called by nodes periodically)
    socket.on("nodeHeartbeat", async (data, callback) => {
        try {
            const { api_key, status } = data || {};
            if (!api_key) {
                return callback({ ok: false, error: "API key is required" });
            }

            const node = ProbeNode.findByApiKey(Database.db, api_key);
            if (!node) {
                return callback({ ok: false, error: "Invalid API key" });
            }

            const nodeStatus = status || "online";
            ProbeNode.updateStatus(Database.db, node.id, nodeStatus);

            // Update runtime
            const server = CyberProbeServer.getInstance();
            const updatedNode = ProbeNode.getById(Database.db, node.id);
            server.probeNodeList[node.id] = updatedNode;

            callback({ ok: true });
        } catch (err) {
            callback({ ok: false, error: err.message });
        }
    });
}

module.exports = { probeNodeSocketHandler };
