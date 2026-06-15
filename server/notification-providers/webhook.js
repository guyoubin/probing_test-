const axios = require("axios");
const { NotificationProvider } = require("./notification-provider");

class Webhook extends NotificationProvider {
    name = "webhook";

    async send(notification, msg, monitor, heartbeat) {
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const url = config.url;
        if (!url) {
            throw new Error("Webhook URL is not configured");
        }

        const payload = {
            text: msg,
            monitor: {
                id: monitor.id,
                name: monitor.name,
                type: monitor.type,
            },
            heartbeat: {
                status: heartbeat.status,
                ping: heartbeat.ping,
                msg: heartbeat.msg,
                time: heartbeat.time,
            },
        };

        await axios.post(url, payload, {
            headers: config.headers || { "Content-Type": "application/json" },
            timeout: config.timeout || 10000,
        });
    }
}

module.exports = { Webhook };
