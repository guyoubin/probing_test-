const { MonitorType } = require("./monitor-type");
const net = require("net");

class TcpConnect extends MonitorType {
    name = "tcp-connect";
    layer = "L1";
    description = "TCP连接延迟、丢包率、P90/P99统计测试";

    async check(monitor, heartbeat, server) {
        const host = monitor.hostname;
        const port = monitor.port;
        const count = monitor.count || 5;
        const timeout = (monitor.timeout || 5) * 1000;

        try {
            const results = [];

            for (let i = 0; i < count; i++) {
                const r = await this._connect(host, port, timeout);
                results.push(r);
            }

            const successResults = results.filter((r) => r.success);
            const failCount = results.length - successResults.length;
            const packetLoss = (failCount / results.length) * 100;

            const latencies = successResults.map((r) => r.time);
            const avg = latencies.length > 0
                ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                : null;
            const p90 = latencies.length > 0 ? this._percentile(latencies, 90) : null;
            const p99 = latencies.length > 0 ? this._percentile(latencies, 99) : null;

            heartbeat.status = packetLoss >= 100 ? 0 : 1;
            heartbeat.ping = Math.round(avg);
            heartbeat.packet_loss_rate = parseFloat(packetLoss.toFixed(2));
            heartbeat.msg = packetLoss >= 100
                ? `TCP connect to ${host}:${port} failed: 100% packet loss`
                : `TCP ${host}:${port}: avg=${Math.round(avg)}ms, p90=${p90}ms, p99=${p99}ms, loss=${packetLoss.toFixed(1)}%`;
            heartbeat.raw_result_json = JSON.stringify({
                results,
                avg,
                p90,
                p99,
                packet_loss: packetLoss,
            });
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `TCP connect error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    _connect(host, port, timeout) {
        return new Promise((resolve) => {
            const start = Date.now();
            const socket = net.createConnection({ host, port }, () => {
                const elapsed = Date.now() - start;
                socket.destroy();
                resolve({ success: true, time: elapsed });
            });
            socket.setTimeout(timeout, () => {
                socket.destroy();
                resolve({ success: false, time: null, error: "timeout" });
            });
            socket.on("error", (err) => {
                socket.destroy();
                resolve({ success: false, time: null, error: err.message });
            });
        });
    }

    _percentile(arr, p) {
        if (arr.length === 0) return null;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return Math.round(sorted[Math.max(0, idx)]);
    }
}

module.exports = { TcpConnect };
