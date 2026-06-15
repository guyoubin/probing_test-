const { MonitorType } = require("./monitor-type");
const tls = require("tls");

class TlsHandshake extends MonitorType {
    name = "tls-handshake";
    layer = "L2";
    description = "TLS握手延迟、证书信息、协议降级测试";

    async check(monitor, heartbeat, server) {
        const host = monitor.hostname;
        const port = monitor.port || 443;
        const timeout = (monitor.timeout || 5) * 1000;

        try {
            // 正常TLS连接
            const tlsResult = await this._tlsConnect(host, port, timeout);

            // 协议降级测试
            const downgradeTest = await this._downgradeTest(host, port, timeout);

            const certDaysRemaining = tlsResult.certDaysRemaining;
            const isDowngrade = downgradeTest.tls10 || downgradeTest.tls11;

            heartbeat.status = tlsResult.success ? 1 : 0;
            heartbeat.ping = tlsResult.handshakeTime;
            heartbeat.cert_days_remaining = certDaysRemaining;
            heartbeat.msg = tlsResult.success
                ? `TLS ${host}:${port}: handshake=${tlsResult.handshakeTime}ms, protocol=${tlsResult.protocol}, cert_days=${certDaysRemaining}, downgrade=${isDowngrade ? "VULNERABLE" : "OK"}`
                : `TLS handshake failed: ${tlsResult.error}`;
            heartbeat.raw_result_json = JSON.stringify({
                host,
                port,
                handshake_time: tlsResult.handshakeTime,
                protocol: tlsResult.protocol,
                cipher: tlsResult.cipher,
                cert_days_remaining: certDaysRemaining,
                cert_subject: tlsResult.certSubject,
                cert_issuer: tlsResult.certIssuer,
                cert_valid_from: tlsResult.certValidFrom,
                cert_valid_to: tlsResult.certValidTo,
                downgrade_test: downgradeTest,
            });
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `TLS handshake error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    _tlsConnect(host, port, timeout) {
        return new Promise((resolve) => {
            const start = Date.now();
            const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
                const handshakeTime = Date.now() - start;
                const cert = socket.getPeerCertificate();
                const protocol = socket.getProtocol();
                const cipher = socket.getCipher();

                let certDaysRemaining = null;
                if (cert && cert.valid_to) {
                    const expiry = new Date(cert.valid_to);
                    const now = new Date();
                    certDaysRemaining = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
                }

                socket.destroy();
                resolve({
                    success: true,
                    handshakeTime,
                    protocol,
                    cipher: cipher ? cipher.name : null,
                    certDaysRemaining,
                    certSubject: cert ? cert.subject : null,
                    certIssuer: cert ? cert.issuer : null,
                    certValidFrom: cert ? cert.valid_from : null,
                    certValidTo: cert ? cert.valid_to : null,
                });
            });

            socket.setTimeout(timeout, () => {
                socket.destroy();
                resolve({ success: false, error: "timeout", handshakeTime: null });
            });

            socket.on("error", (err) => {
                socket.destroy();
                resolve({ success: false, error: err.message, handshakeTime: null });
            });
        });
    }

    _downgradeTest(host, port, timeout) {
        const result = { tls10: false, tls11: false };

        const testProtocol = (secureProtocol) => {
            return new Promise((resolve) => {
                const socket = tls.connect(
                    { host, port, servername: host, rejectUnauthorized: false, secureProtocol },
                    () => {
                        socket.destroy();
                        resolve(true);
                    }
                );
                socket.setTimeout(timeout, () => {
                    socket.destroy();
                    resolve(false);
                });
                socket.on("error", () => {
                    socket.destroy();
                    resolve(false);
                });
            });
        };

        return Promise.all([
            testProtocol("TLSv1_method").then((r) => { result.tls10 = r; }),
            testProtocol("TLSv1_1_method").then((r) => { result.tls11 = r; }),
        ]).then(() => result);
    }
}

module.exports = { TlsHandshake };
