const axios = require("axios");
const { NotificationProvider } = require("./notification-provider");

class Telegram extends NotificationProvider {
    name = "telegram";

    async send(notification, msg, monitor, heartbeat) {
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const botToken = config.botToken;
        const chatId = config.chatId;
        if (!botToken || !chatId) {
            throw new Error("Telegram botToken and chatId are required");
        }

        const statusEmoji = heartbeat.status === 1 ? "UP" : "DOWN";
        const text = `*[CyberProbe] ${monitor.name} - ${statusEmoji}*\n${msg}\nType: ${monitor.type} | Ping: ${heartbeat.ping || "N/A"}ms | Time: ${heartbeat.time}`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
        }, {
            timeout: 10000,
        });
    }
}

module.exports = { Telegram };
