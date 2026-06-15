#!/usr/bin/env python3
"""
业务正确性测试脚本
验证 AI API 代理的业务逻辑正确性
用法: python3 business_logic_test.py --base-url https://api.example.com --api-key sk-xxx
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class BusinessProber:
    """业务正确性拨测"""

    def __init__(self, base_url: str, api_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.results = []

    def _request(self, method: str, path: str, body: dict = None,
                 headers: dict = None, expect_status: int = 200) -> dict:
        """执行 HTTP 请求"""
        url = f"{self.base_url}{path}"
        req_headers = headers or {}
        req_headers.setdefault("Authorization", f"Bearer {self.api_key}")

        if body:
            req_headers.setdefault("Content-Type", "application/json")
            data = json.dumps(body).encode()
        else:
            data = None

        req = Request(url, data=data, headers=req_headers, method=method)

        start = time.monotonic()
        try:
            resp = urlopen(req, timeout=self.timeout)
            ttfb = time.monotonic() - start
            resp_body = json.loads(resp.read())
            status = resp.status
            error = None
        except HTTPError as e:
            ttfb = time.monotonic() - start
            try:
                resp_body = json.loads(e.read())
            except Exception:
                resp_body = {"raw": str(e)}
            status = e.code
            error = str(e)
        except Exception as e:
            ttfb = time.monotonic() - start
            resp_body = {}
            status = 0
            error = str(e)

        return {
            "status_code": status,
            "ttfb_sec": round(ttfb, 3),
            "body": resp_body,
            "error": error,
            "pass": status == expect_status,
        }

    def test_biz_001_models_list(self) -> dict:
        """BIZ-001: 模型列表获取"""
        r = self._request("GET", "/v1/models")
        models = []
        if r["pass"] and "data" in r.get("body", {}):
            models = [m.get("id", "") for m in r["body"]["data"]]
        return {
            "case": "BIZ-001",
            "name": "模型列表获取",
            "result": r,
            "models_found": models,
            "detail": f"找到 {len(models)} 个模型" if r["pass"] else r["error"],
        }

    def test_biz_002_chat_completion(self) -> dict:
        """BIZ-002: Chat Completion"""
        r = self._request("POST", "/v1/chat/completions", body={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Say hello"}],
        })
        content = ""
        if r["pass"] and "choices" in r.get("body", {}):
            content = r["body"]["choices"][0].get("message", {}).get("content", "")
        return {
            "case": "BIZ-002",
            "name": "Chat Completion (非流式)",
            "result": r,
            "response_content": content[:100] if content else "",
            "detail": "响应内容完整" if content else "响应内容为空或异常",
        }

    def test_biz_005_invalid_key(self) -> dict:
        """BIZ-005: 无效 API Key"""
        r = self._request("GET", "/v1/models",
                          headers={"Authorization": "Bearer invalid_key_12345"},
                          expect_status=401)
        return {
            "case": "BIZ-005",
            "name": "无效 API Key 拒绝",
            "result": r,
            "detail": "正确拒绝无效Key" if r["pass"] else "未正确拒绝无效Key",
        }

    def test_biz_006_model_not_found(self) -> dict:
        """BIZ-006: 模型不存在"""
        r = self._request("POST", "/v1/chat/completions", body={
            "model": "nonexistent-model-xyz",
            "messages": [{"role": "user", "content": "test"}],
        }, expect_status=404)
        return {
            "case": "BIZ-006",
            "name": "模型不存在",
            "result": r,
            "detail": "正确返回错误" if r["pass"] else "未正确处理",
        }

    def test_biz_009_token_usage(self) -> dict:
        """BIZ-009: Token 计量"""
        r = self._request("POST", "/v1/chat/completions", body={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Hi"}],
        })
        usage = r.get("body", {}).get("usage", {})
        return {
            "case": "BIZ-009",
            "name": "Token 计量",
            "result": r,
            "usage": usage,
            "detail": f"prompt={usage.get('prompt_tokens','?')} "
                      f"completion={usage.get('completion_tokens','?')} "
                      f"total={usage.get('total_tokens','?')}" if usage else "无usage字段",
        }

    def run_all(self) -> dict:
        """执行全部业务测试"""
        tests = [
            self.test_biz_001_models_list,
            self.test_biz_002_chat_completion,
            self.test_biz_005_invalid_key,
            self.test_biz_006_model_not_found,
            self.test_biz_009_token_usage,
        ]

        for test_fn in tests:
            try:
                result = test_fn()
                self.results.append(result)
            except Exception as e:
                self.results.append({
                    "case": test_fn.__name__,
                    "error": str(e),
                    "pass": False,
                })

        passed = sum(1 for r in self.results if r.get("result", {}).get("pass", False))
        total = len(self.results)

        return {
            "test_type": "business_logic",
            "timestamp": self.timestamp,
            "target": self.base_url,
            "summary": {
                "total": total,
                "passed": passed,
                "failed": total - passed,
                "pass_rate": f"{passed/total*100:.1f}%" if total > 0 else "0%",
            },
            "results": self.results,
            "status": "ok" if passed == total else "fail",
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="业务正确性拨测")
    parser.add_argument("--base-url", required=True, help="API 基础 URL")
    parser.add_argument("--api-key", required=True, help="API Key")
    parser.add_argument("--timeout", type=int, default=30)
    args = parser.parse_args()

    prober = BusinessProber(args.base_url, args.api_key, args.timeout)
    report = prober.run_all()

    print(json.dumps(report, indent=2, ensure_ascii=False))
    sys.exit(0 if report["status"] == "ok" else 1)
