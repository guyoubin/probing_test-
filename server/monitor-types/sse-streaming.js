const { MonitorType } = require("./monitor-type");
const axios = require("axios");

class SseStreaming extends MonitorType {
    name = "sse-streaming";
    layer = "L3";
    description = "SSE流式响应测试，测量TTFT、tokens/s、流中断检测";

    async check(monitor, heartbeat, server) {
        const url = monitor.url;
        const apiKey = monitor.api_key;
        const model = monitor.model || "gpt-3.5-turbo";
        const prompt = monitor.prompt || "Hello, respond with a short greeting.";
        const maxTokens = monitor.max_tokens || 50;
        const timeout = (monitor.timeout || 30) * 1000;

        try {
            const result = await this._testSse(url, apiKey, model, prompt, maxTokens, timeout);

            heartbeat.status = result.success ? 1 : 0;
            heartbeat.ttft_ms = result.ttft;
            heartbeat.tokens_per_second = result.tokensPerSecond;
            heartbeat.msg = result.success
                ? `SSE ${url}: ttft=${result.ttft}ms, tokens/s=${result.tokensPerSecond.toFixed(2)}, tokens=${result.tokenCount}, interrupted=${result.streamInterrupted}`
                : `SSE streaming failed: ${result.error}`;
            heartbeat.raw_result_json = JSON.stringify(result);
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `SSE streaming error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    async _testSse(url, apiKey, model, prompt, maxTokens, timeout) {
        const result = {
            success: false,
            ttft: null,
            tokensPerSecond: 0,
            tokenCount: 0,
            streamInterrupted: false,
            error: null,
            chunks: [],
        };

        const headers = {
            "Content-Type": "application/json",
        };
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const requestBody = {
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
            stream: true,
        };

        const startTotal = Date.now();
        let firstTokenTime = null;
        let tokenCount = 0;
        let streamEnded = false;

        try {
            const response = await axios.post(url, requestBody, {
                headers,
                timeout,
                responseType: "stream",
            });

            await new Promise((resolve, reject) => {
                const stream = response.data;
                let buffer = "";

                stream.on("data", (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split("\n");
                    buffer = lines.pop(); // 保留不完整的行

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === "") continue;

                        if (trimmed === "data: [DONE]") {
                            streamEnded = true;
                            continue;
                        }

                        if (trimmed.startsWith("data: ")) {
                            const jsonStr = trimmed.slice(6);
                            try {
                                const parsed = JSON.parse(jsonStr);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    if (firstTokenTime === null) {
                                        firstTokenTime = Date.now();
                                    }
                                    tokenCount++;
                                    result.chunks.push(content);
                                }
                                // 检查finish_reason
                                const finishReason = parsed.choices?.[0]?.finish_reason;
                                if (finishReason === "stop") {
                                    streamEnded = true;
                                }
                            } catch {
                                // 非JSON数据行，忽略
                            }
                        }
                    }
                });

                stream.on("end", () => {
                    resolve();
                });

                stream.on("error", (err) => {
                    reject(err);
                });

                // 设置超时
                setTimeout(() => {
                    stream.destroy();
                    resolve();
                }, timeout);
            });

            const totalTime = Date.now() - startTotal;

            result.ttft = firstTokenTime ? firstTokenTime - startTotal : null;
            result.tokenCount = tokenCount;
            result.streamInterrupted = !streamEnded && tokenCount > 0;
            result.success = tokenCount > 0;

            if (result.ttft && totalTime > result.ttft) {
                const generationTime = (totalTime - result.ttft) / 1000;
                result.tokensPerSecond = generationTime > 0 ? tokenCount / generationTime : 0;
            }

            result.total_time_ms = totalTime;
        } catch (err) {
            result.error = err.message;
        }

        return result;
    }
}

module.exports = { SseStreaming };
