const dayjs = require("dayjs");
const Database = require("../database");

const providers = {};

class Notification {
    constructor(row) {
        this.id = row.id;
        this.user_id = row.user_id;
        this.name = row.name;
        this.type = row.type;
        this.config_json = row.config_json;
        this.is_default = row.is_default;
        this.active = row.active;
    }

    /**
     * Register all built-in notification providers
     */
    static init() {
        const providerModules = [
            require("../notification-providers/webhook"),
            require("../notification-providers/feishu"),
            require("../notification-providers/dingding"),
            require("../notification-providers/wecom"),
            require("../notification-providers/telegram"),
            require("../notification-providers/smtp"),
            require("../notification-providers/slack"),
            require("../notification-providers/discord"),
        ];

        for (const mod of providerModules) {
            const instance = Object.values(mod)[0];
            if (instance && instance.name) {
                providers[instance.name] = new instance.constructor();
            }
        }

        // Re-instantiate properly
        for (const mod of providerModules) {
            const keys = Object.keys(mod);
            for (const key of keys) {
                const ProviderClass = mod[key];
                if (ProviderClass && ProviderClass.prototype && ProviderClass.prototype.send) {
                    const inst = new ProviderClass();
                    if (inst.name) {
                        providers[inst.name] = inst;
                    }
                }
            }
        }

        console.log(`Notification providers registered: ${Object.keys(providers).join(", ")}`);
    }

    /**
     * Send notification via the appropriate provider
     * @param {object} notification - Notification record from DB
     * @param {string} msg - Message to send
     * @param {object} monitor - Monitor that triggered the notification
     * @param {object} heartbeat - Heartbeat data
     */
    static async send(notification, msg, monitor, heartbeat) {
        const provider = providers[notification.type];
        if (!provider) {
            throw new Error(`Unknown notification type: ${notification.type}`);
        }
        await provider.send(notification, msg, monitor, heartbeat);
    }

    /**
     * Create a new notification config
     */
    static create(db, data) {
        const result = db
            .prepare(
                `INSERT INTO notification (user_id, name, type, config_json, is_default, active)
                 VALUES (?, ?, ?, ?, ?, ?)`
            )
            .run(
                data.user_id,
                data.name,
                data.type,
                data.config_json ? (typeof data.config_json === "string" ? data.config_json : JSON.stringify(data.config_json)) : null,
                data.is_default || 0,
                data.active !== undefined ? data.active : 1
            );
        return Notification.getById(db, result.lastInsertRowid);
    }

    /**
     * Get a notification by ID
     */
    static getById(db, id) {
        const row = db.prepare("SELECT * FROM notification WHERE id = ?").get(id);
        return row ? new Notification(row) : null;
    }

    /**
     * Get all notifications for a user
     */
    static getList(db, userId) {
        const rows = db.prepare("SELECT * FROM notification WHERE user_id = ?").all(userId);
        return rows.map(r => new Notification(r));
    }

    /**
     * Get notifications associated with a monitor (via monitor_notification join table)
     */
    static getByMonitorId(db, monitorId) {
        const rows = db
            .prepare(
                `SELECT n.* FROM notification n
                 INNER JOIN monitor_notification mn ON n.id = mn.notification_id
                 WHERE mn.monitor_id = ?`
            )
            .all(monitorId);
        return rows.map(r => new Notification(r));
    }

    /**
     * Link a notification to a monitor
     */
    static addToMonitor(db, monitorId, notificationId) {
        db.prepare(
            "INSERT OR IGNORE INTO monitor_notification (monitor_id, notification_id) VALUES (?, ?)"
        ).run(monitorId, notificationId);
    }

    /**
     * Unlink a notification from a monitor
     */
    static removeFromMonitor(db, monitorId, notificationId) {
        db.prepare(
            "DELETE FROM monitor_notification WHERE monitor_id = ? AND notification_id = ?"
        ).run(monitorId, notificationId);
    }

    /**
     * Delete a notification
     */
    static delete(db, id) {
        db.prepare("DELETE FROM monitor_notification WHERE notification_id = ?").run(id);
        return db.prepare("DELETE FROM notification WHERE id = ?").run(id);
    }
}

module.exports = Notification;
