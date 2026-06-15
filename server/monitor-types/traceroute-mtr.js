const { MonitorType } = require("./monitor-type");
const { execFile } = require("child_process");

class TracerouteMtr extends MonitorType {
    name = "traceroute-mtr";
    layer = "L1";
    description = "Traceroute/MTR逐跳路由测试，AS路径提取";

    async check(monitor, heartbeat, server) {
        const host = monitor.hostname;
        const count = monitor.count || 3;
        const timeout = monitor.timeout || 30;

        try {
            // 优先尝试mtr
            let result = null;
            try {
                result = await this._runMtr(host, count, timeout);
            } catch (mtrErr) {
                // mtr不可用，降级到traceroute
                result = await this._runTraceroute(host, timeout);
            }

            heartbeat.status = result.hops.length > 0 ? 1 : 0;
            heartbeat.route_hop_count = result.hops.length;
            heartbeat.route_as_path_json = JSON.stringify(result.asPath);
            heartbeat.msg = `Route to ${host}: ${result.hops.length} hops, AS path: ${result.asPath.length > 0 ? result.asPath.join(" -> ") : "N/A"}`;
            heartbeat.raw_result_json = JSON.stringify(result);
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `Traceroute/MTR error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    _runMtr(host, count, timeout) {
        return new Promise((resolve, reject) => {
            const args = ["-r", "-n", "-c", String(count), host];
            execFile("mtr", args, { timeout: (timeout + 5) * 1000 }, (err, stdout, stderr) => {
                if (err) {
                    return reject(new Error(err.message));
                }
                resolve(this._parseMtrOutput(stdout));
            });
        });
    }

    _runTraceroute(host, timeout) {
        return new Promise((resolve, reject) => {
            const args = ["-n", host];
            execFile("traceroute", args, { timeout: (timeout + 5) * 1000 }, (err, stdout, stderr) => {
                if (err && !stdout) {
                    return reject(new Error(err.message));
                }
                resolve(this._parseTracerouteOutput(stdout || ""));
            });
        });
    }

    _parseMtrOutput(output) {
        const hops = [];
        const asPath = [];
        const lines = output.split("\n");

        for (const line of lines) {
            // MTR report格式: "  1.|-- 192.168.1.1    0.0%     5    1.2   1.5   1.0   2.0   0.3"
            const match = line.match(/^\s*(\d+)\.\|[-\s]+(\S+)\s+([\d.]+)%\s+\d+\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
            if (match) {
                const ip = match[2];
                if (ip !== "???") {
                    const hop = {
                        hop: parseInt(match[1]),
                        ip,
                        loss: parseFloat(match[3]),
                        avg: parseFloat(match[5]),
                        best: parseFloat(match[6]),
                        worst: parseFloat(match[7]),
                    };
                    hops.push(hop);

                    // 尝试提取AS号（从IP或注释中）
                    const asNum = this._extractAS(line);
                    if (asNum) {
                        asPath.push(asNum);
                    }
                }
            }
        }

        return { tool: "mtr", hops, asPath };
    }

    _parseTracerouteOutput(output) {
        const hops = [];
        const asPath = [];
        const lines = output.split("\n");

        for (const line of lines) {
            // traceroute格式: " 1  192.168.1.1  1.234 ms  1.567 ms  1.890 ms"
            const match = line.match(/^\s*(\d+)\s+(\S+)/);
            if (match) {
                const hopNum = parseInt(match[1]);
                const ip = match[2];
                if (ip !== "*" && !ip.startsWith("(")) {
                    const latencies = [];
                    const latMatch = line.matchAll(/([\d.]+)\s*ms/g);
                    for (const m of latMatch) {
                        latencies.push(parseFloat(m[1]));
                    }
                    const avg = latencies.length > 0
                        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                        : null;

                    hops.push({ hop: hopNum, ip, avg, latencies });

                    const asNum = this._extractAS(line);
                    if (asNum) {
                        asPath.push(asNum);
                    }
                }
            }
        }

        return { tool: "traceroute", hops, asPath };
    }

    _extractAS(line) {
        // 尝试从输出中提取AS号 (ASxxxx或[ASxxxx])
        const match = line.match(/\[?AS(\d+)\]?/i) || line.match(/AS(\d+)/i);
        return match ? `AS${match[1]}` : null;
    }
}

module.exports = { TracerouteMtr };
