module.exports = {
    "icmp-ping":    { packet_loss: 0.5, latency: 0.3, jitter: 0.2 },
    "tcp-connect":  { success_rate: 0.5, latency: 0.3, p99: 0.2 },
    "dns-resolve":  { latency: 0.3, consistency: 0.5, dnssec: 0.2 },
    "tls-handshake":{ cert_valid: 0.4, protocol: 0.3, latency: 0.3 },
    "http-api":     { status_code: 0.3, ttfb: 0.3, ttlb: 0.2, content: 0.2 },
    "sse-streaming":{ ttft: 0.3, tps: 0.3, completion: 0.2, latency: 0.2 },
    "traceroute-mtr":{ hop_count: 0.2, loss: 0.3, latency: 0.3, route_stable: 0.2 },
    "bandwidth":   { rate: 0.5, stability: 0.3, latency: 0.2 },
    "business-logic":{ pass_rate: 0.6, response_correct: 0.4 },
};
