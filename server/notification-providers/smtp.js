let nodemailer;
try { nodemailer = require("nodemailer"); } catch(e) { nodemailer = null; }
const { NotificationProvider } = require("./notification-provider");

class SMTP extends NotificationProvider {
    name = "smtp";

    async send(notification, msg, monitor, heartbeat) {
        if (!nodemailer) {
            throw new Error("nodemailer not installed");
        }
        const config = notification.config_json ? JSON.parse(notification.config_json) : {};
        const {
            host,
            port = 587,
            secure = false,
            username,
            password,
            from,
            to,
        } = config;

        if (!host || !to) {
            throw new Error("SMTP host and to address are required");
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: username && password ? { user: username, pass: password } : undefined,
        });

        const statusEmoji = heartbeat.status === 1 ? "UP" : "DOWN";
        const subject = `[CyberProbe] ${monitor.name} - ${statusEmoji}`;

        await transporter.sendMail({
            from: from || username || "cyberprobe@localhost",
            to,
            subject,
            text: `${msg}\n\nType: ${monitor.type}\nPing: ${heartbeat.ping || "N/A"}ms\nTime: ${heartbeat.time}`,
        });
    }
}

module.exports = { SMTP };
