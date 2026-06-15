const { MonitorType } = require("./monitor-type");
const axios = require("axios");

class HttpApi extends MonitorType {
    name = "http-api";
    layer = "L3";
    description = "HTTP API延迟测试，支持TTFB/TTLB、自定义请求、API Key鉴权";

    async check(monitor, heartbeat, server) {
        const url = monitor.url;
        const method = (monitor.method || "GET").toUpperCase();
        const headers = monitor.headers || {};
        const body = monitor.body;
        const apiKey = monitor.api_key;
        const apiKeyHeader = monitor.api_key_header || "Authorization";
        const timeout = (monitor.timeout || 10) * 1000;
        const expectedStatus = monitor.expected_status || null;
        const expectedKeyword = monitor.keyword || null;

        try {
            // 合并API Key到headers
            const finalHeaders = { ...headers };
            if (apiKey) {
                finalHeaders[apiKeyHeader] = apiKeyHeader === "Authorization"
                    ? `Bearer ${apiKey}`
                    : apiKey;
            }

            let ttfb = null;
            let ttlb = null;
            const startTotal = Date.now();

            // 使用拦截器测量TTFB
            const instance = axios.create({
                timeout,
                headers: finalHeaders,
                method,
                data: body,
                transformResponse: [(data) => data],
                responseType: "text",
            });

            let firstByteReceived = false;

            instance.interceptors.response.use(
                (response) => {
                    if (!firstByteReceived) {
                        ttfb = Date.now() - startTotal;
                        firstByteReceived = true;
                    }
                    return response;
                },
                (error) => {
                    throw error;
                }
            );

            const response = await instance.request({ url });
            ttlb = Date.now() - startTotal;

            // 如果TTFB未通过拦截器设置，使用TTLB
            if (ttfb === null) {
                ttfb = ttlb;
            }

            const ping = ttlb;
            let statusOk = true;
            let msgParts = [];

            // 检查HTTP状态码
            if (expectedStatus && response.status !== expectedStatus) {
                statusOk = false;
                msgParts.push(`status=${response.status} (expected ${expectedStatus})`);
            } else {
                msgParts.push(`status=${response.status}`);
            }

            // 检查关键词
            if (expectedKeyword && typeof response.data === "string") {
                if (!response.data.includes(expectedKeyword)) {
                    statusOk = false;
                    msgParts.push("keyword not found");
                } else {
                    msgParts.push("keyword=OK");
                }
            }

            heartbeat.status = statusOk ? 1 : 0;
            heartbeat.ping = ping;
            heartbeat.ttfb_ms = ttfb;
            heartbeat.ttlb_ms = ttlb;
            heartbeat.msg = `HTTP ${method} ${url}: ${msgParts.join(", ")}, ttfb=${ttfb}ms, ttlb=${ttlb}ms`;
            heartbeat.raw_result_json = JSON.stringify({
                url,
                method,
                status_code: response.status,
                ttfb_ms: ttfb,
                ttlb_ms: ttlb,
                headers: response.headers,
            });
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `HTTP ${method} ${url} error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({
                error: err.message,
                code: err.code,
                response: err.response ? {
                    status: err.response.status,
                    data: typeof err.response.data === "string"
                        ? err.response.data.substring(0, 500)
                        : null,
                } : null,
            });
        }
    }
}

module.exports = { HttpApi };
