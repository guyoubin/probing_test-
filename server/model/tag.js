class Tag {
    constructor(row) {
        this.id = row.id;
        this.name = row.name;
        this.color = row.color;
    }

    static create(db, data) {
        const result = db
            .prepare("INSERT INTO tag (name, color) VALUES (?, ?)")
            .run(data.name, data.color || "#00F0FF");
        return Tag.getById(db, result.lastInsertRowid);
    }

    static getById(db, id) {
        const row = db.prepare("SELECT * FROM tag WHERE id = ?").get(id);
        return row ? new Tag(row) : null;
    }

    static getList(db) {
        const rows = db.prepare("SELECT * FROM tag ORDER BY name").all();
        return rows.map(r => new Tag(r));
    }

    static delete(db, id) {
        db.prepare("DELETE FROM monitor_tag WHERE tag_id = ?").run(id);
        return db.prepare("DELETE FROM tag WHERE id = ?").run(id);
    }

    static addToMonitor(db, tagId, monitorId, value) {
        db.prepare(
            "INSERT OR IGNORE INTO monitor_tag (tag_id, monitor_id, value) VALUES (?, ?, ?)"
        ).run(tagId, monitorId, value || null);
    }

    static removeFromMonitor(db, tagId, monitorId) {
        return db
            .prepare("DELETE FROM monitor_tag WHERE tag_id = ? AND monitor_id = ?")
            .run(tagId, monitorId);
    }

    static getByMonitorId(db, monitorId) {
        const rows = db
            .prepare(
                `SELECT t.*, mt.value as tag_value FROM tag t
                 INNER JOIN monitor_tag mt ON t.id = mt.tag_id
                 WHERE mt.monitor_id = ?`
            )
            .all(monitorId);
        return rows.map(r => ({ ...new Tag(r), tag_value: r.tag_value }));
    }
}

module.exports = Tag;
