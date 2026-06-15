const dayjs = require("dayjs");
const Database = require("../database");
const Heartbeat = require("./heartbeat");

const UP = 1;
const DOWN = 0;
const PENDING = 2;

class Monitor {
    constructor(row) {
        this.id = row.id;
        this.user_id = row.user_id;
        this.name = row.name;
        this.description = row.description;
        this.type = row.type;
        this.layer = row.layer;
        this.active = row.active;
        this.interval = row.interval;
        this.retry_interval = row.retry_interval;
        this.max_retries = row.max_retries;
        this.resend_interval = row.resend_interval;
        this.parent = row.parent;
        this.hostname = row.hostname;
        this.port = row.port;
        this.url = row.url;
        this.method = row.method;
        this.headers_json = row.headers_json;
        this.body = row.body;
        this.dns_resolve_type = row.dns_resolve_type;
        this.dns_resolve_server = row.dns_resolve_server;
        this.timeout = row.timeout;
        this.api_key = row.api_key;
        this.api_model = row.api_model;
        this.stream_prompt = row.stream_prompt;
        this.max_hops = row.max_hops;
        this.bandwidth_duration = row.bandwidth_duration;
        this.bandwidth_connections = row.bandwidth_connections;
        this.accepted_statuscodes_json = row.accepted_statuscodes_json;
        this.upside_down = row.upside_down;
        this.packet_size = row.packet_size;
        this.ping_count = row.ping_count;
        this.cert_expiry_notification = row.cert_expiry_notification;
        this.domain_expiry_notification = row.domain_expiry_notification;
        this.assigned_node_ids_json = row.assigned_node_ids_json;
        this.created_at = row.created_at;
        this.updated_at = row.updated_at;

        // Runtime state
        this.beatTimerId = null;
        this.io = null;
        this.retries = 0;
    }

    start(io) {
        this.io = io;
        if (!this.active) {
            return;
        }
        this.retries = 0;
        const intervalMs = this.interval * 1000;
        this.beatTimerId = setTimeout(() => this._beatLoop(), intervalMs);
    }

    stop() {
        if (this.beatTimerId) {
            clearTimeout(this.beatTimerId);
            this.beatTimerId = null;
        }
    }

    async _beatLoop() {
        await this.beat();
        if (this.beatTimerId !== null && this.active) {
            let nextInterval;
            if (this.retries > 0 && this.retries <= this.max_retries) {
                nextInterval = this.retry_interval * 1000;
            } else {
                nextInterval = this.interval * 1000;
            }
            this.beatTimerId = setTimeout(() => this._beatLoop(), nextInterval);
        }
    }

    async beat() {
        const CyberProbeServer = require("../cyberprobe-server");
        const server = CyberProbeServer.getInstance();
        const monitorType = server.monitorTypeList[this.type];

        if (!monitorType) {
            const hb = {
                monitor_id: this.id,
                status: DOWN,
                time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                msg: `Unknown monitor type: ${this.type}`,
                ping: 0,
                retries: this.retries,
            };
            Heartbeat.create(Database.db, hb);
            if (this.io) {
                this.io.to(`monitor:${this.id}`).emit("heartbeat", hb);
            }
            return;
        }

        try {
            const result = await monitorType.check(this);
            const status = result.status !== undefined ? result.status : UP;
            const effectiveStatus = this.upside_down ? (status === UP ? DOWN : UP) : status;

            if (effectiveStatus === DOWN && this.retries < this.max_retries) {
                this.retries++;
            } else if (effectiveStatus === UP) {
                this.retries = 0;
            }

            const hb = {
                monitor_id: this.id,
                status: effectiveStatus,
                time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                end_time: result.end_time ? dayjs(result.end_time).format("YYYY-MM-DD HH:mm:ss") : null,
                ping: result.ping || 0,
                msg: result.msg || "",
                important: result.important || 0,
                down_count: result.down_count || 0,
                retries: this.retries,
                probe_node_id: result.probe_node_id || null,
                ttfb_ms: result.ttfb_ms || null,
                ttlb_ms: result.ttlb_ms || null,
                ttft_ms: result.ttft_ms || null,
                tokens_per_second: result.tokens_per_second || null,
                packet_loss_rate: result.packet_loss_rate || null,
                jitter_ms: result.jitter_ms || null,
                cert_days_remaining: result.cert_days_remaining || null,
                dns_consistency: result.dns_consistency || null,
                route_hop_count: result.route_hop_count || null,
                route_as_path_json: result.route_as_path_json ? JSON.stringify(result.route_as_path_json) : null,
                download_rate_mbps: result.download_rate_mbps || null,
                business_pass_rate: result.business_pass_rate || null,
                composite_score: result.composite_score || null,
                raw_result_json: result.raw_result ? JSON.stringify(result.raw_result) : null,
            };

            Heartbeat.create(Database.db, hb);

            if (this.io) {
                this.io.to(`monitor:${this.id}`).emit("heartbeat", hb);
            }
        } catch (err) {
            this.retries++;
            const hb = {
                monitor_id: this.id,
                status: DOWN,
                time: dayjs().format("YYYY-MM-DD HH:mm:ss"),
                msg: err.message || "Check failed",
                ping: 0,
                retries: this.retries,
            };
            Heartbeat.create(Database.db, hb);
            if (this.io) {
                this.io.to(`monitor:${this.id}`).emit("heartbeat", hb);
            }
        }
    }

