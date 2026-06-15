const dayjs = require("dayjs");

class ProbeNode {
    constructor(row) {
        this.id = row.id;
        this.name = row.name;
        this.hostname = row.hostname;
        this.region = row.region;
        this.latitude = row.latitude;
        this.longitude = row.longitude;
        this.status = row.status;
        this.last_heartbeat = row.last_heartbeat;
        this.capabilities_json = row.capabilities_json;
        this.api_key = row.api_key;
        this.created_at = row.created_at;
        this.custom_labels_json = row.custom_labels_json;
    }

    static create(db, data) {
        const result = db
            .prepare(
                `INSERT INTO probe_node (name, hostname, region, latitude, longitude, status,
                 capabilities_json, api_key, created_at, custom_labels_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                data.name,
                data.hostname || null,
                data.region || null,
                data.latitude || null,
                data.longitude || null,
                data.status || "unknown",
                data.capabilities_json ? (typeof data.capabilities_json === "string" ? data.capabilities_json : JSON.stringify(data.capabilities_json)) : null,
                data.api_key || null,
                dayjs().format("YYYY-MM-DD HH:mm:ss"),
                data.custom_labels_json ? (typeof data.custom_labels_json === "string" ? data.custom_labels_json : JSON.stringify(data.custom_labels_json)) : null
            );
        return ProbeNode.getById(db, result.lastInsertRowid);
    }

    static getById(db, id) {
        const row = db.prepare("SELECT * FROM probe_node WHERE id = ?").get(id);
        return row ? new ProbeNode(row) : null;
    }

    static getList(db) {
        const rows = db.prepare("SELECT * FROM probe_node ORDER BY name").all();
        return rows.map(r => new ProbeNode(r));
    }

    static updateStatus(db, id, status) {
        db.prepare(
            "UPDATE probe_node SET status = ?, last_heartbeat = ? WHERE id = ?"
        ).run(status, dayjs().format("YYYY-MM-DD HH:mm:ss"), id);
        return ProbeNode.getById(db, id);
    }

    static delete(db, id) {
        return db.prepare("DELETE FROM probe_node WHERE id = ?").run(id);
    }

    static findByApiKey(db, apiKey) {
        const row = db.prepare("SELECT * FROM probe_node WHERE api_key = ?").get(apiKey);
        return row ? new ProbeNode(row) : null;
    }
}

module.exports = ProbeNode;
