const scoreWeights = require("./score-weights");

class ScoreEngine {
    /**
     * Calculate a composite score (0-100) for a heartbeat result
     * @param {object} heartbeat - The heartbeat record
     * @param {object} monitor - The monitor configuration
     * @returns {number} Score from 0 to 100
     */
    static calculate(heartbeat, monitor) {
        const type = monitor.type;
        const weights = scoreWeights[type];

        if (!weights) {
            // Fallback: simple up/down scoring
            return heartbeat.status === 1 ? 100 : 0;
        }

        const subscores = ScoreEngine._calculateSubscores(heartbeat, monitor, weights);
        let total = 0;
        for (const [key, weight] of Object.entries(weights)) {
            total += (subscores[key] || 0) * weight;
        }
        return Math.round(Math.max(0, Math.min(100, total)));
    }

    /**
     * Calculate individual subscores based on monitor type weights
     */
    static _calculateSubscores(heartbeat, monitor, weights) {
        const subscores = {};

        switch (monitor.type) {
            case "icmp-ping":
                subscores.packet_loss = ScoreEngine._scoreInverse(heartbeat.packet_loss_rate, 0, 100);
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ping, 500);
                subscores.jitter = ScoreEngine._scoreInverse(heartbeat.jitter_ms, 0, 100);
                break;

            case "tcp-connect":
                subscores.success_rate = heartbeat.status === 1 ? 100 : 0;
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ping, 1000);
                subscores.p99 = ScoreEngine._scoreLatency(heartbeat.ping ? heartbeat.ping * 1.5 : null, 2000);
                break;

            case "dns-resolve":
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ping, 200);
                subscores.consistency = heartbeat.dns_consistency !== null
                    ? heartbeat.dns_consistency * 100
                    : 50;
                subscores.dnssec = heartbeat.cert_days_remaining !== null ? 80 : 50;
                break;

            case "tls-handshake":
                subscores.cert_valid = heartbeat.cert_days_remaining !== null
                    ? (heartbeat.cert_days_remaining > 30 ? 100 : heartbeat.cert_days_remaining / 30 * 100)
                    : (heartbeat.status === 1 ? 100 : 0);
                subscores.protocol = heartbeat.status === 1 ? 90 : 30;
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ping, 500);
                break;

            case "http-api":
                subscores.status_code = heartbeat.status === 1 ? 100 : 0;
                subscores.ttfb = ScoreEngine._scoreLatency(heartbeat.ttfb_ms, 2000);
                subscores.ttlb = ScoreEngine._scoreLatency(heartbeat.ttlb_ms, 5000);
                subscores.content = heartbeat.status === 1 ? 85 : 0;
                break;

            case "sse-streaming":
                subscores.ttft = ScoreEngine._scoreLatency(heartbeat.ttft_ms, 3000);
                subscores.tps = heartbeat.tokens_per_second
                    ? Math.min(100, (heartbeat.tokens_per_second / 50) * 100)
                    : 0;
                subscores.completion = heartbeat.status === 1 ? 100 : 0;
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ttlb_ms, 10000);
                break;

            case "traceroute-mtr":
                subscores.hop_count = heartbeat.route_hop_count
                    ? ScoreEngine._scoreInverse(heartbeat.route_hop_count, 0, 30)
                    : 50;
                subscores.loss = ScoreEngine._scoreInverse(heartbeat.packet_loss_rate, 0, 100);
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ping, 500);
                subscores.route_stable = 70;
                break;

            case "bandwidth":
                subscores.rate = heartbeat.download_rate_mbps
                    ? Math.min(100, (heartbeat.download_rate_mbps / 100) * 100)
                    : 0;
                subscores.stability = heartbeat.status === 1 ? 80 : 20;
                subscores.latency = ScoreEngine._scoreLatency(heartbeat.ping, 100);
                break;

            case "business-logic":
                subscores.pass_rate = heartbeat.business_pass_rate !== null
                    ? heartbeat.business_pass_rate * 100
                    : 0;
                subscores.response_correct = heartbeat.status === 1 ? 90 : 0;
                break;

            default:
                for (const key of Object.keys(weights)) {
                    subscores[key] = heartbeat.status === 1 ? 100 : 0;
                }
        }

        return subscores;
    }

    /**
     * Score latency: 0ms = 100, maxMs = 0, linear interpolation
     */
    static _scoreLatency(ms, maxMs) {
        if (ms === null || ms === undefined) return 50;
        if (ms <= 0) return 100;
        if (ms >= maxMs) return 0;
        return ((maxMs - ms) / maxMs) * 100;
    }

    /**
     * Score inverse: 0 = 100, maxVal = 0
     */
    static _scoreInverse(val, minVal, maxVal) {
        if (val === null || val === undefined) return 50;
        if (val <= minVal) return 100;
        if (val >= maxVal) return 0;
        return ((maxVal - val) / (maxVal - minVal)) * 100;
    }
}

module.exports = { ScoreEngine };
