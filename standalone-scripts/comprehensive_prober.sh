#!/usr/bin/env bash
#=============================================
# 综合拨测编排脚本
# 按 L1→L4 顺序执行全部拨测，输出汇总 JSON
# 用法: ./comprehensive_prober.sh <config.json>
#=============================================

set -euo pipefail

CONFIG_FILE="${1:?用法: $0 <config.json>}"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "配置文件不存在: $CONFIG_FILE" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "需要 jq 命令，请安装: apt-get install jq" >&2
  exit 1
fi

TARGET_HOST=$(jq -r '.target_host // empty' "$CONFIG_FILE")
TARGET_PORT=$(jq -r '.target_port // "443"' "$CONFIG_FILE")
TARGET_DOMAIN=$(jq -r '.target_domain // empty' "$CONFIG_FILE")
API_BASE_URL=$(jq -r '.api_base_url // empty' "$CONFIG_FILE")
API_KEY=$(jq -r '.api_key // empty' "$CONFIG_FILE")
API_MODEL=$(jq -r '.api_model // "gpt-4o-mini"' "$CONFIG_FILE")
PING_COUNT=$(jq -r '.ping_count // 10' "$CONFIG_FILE")
TCP_COUNT=$(jq -r '.tcp_count // 10' "$CONFIG_FILE")
HTTP_TIMEOUT=$(jq -r '.http_timeout // 30' "$CONFIG_FILE")
OUTPUT_DIR=$(jq -r '.output_dir // "./probing_results"' "$CONFIG_FILE")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RUN_ID="probing_$(date +%Y%m%d_%H%M%S)"
RESULT_DIR="$OUTPUT_DIR/$RUN_ID"
mkdir -p "$RESULT_DIR"

echo "========================================"
echo "  综合拨测启动"
echo "  运行ID: $RUN_ID"
echo "  时间:   $TIMESTAMP"
echo "========================================"

SUMMARY=()
OVERALL_STATUS="ok"

# ===== L1: 网络可达性 =====
echo ""
echo "[L1] 网络可达性测试"
echo "--------------------"

if [ -n "$TARGET_HOST" ]; then
  echo "→ ICMP Ping: $TARGET_HOST"
  ICMP_RESULT=$("$SCRIPT_DIR/icmp_ping_test.sh" "$TARGET_HOST" "$PING_COUNT" 2>&1) || true
  echo "$ICMP_RESULT" > "$RESULT_DIR/l1_icmp_ping.json"
  ICMP_STATUS=$(echo "$ICMP_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L1\",\"test\":\"icmp_ping\",\"target\":\"$TARGET_HOST\",\"status\":\"$ICMP_STATUS\"}")
  [ "$ICMP_STATUS" = "fail" ] && OVERALL_STATUS="degraded"
  echo "  状态: $ICMP_STATUS"
fi

if [ -n "$TARGET_HOST" ]; then
  echo "→ TCP Connect: $TARGET_HOST:$TARGET_PORT"
  TCP_RESULT=$("$SCRIPT_DIR/tcp_connect_test.sh" "$TARGET_HOST" "$TARGET_PORT" "$TCP_COUNT" 2>&1) || true
  echo "$TCP_RESULT" > "$RESULT_DIR/l1_tcp_connect.json"
  TCP_STATUS=$(echo "$TCP_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L1\",\"test\":\"tcp_connect\",\"target\":\"$TARGET_HOST:$TARGET_PORT\",\"status\":\"$TCP_STATUS\"}")
  [ "$TCP_STATUS" = "fail" ] && OVERALL_STATUS="degraded"
  echo "  状态: $TCP_STATUS"
fi

if [ -n "$TARGET_DOMAIN" ]; then
  echo "→ DNS Resolve: $TARGET_DOMAIN"
  DNS_RESULT=$("$SCRIPT_DIR/dns_resolve_test.sh" "$TARGET_DOMAIN" 2>&1) || true
  echo "$DNS_RESULT" > "$RESULT_DIR/l1_dns_resolve.json"
  DNS_STATUS=$(echo "$DNS_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L1\",\"test\":\"dns_resolve\",\"target\":\"$TARGET_DOMAIN\",\"status\":\"$DNS_STATUS\"}")
  [ "$DNS_STATUS" = "warn" ] && [ "$OVERALL_STATUS" = "ok" ] && OVERALL_STATUS="warn"
  echo "  状态: $DNS_STATUS"
