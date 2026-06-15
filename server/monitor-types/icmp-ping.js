const { MonitorType } = require("./monitor-type");
const { execFile } = require("child_process");
const net = require("net");

class IcmpPing extends MonitorType {
    name = "icmp-ping";
    layer = "L1";
    description = "ICMP Ping 延迟、丢包率、抖动测试";

    async check(monitor, heartbeat, server) {
        const host = monitor.hostname;
        const count = monitor.count || 5;
        const timeout = monitor.timeout || 10;

        try {
            const result = await this._ping(host, count, timeout);
            heartbeat.status = result.packet_loss >= 100 ? 0 : 1;
            heartbeat.ping = result.rtt_avg;
            heartbeat.packet_loss_rate = result.packet_loss;
            heartbeat.jitter_ms = result.jitter;
            heartbeat.msg = result.packet_loss >= 100
                ? `Ping failed: 100% packet loss to ${host}`
                : `Ping ${host}: avg=${result.rtt_avg}ms, loss=${result.packet_loss}%, jitter=${result.jitter}ms`;
            heartbeat.raw_result_json = JSON.stringify(result);
        } catch (err) {
            // 降级策略：使用TCP连接
            try {
                const tcpResult = await this._tcpFallback(host, monitor.port || 80, timeout);
                heartbeat.status = tcpResult.success ? 1 : 0;
                heartbeat.ping = tcpResult.time;
                heartbeat.packet_loss_rate = tcpResult.success ? 0 : 100;
                heartbeat.jitter_ms = 0;
                heartbeat.msg = `Ping unavailable, TCP fallback to ${host}:${monitor.port || 80}: ${tcpResult.time}ms`;
                heartbeat.raw_result_json = JSON.stringify({ fallback: "tcp", ...tcpResult });
            } catch (tcpErr) {
                heartbeat.status = 0;
                heartbeat.msg = `Ping and TCP fallback both failed: ${err.message}`;
                heartbeat.raw_result_json = JSON.stringify({ error: err.message, tcpError: tcpErr.message });
            }
        }
    }

    _ping(host, count, timeout) {
        return new Promise((resolve, reject) => {
            const args = ["-c", String(count), "-W", String(timeout), host];
            execFile("ping", args, { timeout: (timeout + 2) * 1000 }, (err, stdout, stderr) => {
                if (err && !stdout) {
                    return reject(new Error(err.message));
                }
                const result = this._parsePingOutput(stdout);
                resolve(result);
            });
        });
    }

    _parsePingOutput(output) {
        const result = {
            rtt_min: null,
            rtt_avg: null,
            rtt_max: null,
            rtt_mdev: null,
            packet_loss: 0,
            jitter: 0,
        };

        // 解析丢包率
        const lossMatch = output.match(/(\d+(?:\.\d+)?)\s*%\s*packet loss/);
        if (lossMatch) {
            result.packet_loss = parseFloat(lossMatch[1]);
        }

        // 解析RTT统计 (Linux格式: min/avg/max/mdev)
        const rttMatch = output.match(
            /rtt\s+(?:min\/avg\/max\/mdev|min\/avg\/max\/stddev)\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)/
        );
        if (rttMatch) {
            result.rtt_min = parseFloat(rttMatch[1]);
            result.rtt_avg = parseFloat(rttMatch[2]);
            result.rtt_max = parseFloat(rttMatch[3]);
            result.rtt_mdev = parseFloat(rttMatch[4]);
            result.jitter = result.rtt_mdev;
        }

        return result;
    }

    _tcpFallback(host, port, timeout) {
        return new Promise((resolve) => {
            const start = Date.now();
            const socket = net.createConnection({ host, port }, () => {
                const elapsed = Date.now() - start;
                socket.destroy();
                resolve({ success: true, time: elapsed });
            });
            socket.setTimeout((timeout || 5) * 1000, () => {
                socket.destroy();
                resolve({ success: false, time: null });
            });
            socket.on("error", () => {
                socket.destroy();
                resolve({ success: false, time: null });
            });
        });
    }
}

module.exports = { IcmpPing };
