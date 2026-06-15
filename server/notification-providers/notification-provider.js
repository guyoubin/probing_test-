class NotificationProvider {
    name = undefined;

    /**
     * Send a notification
     * @param {object} notification - The notification config from DB
     * @param {string} msg - The message to send
     * @param {object} monitor - The monitor that triggered this
     * @param {object} heartbeat - The heartbeat data
     */
    async send(notification, msg, monitor, heartbeat) {
        throw new Error("Must override send()");
    }
}

module.exports = { NotificationProvider };
