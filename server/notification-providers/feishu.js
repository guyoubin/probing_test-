const axios = require("axios");
const { NotificationProvider } = require("./notification-provider");

class Feishu extends NotificationProvider {
    name = "feishu";

    async send(notification, msg, monitor, heartbeat) {
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const url = config.webhookUrl;
        if (!url) {
            throw new Error("Feishu webhook URL is not configured");
        }

        const statusEmoji = heartbeat.status === 1 ? "UP" : "DOWN";
        const payload = {
            msg_type: "interactive",
            card: {
                header: {
                    title: {
                        tag: "plain_text",
                        content: `[CyberProbe] ${monitor.name} - ${statusEmoji}`,
                    },
                    template: heartbeat.status === 1 ? "green" : "red",
                },
                elements: [
                    {
                        tag: "div",
                        text: {
                            tag: "plain_text",
                            content: msg,
                        },
                    },
                    {
                        tag: "div",
                        text: {
                            tag: "plain_text",
                            content: `Type: ${monitor.type} | Ping: ${heartbeat.ping || "N/A"}ms | Time: ${heartbeat.time}`,
                        },
                    },
                ],
            },
        };

        await axios.post(url, payload, {
            timeout: 10000,
        });
    }
}

module.exports = { Feishu };
