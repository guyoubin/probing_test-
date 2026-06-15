const { MonitorType } = require("./monitor-type");
const axios = require("axios");

class Bandwidth extends MonitorType {
    name = "bandwidth";
    layer = "L1";
    description = "带宽下载速率测试，多连接并行下载";

    async check(monitor, heartbeat, server) {
        const url = monitor.url;
        const connections = monitor.connections || 4;
        const timeout = (monitor.timeout || 30) * 1000;
        const expectedMinMbps = monitor.expected_min_mbps || null;

        try {
            const result = await this._testDownload(url, connections, timeout);

            heartbeat.status = result.success ? 1 : 0;
            heartbeat.download_rate_mbps = result.downloadRateMbps;
            heartbeat.msg = result.success
                ? `Bandwidth: ${result.downloadRateMbps.toFixed(2)} Mbps (${result.totalBytes} bytes in ${result.elapsedMs}ms, ${connections} connections)`
                : `Bandwidth test failed: ${result.error}`;
            heartbeat.raw_result_json = JSON.stringify(result);
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `Bandwidth error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    async _testDownload(url, connections, timeout) {
        const result = {
            success: false,
            downloadRateMbps: 0,
            totalBytes: 0,
            elapsedMs: 0,
            connections: [],
            error: null,
        };

        const startTotal = Date.now();

        try {
            // 多连接并行下载
            const downloadPromises = [];
            for (let i = 0; i < connections; i++) {
                downloadPromises.push(this._downloadChunk(url, timeout, i));
            }

            const results = await Promise.allSettled(downloadPromises);
            const elapsedMs = Date.now() - startTotal;

            let totalBytes = 0;
            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                if (r.status === "fulfilled" && r.value.success) {
                    totalBytes += r.value.bytes;
                    result.connections.push({
                        index: i,
                        bytes: r.value.bytes,
                        time: r.value.time,
                    });
                } else {
                    result.connections.push({
                        index: i,
                        bytes: 0,
                        error: r.status === "rejected" ? r.reason?.message : r.value.error,
                    });
                }
            }

            result.totalBytes = totalBytes;
            result.elapsedMs = elapsedMs;

            // 计算速率 (Mbps = bytes * 8 / (seconds * 1000000))
            if (elapsedMs > 0 && totalBytes > 0) {
                const seconds = elapsedMs / 1000;
                result.downloadRateMbps = (totalBytes * 8) / (seconds * 1000000);
                result.success = true;
            } else {
                result.error = "No data downloaded";
            }
        } catch (err) {
            result.error = err.message;
        }

        return result;
    }

    _downloadChunk(url, timeout, index) {
        return new Promise((resolve) => {
            const start = Date.now();
            let bytesReceived = 0;

            axios
                .get(url, {
                    timeout,
                    responseType: "stream",
                    // 添加Range头支持分块下载（如果服务器支持）
                    headers: index > 0 ? { Range: `bytes=${index * 1000000}-` } : {},
                })
                .then((response) => {
                    return new Promise((resolveInner) => {
                        const stream = response.data;
                        stream.on("data", (chunk) => {
                            bytesReceived += chunk.length;
                        });
                        stream.on("end", () => {
                            resolveInner();
                        });
                        stream.on("error", (err) => {
                            resolveInner();
                        });
                    });
                })
                .then(() => {
                    resolve({ success: true, bytes: bytesReceived, time: Date.now() - start });
                })
                .catch((err) => {
                    resolve({ success: false, bytes: 0, error: err.message });
                });
        });
    }
}

module.exports = { Bandwidth };
