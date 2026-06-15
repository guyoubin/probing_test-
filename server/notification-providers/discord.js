const axios = require("axios");
const { NotificationProvider } = require("./notification-provider");

class Discord extends NotificationProvider {
    name = "discord";

    async send(notification, msg, monitor, heartbeat) {
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const url = config.webhookUrl;
        if (!url) {
            throw new Error("Discord webhook URL is not configured");
        }

        const color = heartbeat.status === 1 ? 0x00FF00 : 0xFF0000;
        const statusText = heartbeat.status === 1 ? "UP" : "DOWN";

        const payload = {
            username: "CyberProbe",
            embeds: [
                {
                    title: `${monitor.name} - ${statusText}`,
                    description: msg,
                    color,
                    fields: [
                        {
                            name: "Type",
                            value: monitor.type,
                            inline: true,
                        },
                        {
                            name: "Ping",
                            value: `${heartbeat.ping || "N/A"}ms`,
                            inline: true,
                        },
                        {
                            name: "Time",
                            value: heartbeat.time,
                            inline: true,
                        },
                    ],
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        await axios.post(url, payload, {
            timeout: 10000,
        });
    }
}

module.exports = { Discord };
