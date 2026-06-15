const { MonitorType } = require("./monitor-type");
const dns = require("dns");

class DnsResolve extends MonitorType {
    name = "dns-resolve";
    layer = "L1";
    description = "DNS解析延迟、多DNS服务器一致性测试";

    async check(monitor, heartbeat, server) {
        const hostname = monitor.hostname;
        const dnsType = monitor.dns_type || "A";
        const timeout = (monitor.timeout || 5) * 1000;
        const referenceServers = ["8.8.8.8", "1.1.1.1", "223.5.5.5"];

        try {
            // 首先使用默认DNS解析
            const primaryStart = Date.now();
            const primaryResult = await this._resolve(hostname, dnsType, timeout);
            const primaryTime = Date.now() - primaryStart;

            // 多DNS服务器对比
            const serverResults = {};
            for (const ns of referenceServers) {
                try {
                    const s = Date.now();
                    const result = await this._resolveWithServer(hostname, dnsType, ns, timeout);
                    const elapsed = Date.now() - s;
                    serverResults[ns] = { success: true, time: elapsed, addresses: this._normalizeAddresses(result) };
                } catch (err) {
                    serverResults[ns] = { success: false, time: null, error: err.message };
                }
            }

            // 检查一致性
            const successfulServers = Object.entries(serverResults).filter(([, v]) => v.success);
            const addressSets = successfulServers.map(([, v]) => v.addresses);
            const consistent = this._checkConsistency(addressSets);

            heartbeat.status = primaryResult ? 1 : 0;
            heartbeat.ping = primaryTime;
            heartbeat.dns_consistency = consistent;
            heartbeat.msg = primaryResult
                ? `DNS ${hostname}: ${primaryTime}ms, consistency=${consistent ? "OK" : "MISMATCH"}`
                : `DNS resolve failed for ${hostname}`;
            heartbeat.raw_result_json = JSON.stringify({
                hostname,
                dns_type: dnsType,
                primary_time: primaryTime,
                primary_addresses: this._normalizeAddresses(primaryResult),
                server_results: serverResults,
                dns_consistency: consistent,
            });
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `DNS resolve error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    _resolve(hostname, type, timeout) {
        const resolver = new dns.promises.Resolver();
        resolver.setServers(undefined); // use system default
        return Promise.race([
            resolver.resolve(hostname, type),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)),
        ]);
    }

    _resolveWithServer(hostname, type, server, timeout) {
        const resolver = new dns.promises.Resolver();
        resolver.setServers([server]);
        return Promise.race([
            resolver.resolve(hostname, type),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)),
        ]);
    }

    _normalizeAddresses(result) {
        if (!result) return [];
        const arr = Array.isArray(result) ? result : [result];
        return arr.map(String).sort();
    }

    _checkConsistency(addressSets) {
        if (addressSets.length <= 1) return true;
        const first = addressSets[0].join(",");
        return addressSets.every((s) => s.join(",") === first);
    }
}

module.exports = { DnsResolve };
