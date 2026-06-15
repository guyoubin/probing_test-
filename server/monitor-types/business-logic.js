const { MonitorType } = require("./monitor-type");
const axios = require("axios");

class BusinessLogic extends MonitorType {
    name = "business-logic";
    layer = "L4";
    description = "AI API代理业务逻辑测试，多维度验证business_pass_rate";

    async check(monitor, heartbeat, server) {
        const baseUrl = monitor.url;
        const apiKey = monitor.api_key;
        const model = monitor.model || "gpt-3.5-turbo";
        const timeout = (monitor.timeout || 60) * 1000;

        try {
            const results = [];

            // 测试1: 模型列表
            results.push(await this._testModelList(baseUrl, apiKey, timeout));

            // 测试2: Chat完成
            results.push(await this._testChat(baseUrl, apiKey, model, timeout));

            // 测试3: 无效Key
            results.push(await this._testInvalidKey(baseUrl, model, timeout));

            // 测试4: 模型不存在
            results.push(await this._testModelNotFound(baseUrl, apiKey, timeout));

            // 测试5: Token计量
            results.push(await this._testTokenUsage(baseUrl, apiKey, model, timeout));

            const passed = results.filter((r) => r.passed).length;
            const total = results.length;
            const passRate = (passed / total) * 100;

            heartbeat.status = passRate >= 60 ? 1 : 0;
            heartbeat.business_pass_rate = parseFloat(passRate.toFixed(2));
            heartbeat.msg = `Business logic: ${passed}/${total} passed (${passRate.toFixed(1)}%)`;
            heartbeat.raw_result_json = JSON.stringify({
                total,
                passed,
                pass_rate: passRate,
                tests: results,
            });
        } catch (err) {
            heartbeat.status = 0;
            heartbeat.msg = `Business logic test error: ${err.message}`;
            heartbeat.raw_result_json = JSON.stringify({ error: err.message });
        }
    }

    async _testModelList(baseUrl, apiKey, timeout) {
        const test = { name: "model_list", passed: false, details: {} };
        try {
            const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout,
            });
            const models = response.data?.data || [];
            test.passed = Array.isArray(models) && models.length > 0;
            test.details = {
                status: response.status,
                model_count: models.length,
                sample_models: models.slice(0, 5).map((m) => m.id),
            };
        } catch (err) {
            test.details = { error: err.message, status: err.response?.status };
        }
        return test;
    }

    async _testChat(baseUrl, apiKey, model, timeout) {
        const test = { name: "chat_completion", passed: false, details: {} };
        try {
            const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
            const response = await axios.post(
                url,
                {
                    model,
                    messages: [{ role: "user", content: "Say 'test OK' in two words." }],
                    max_tokens: 10,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout,
                }
            );
            const content = response.data?.choices?.[0]?.message?.content;
            test.passed = !!content;
            test.details = {
                status: response.status,
                content: content ? content.substring(0, 100) : null,
                model: response.data?.model,
            };
        } catch (err) {
            test.details = { error: err.message, status: err.response?.status };
        }
        return test;
    }

    async _testInvalidKey(baseUrl, model, timeout) {
        const test = { name: "invalid_key_rejection", passed: false, details: {} };
        try {
            const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
            const response = await axios.post(
                url,
                {
                    model,
                    messages: [{ role: "user", content: "test" }],
                },
                {
                    headers: {
                        Authorization: "Bearer sk-invalid-key-00000000000000000000",
                        "Content-Type": "application/json",
                    },
                    timeout,
                    validateStatus: () => true,
                }
            );
            // 应该返回401/403
            test.passed = response.status === 401 || response.status === 403;
            test.details = { status: response.status, expected: "401 or 403" };
        } catch (err) {
            // 网络错误也算不通过
            test.details = { error: err.message };
        }
        return test;
    }

    async _testModelNotFound(baseUrl, apiKey, timeout) {
        const test = { name: "model_not_found", passed: false, details: {} };
        try {
            const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
            const response = await axios.post(
                url,
                {
                    model: "nonexistent-model-xyz-12345",
                    messages: [{ role: "user", content: "test" }],
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout,
                    validateStatus: () => true,
                }
            );
            // 应该返回4xx错误
            test.passed = response.status >= 400 && response.status < 500;
            test.details = { status: response.status, expected: "4xx" };
        } catch (err) {
            test.details = { error: err.message };
        }
        return test;
    }

    async _testTokenUsage(baseUrl, apiKey, model, timeout) {
        const test = { name: "token_usage", passed: false, details: {} };
        try {
            const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
            const response = await axios.post(
                url,
                {
                    model,
                    messages: [{ role: "user", content: "Hello" }],
                    max_tokens: 5,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    timeout,
                }
            );
            const usage = response.data?.usage;
            test.passed = !!(usage && (usage.total_tokens || usage.prompt_tokens));
            test.details = {
                status: response.status,
                usage: usage || null,
            };
        } catch (err) {
            test.details = { error: err.message, status: err.response?.status };
        }
        return test;
    }
}

module.exports = { BusinessLogic };
