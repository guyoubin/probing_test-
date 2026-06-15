const axios = require("axios");
const { NotificationProvider } = require("./notification-provider");

class WeCom extends NotificationProvider {
    name = "wecom";

    async send(notification, msg, monitor, heartbeat) {
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const url = config.webhookUrl;
        if (!url) {
            throw new Error("WeCom webhook URL is not configured");
        }

        const statusEmoji = heartbeat.status === 1 ? "UP" : "DOWN";
        const payload = {
            msgtype: "markdown",
            markdown: {
                content: `**[CyberProbe] ${monitor.name} - ${statusEmoji}**\n${msg}\n> Type: ${monitor.type} | Ping: ${heartbeat.ping || "N/A"}ms | Time: ${heartbeat.time}`,
            },
        };

        await axios.post(url, payload, {
            timeout: 10000,
        });
    }
}

module.exports = { WeCom };
