const dayjs = require("dayjs");

class Heartbeat {
    constructor(row) {
        this.id = row.id;
        this.monitor_id = row.monitor_id;
        this.status = row.status;
        this.time = row.time;
        this.end_time = row.end_time;
        this.ping = row.ping;
        this.msg = row.msg;
        this.important = row.important;
        this.down_count = row.down_count;
        this.retries = row.retries;
        this.probe_node_id = row.probe_node_id;
        this.ttfb_ms = row.ttfb_ms;
        this.ttlb_ms = row.ttlb_ms;
        this.ttft_ms = row.ttft_ms;
        this.tokens_per_second = row.tokens_per_second;
        this.packet_loss_rate = row.packet_loss_rate;
        this.jitter_ms = row.jitter_ms;
        this.cert_days_remaining = row.cert_days_remaining;
        this.dns_consistency = row.dns_consistency;
        this.route_hop_count = row.route_hop_count;
        this.route_as_path_json = row.route_as_path_json;
        this.download_rate_mbps = row.download_rate_mbps;
        this.business_pass_rate = row.business_pass_rate;
        this.composite_score = row.composite_score;
        this.raw_result_json = row.raw_result_json;
    }

    static create(db, data) {
        const result = db
            .prepare(
                `INSERT INTO heartbeat (
                    monitor_id, status, time, end_time, ping, msg, important,
                    down_count, retries, probe_node_id, ttfb_ms, ttlb_ms, ttft_ms,
                    tokens_per_second, packet_loss_rate, jitter_ms,
                    cert_days_remaining, dns_consistency, route_hop_count,
                    route_as_path_json, download_rate_mbps, business_pass_rate,
                    composite_score, raw_result_json
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?
                )`
            )
            .run(
                data.monitor_id,
                data.status !== undefined ? data.status : 0,
                data.time || dayjs().format("YYYY-MM-DD HH:mm:ss"),
                data.end_time || null,
                data.ping || null,
                data.msg || null,
                data.important || 0,
                data.down_count || 0,
                data.retries || 0,
                data.probe_node_id || null,
                data.ttfb_ms || null,
                data.ttlb_ms || null,
                data.ttft_ms || null,
                data.tokens_per_second || null,
                data.packet_loss_rate || null,
                data.jitter_ms || null,
                data.cert_days_remaining || null,
                data.dns_consistency || null,
                data.route_hop_count || null,
                data.route_as_path_json || null,
                data.download_rate_mbps || null,
                data.business_pass_rate || null,
                data.composite_score || null,
                data.raw_result_json || null
            );
        return result.lastInsertRowid;
    }

    static getByMonitorId(db, monitorId, limit = 100) {
        const rows = db
            .prepare(
                "SELECT * FROM heartbeat WHERE monitor_id = ? ORDER BY time DESC LIMIT ?"
            )
            .all(monitorId, limit);
        return rows.map((r) => new Heartbeat(r));
    }

    static getRecentByMonitorIds(db, monitorIds, hours = 24) {
        if (!monitorIds || monitorIds.length === 0) {
            return [];
        }
        const since = dayjs().subtract(hours, "hour").format("YYYY-MM-DD HH:mm:ss");
        const placeholders = monitorIds.map(() => "?").join(",");
        const rows = db
            .prepare(
                `SELECT * FROM heartbeat WHERE monitor_id IN (${placeholders}) AND time >= ? ORDER BY time DESC`
            )
            .bind(...monitorIds, since)
            .all();
        return rows.map((r) => new Heartbeat(r));
    }
}

module.exports = Heartbeat;