    static getMonitorList(db, userId) {
        const rows = db.prepare("SELECT * FROM monitor WHERE user_id = ?").all(userId);
        return rows.map((r) => new Monitor(r));
    }

    static create(db, data) {
        const result = db
            .prepare(
                `INSERT INTO monitor (
                    user_id, name, description, type, layer, active, interval,
                    retry_interval, max_retries, resend_interval, parent,
                    hostname, port, url, method, headers_json, body,
                    dns_resolve_type, dns_resolve_server, timeout,
                    api_key, api_model, stream_prompt, max_hops,
                    bandwidth_duration, bandwidth_connections,
                    accepted_statuscodes_json, upside_down, packet_size,
                    ping_count, cert_expiry_notification, domain_expiry_notification,
                    assigned_node_ids_json, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?
                )`
            )
            .run(
                data.user_id,
                data.name,
                data.description || null,
                data.type,
                data.layer || null,
                data.active !== undefined ? data.active : 1,
                data.interval || 60,
                data.retry_interval || 60,
                data.max_retries || 3,
                data.resend_interval || 0,
                data.parent || null,
                data.hostname || null,
                data.port || null,
                data.url || null,
                data.method || "GET",
                data.headers_json || null,
                data.body || null,
                data.dns_resolve_type || "A",
                data.dns_resolve_server || null,
                data.timeout || 5000,
                data.api_key || null,
                data.api_model || null,
                data.stream_prompt || null,
                data.max_hops || 30,
                data.bandwidth_duration || 10,
                data.bandwidth_connections || 4,
                data.accepted_statuscodes_json || null,
                data.upside_down || 0,
                data.packet_size || 64,
                data.ping_count || 10,
                data.cert_expiry_notification !== undefined ? data.cert_expiry_notification : 1,
                data.domain_expiry_notification || 0,
                data.assigned_node_ids_json || null,
                dayjs().format("YYYY-MM-DD HH:mm:ss"),
                dayjs().format("YYYY-MM-DD HH:mm:ss")
            );
        return Monitor.findById(db, result.lastInsertRowid);
    }

    static findById(db, id) {
        const row = db.prepare("SELECT * FROM monitor WHERE id = ?").get(id);
        return row ? new Monitor(row) : null;
    }

    static update(db, id, data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            "name", "description", "type", "layer", "active", "interval",
            "retry_interval", "max_retries", "resend_interval", "parent",
            "hostname", "port", "url", "method", "headers_json", "body",
            "dns_resolve_type", "dns_resolve_server", "timeout",
            "api_key", "api_model", "stream_prompt", "max_hops",
            "bandwidth_duration", "bandwidth_connections",
            "accepted_statuscodes_json", "upside_down", "packet_size",
            "ping_count", "cert_expiry_notification", "domain_expiry_notification",
            "assigned_node_ids_json",
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) {
            return Monitor.findById(db, id);
        }

        fields.push("updated_at = ?");
        values.push(dayjs().format("YYYY-MM-DD HH:mm:ss"));
        values.push(id);

        db.prepare(`UPDATE monitor SET ${fields.join(", ")} WHERE id = ?`).run(...values);
        return Monitor.findById(db, id);
    }

    static delete(db, id) {
        return db.prepare("DELETE FROM monitor WHERE id = ?").run(id);
    }
}

Monitor.UP = UP;
Monitor.DOWN = DOWN;
Monitor.PENDING = PENDING;

module.exports = Monitor;
