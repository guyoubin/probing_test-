const axios = require("axios");
const { NotificationProvider } = require("./notification-provider");

class Slack extends NotificationProvider {
    name = "slack";

    async send(notification, msg, monitor, heartbeat) {
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const url = config.webhookUrl;
        if (!url) {
            throw new Error("Slack webhook URL is not configured");
        }

        const statusEmoji = heartbeat.status === 1 ? ":large_green_circle:" : ":red_circle:";
        const statusText = heartbeat.status === 1 ? "UP" : "DOWN";

        const payload = {
            text: `${statusEmoji} [CyberProbe] ${monitor.name} - ${statusText}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: `${statusEmoji} ${monitor.name} - ${statusText}`,
                    },
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: msg,
                    },
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Type: \`${monitor.type}\` | Ping: \`${heartbeat.ping || "N/A"}ms\` | Time: ${heartbeat.time}`,
                        },
                    ],
                },
            ],
        };

        await axios.post(url, payload, {
            timeout: 10000,
        });
    }
}

module.exports = { Slack };
