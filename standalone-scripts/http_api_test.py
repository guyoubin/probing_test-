#!/usr/bin/env python3
"""
HTTP / API 拨测脚本
输出: JSON 格式的 TTFB、TTLB、状态码、响应体哈希
用法:
  基础测试: python3 http_api_test.py <url> [--method GET|POST] [--timeout 30]
  API 测试: python3 http_api_test.py <base_url> --api-key sk-xxx [--model gpt-4o-mini]
  流式测试: python3 http_api_test.py <base_url> --api-key sk-xxx --stream
"""

import argparse
import hashlib
import json
import ssl
import time
from datetime import datetime, timezone
from http.client import HTTPSConnection, HTTPConnection
from urllib.parse import urlparse


def probe_http(url: str, method: str = "GET", headers: dict = None,
               body: bytes = None, timeout: int = 30) -> dict:
    """执行 HTTP 拨测，返回结构化结果"""
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        t_connect_start = time.monotonic()
        if parsed.scheme == "https":
            ctx = ssl.create_default_context()
            conn = HTTPSConnection(host, port, context=ctx, timeout=timeout)
        else:
            conn = HTTPConnection(host, port, timeout=timeout)

        req_headers = headers or {}
        if host and "Host" not in req_headers:
            req_headers["Host"] = host

        t_request_start = time.monotonic()
        conn.request(method, path, body=body, headers=req_headers)

        resp = conn.getresponse()
        t_ttfb = time.monotonic()

        resp_body = resp.read()
        t_ttlb = time.monotonic()

        conn.close()

        ttfb_ms = round((t_ttfb - t_request_start) * 1000, 2)
        ttlb_ms = round((t_ttlb - t_request_start) * 1000, 2)
        content_length = len(resp_body)
        body_hash = hashlib.sha256(resp_body).hexdigest()[:16]

        download_time = t_ttlb - t_ttfb
        download_rate_mbps = 0
        if download_time > 0:
            download_rate_mbps = round(
                (content_length * 8) / (download_time * 1_000_000), 2
            )

        result = {
            "test_type": "http_api",
            "target": url,
            "timestamp": timestamp,
            "params": {
                "method": method,
                "timeout_sec": timeout,
            },
            "result": {
                "status_code": resp.status,
                "status_reason": resp.reason,
                "ttfb_ms": ttfb_ms,
                "ttlb_ms": ttlb_ms,
                "content_length": content_length,
                "body_sha256_prefix": body_hash,
                "download_rate_mbps": download_rate_mbps,
            },
            "status": "ok" if 200 <= resp.status < 300 else "error",
        }

    except Exception as e:
        result = {
            "test_type": "http_api",
            "target": url,
            "timestamp": timestamp,
            "result": {
                "error": str(e),
                "error_type": type(e).__name__,
            },
            "status": "fail",
        }

    return result


def probe_openai_streaming(base_url: str, api_key: str, model: str = "gpt-4o-mini",
                           prompt: str = "Say hello in 50 words", timeout: int = 60) -> dict:
    """测试 SSE 流式响应"""
    parsed = urlparse(base_url)
    host = parsed.hostname
    port = parsed.port or 443
    path = "/v1/chat/completions"

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }).encode()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "Accept": "text/event-stream",
    }

    try:
        ctx = ssl.create_default_context()
        conn = HTTPSConnection(host, port, context=ctx, timeout=timeout)
        conn.request("POST", path, body=body, headers=headers)

        resp = conn.getresponse()

        ttft_ms = None
        token_times = []
        token_count = 0
        done_received = False
        t_start = time.monotonic()

        while True:
            line = resp.readline()
            if not line:
                break

            line_str = line.decode("utf-8", errors="replace").strip()

            if line_str.startswith("data: ") and line_str != "data: [DONE]":
                token_count += 1
                now = time.monotonic()
                if ttft_ms is None:
                    ttft_ms = round((now - t_start) * 1000, 2)
                token_times.append(round((now - t_start) * 1000, 2))

            elif line_str == "data: [DONE]":
                done_received = True
                break

        t_end = time.monotonic()
        total_ms = round((t_end - t_start) * 1000, 2)

        intervals = []
        for i in range(1, len(token_times)):
            intervals.append(round(token_times[i] - token_times[i-1], 2))

        avg_interval = round(sum(intervals) / len(intervals), 2) if intervals else None
        tps = round(token_count / ((t_end - t_start)), 2) if (t_end - t_start) > 0 else 0

        conn.close()

        result = {
            "test_type": "http_api",
            "test_subtype": "openai_streaming",
            "target": f"{base_url}/v1/chat/completions",
            "timestamp": timestamp,
            "params": {"model": model, "stream": True, "timeout_sec": timeout},
            "result": {
                "status_code": resp.status,
                "ttft_ms": ttft_ms,
                "total_ms": total_ms,
                "token_count": token_count,
                "tokens_per_second": tps,
                "avg_token_interval_ms": avg_interval,
                "done_received": done_received,
                "stream_interrupted": not done_received,
            },
            "status": "ok" if done_received else "warn",
        }

    except Exception as e:
        result = {
            "test_type": "http_api",
            "test_subtype": "openai_streaming",
            "target": f"{base_url}/v1/chat/completions",
            "timestamp": timestamp,
            "result": {"error": str(e), "error_type": type(e).__name__},
            "status": "fail",
        }

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HTTP / API 拨测工具")
    parser.add_argument("url", help="目标 URL 或 Base URL")
    parser.add_argument("--method", default="GET", choices=["GET", "POST"])
    parser.add_argument("--header", action="append", help="自定义头 (Key:Value)")
    parser.add_argument("--body", default=None, help="请求体")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--api-key", help="OpenAI API Key (用于 API 测试)")
    parser.add_argument("--model", default="gpt-4o-mini", help="模型名称")
    parser.add_argument("--stream", action="store_true", help="测试流式响应")
    args = parser.parse_args()

    headers = {}
    for h in (args.header or []):
        k, v = h.split(":", 1)
        headers[k.strip()] = v.strip()

    if args.stream and args.api_key:
        result = probe_openai_streaming(
            args.url, args.api_key, args.model, timeout=args.timeout
        )
    elif args.api_key:
        url = f"{args.url.rstrip('/')}/v1/chat/completions"
        body_dict = json.dumps({
            "model": args.model,
            "messages": [{"role": "user", "content": "Hello"}],
        }).encode()
        headers.setdefault("Content-Type", "application/json")
        headers.setdefault("Authorization", f"Bearer {args.api_key}")
        result = probe_http(url, method="POST", headers=headers, body=body_dict, timeout=args.timeout)
        result["test_subtype"] = "openai_chat_completion"
    else:
        body = args.body.encode() if args.body else None
        result = probe_http(args.url, args.method, headers, body, args.timeout)

    print(json.dumps(result, indent=2, ensure_ascii=False))
