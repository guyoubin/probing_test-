const dayjs = require("dayjs");

class Report {
    constructor(row) {
        this.id = row.id;
        this.user_id = row.user_id;
        this.name = row.name;
        this.suite_type = row.suite_type;
        this.monitor_ids_json = row.monitor_ids_json;
        this.node_ids_json = row.node_ids_json;
        this.start_time = row.start_time;
        this.end_time = row.end_time;
        this.status = row.status;
        this.format = row.format;
        this.file_path = row.file_path;
        this.composite_score = row.composite_score;
        this.summary_json = row.summary_json;
        this.created_at = row.created_at;
    }

    static create(db, data) {
        const result = db
            .prepare(
                `INSERT INTO report (user_id, name, suite_type, monitor_ids_json, node_ids_json,
                 start_time, end_time, status, format, file_path, composite_score, summary_json, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                data.user_id,
                data.name || null,
                data.suite_type || null,
                data.monitor_ids_json ? (typeof data.monitor_ids_json === "string" ? data.monitor_ids_json : JSON.stringify(data.monitor_ids_json)) : null,
                data.node_ids_json ? (typeof data.node_ids_json === "string" ? data.node_ids_json : JSON.stringify(data.node_ids_json)) : null,
                data.start_time || null,
                data.end_time || null,
                data.status || "generating",
                data.format || "html",
                data.file_path || null,
                data.composite_score || null,
                data.summary_json ? (typeof data.summary_json === "string" ? data.summary_json : JSON.stringify(data.summary_json)) : null,
                dayjs().format("YYYY-MM-DD HH:mm:ss")
            );
        return Report.getById(db, result.lastInsertRowid);
    }

    static getById(db, id) {
        const row = db.prepare("SELECT * FROM report WHERE id = ?").get(id);
        return row ? new Report(row) : null;
    }

    static getList(db, userId) {
        const rows = db
            .prepare("SELECT * FROM report WHERE user_id = ? ORDER BY created_at DESC")
            .all(userId);
        return rows.map(r => new Report(r));
    }

    static update(db, id, data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            "name", "status", "file_path", "composite_score", "summary_json", "end_time",
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) {
            return Report.getById(db, id);
        }

        values.push(id);
        db.prepare(`UPDATE report SET ${fields.join(", ")} WHERE id = ?`).run(...values);
        return Report.getById(db, id);
    }

    static delete(db, id) {
        return db.prepare("DELETE FROM report WHERE id = ?").run(id);
    }
}

module.exports = Report;