fi

if [ -n "$TARGET_HOST" ]; then
  echo "→ Traceroute: $TARGET_HOST"
  TRACE_RESULT=$("$SCRIPT_DIR/traceroute_test.sh" "$TARGET_HOST" 2>&1) || true
  echo "$TRACE_RESULT" > "$RESULT_DIR/l1_traceroute.json"
  TRACE_STATUS=$(echo "$TRACE_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L1\",\"test\":\"traceroute\",\"target\":\"$TARGET_HOST\",\"status\":\"$TRACE_STATUS\"}")
  echo "  状态: $TRACE_STATUS"
fi

# ===== L2: 传输安全性 =====
echo ""
echo "[L2] 传输安全性测试"
echo "--------------------"

if [ -n "$TARGET_DOMAIN" ]; then
  echo "→ TLS Handshake: $TARGET_DOMAIN:$TARGET_PORT"
  TLS_RESULT=$("$SCRIPT_DIR/tls_handshake_test.sh" "$TARGET_DOMAIN" "$TARGET_PORT" 2>&1) || true
  echo "$TLS_RESULT" > "$RESULT_DIR/l2_tls_handshake.json"
  TLS_STATUS=$(echo "$TLS_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L2\",\"test\":\"tls_handshake\",\"target\":\"$TARGET_DOMAIN:$TARGET_PORT\",\"status\":\"$TLS_STATUS\"}")
  [ "$TLS_STATUS" = "fail" ] && OVERALL_STATUS="degraded"
  echo "  状态: $TLS_STATUS"
fi

# ===== L3: 应用可用性 =====
echo ""
echo "[L3] 应用可用性测试"
echo "--------------------"

if [ -n "$API_BASE_URL" ] && [ -n "$API_KEY" ]; then
  echo "→ API Chat Completion: $API_BASE_URL"
  API_RESULT=$(python3 "$SCRIPT_DIR/http_api_test.py" \
    "$API_BASE_URL" \
    --api-key "$API_KEY" \
    --model "$API_MODEL" \
    --timeout "$HTTP_TIMEOUT" 2>&1) || true
  echo "$API_RESULT" > "$RESULT_DIR/l3_api_chat.json"
  API_STATUS=$(echo "$API_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L3\",\"test\":\"api_chat_completion\",\"target\":\"$API_BASE_URL\",\"status\":\"$API_STATUS\"}")
  [ "$API_STATUS" = "fail" ] && OVERALL_STATUS="degraded"
  echo "  状态: $API_STATUS"

  echo "→ API Streaming SSE: $API_BASE_URL"
  SSE_RESULT=$(python3 "$SCRIPT_DIR/http_api_test.py" \
    "$API_BASE_URL" \
    --api-key "$API_KEY" \
    --model "$API_MODEL" \
    --stream \
    --timeout 60 2>&1) || true
  echo "$SSE_RESULT" > "$RESULT_DIR/l3_api_streaming.json"
  SSE_STATUS=$(echo "$SSE_RESULT" | jq -r '.status // "error"')
  SUMMARY+=("{\"layer\":\"L3\",\"test\":\"api_streaming_sse\",\"target\":\"$API_BASE_URL\",\"status\":\"$SSE_STATUS\"}")
  [ "$SSE_STATUS" = "warn" ] && [ "$OVERALL_STATUS" = "ok" ] && OVERALL_STATUS="warn"
  echo "  状态: $SSE_STATUS"
fi

# ===== 汇总报告 =====
echo ""
echo "========================================"
echo "  拨测完成"
echo "  总体状态: $OVERALL_STATUS"
echo "  结果目录: $RESULT_DIR"
echo "========================================"

cat > "$RESULT_DIR/summary.json" <<EOF
{
  "run_id": "$RUN_ID",
  "timestamp": "$TIMESTAMP",
  "overall_status": "$OVERALL_STATUS",
  "tests": [$(printf '%s,' "${SUMMARY[@]}" | sed 's/,$//')],
  "result_dir": "$RESULT_DIR"
}
EOF

echo ""
echo "汇总报告: $RESULT_DIR/summary.json"
