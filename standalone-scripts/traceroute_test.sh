#!/usr/bin/env bash
#=============================================
# Traceroute / MTR 拨测脚本
# 输出: JSON 格式的路由路径与逐跳统计
# 用法: ./traceroute_test.sh <target> [max_hops] [timeout]
#=============================================

set -euo pipefail

TARGET="${1:?用法: $0 <target> [max_hops] [timeout]}"
MAX_HOPS="${2:-30}"
TIMEOUT="${3:-5}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 检查工具可用性
USE_MTR=false
if command -v mtr &>/dev/null; then
  USE_MTR=true
fi

HOPS=()
HOP_COUNT=0

if [ "$USE_MTR" = true ]; then
  MTR_OUTPUT=$(mtr -n -r -c 10 -m "$MAX_HOPS" "$TARGET" 2>&1) || true

  while IFS= read -r line; do
    if [[ "$line" =~ ^Host ]] || [[ "$line" =~ ^--- ]]; then
      continue
    fi

    HOP_NUM=$(echo "$line" | awk '{print $1}' | tr -d '.')
    HOP_IP=$(echo "$line" | awk '{print $2}')
    HOP_LOSS=$(echo "$line" | awk '{print $3}' | tr -d '%')
    HOP_SENT=$(echo "$line" | awk '{print $4}')
    HOP_AVG=$(echo "$line" | awk '{print $6}')
    HOP_BEST=$(echo "$line" | awk '{print $7}')
    HOP_WORST=$(echo "$line" | awk '{print $8}')

    if [ "$HOP_IP" != "???" ] && [ "$HOP_IP" != "---" ]; then
      AS_INFO=$(whois -h whois.radb.net "$HOP_IP" 2>/dev/null | grep "^origin:" | awk '{print $2}' | head -1 || echo "unknown")

      HOPS+=("{\"hop\":$HOP_NUM,\"ip\":\"$HOP_IP\",\"as\":\"$AS_INFO\",\"loss_pct\":$HOP_LOSS,\"sent\":$HOP_SENT,\"avg_ms\":$HOP_AVG,\"best_ms\":$HOP_BEST,\"worst_ms\":$HOP_WORST}")
      HOP_COUNT=$((HOP_COUNT + 1))
    fi
  done <<< "$MTR_OUTPUT"

else
  TRACE_OUTPUT=$(traceroute -n -m "$MAX_HOPS" -w "$TIMEOUT" "$TARGET" 2>&1) || true

  while IFS= read -r line; do
    if [[ "$line" =~ ^traceroute ]]; then
      continue
    fi

    HOP_NUM=$(echo "$line" | awk '{print $1}')
    HOP_IP=$(echo "$line" | awk '{print $2}')

    if [ "$HOP_IP" != "*" ] && [[ "$HOP_IP" =~ ^[0-9] ]]; then
      LATENCIES=$(echo "$line" | grep -oP '[\d.]+ ms' | grep -oP '[\d.]+' | tr '\n' ',' | sed 's/,$//')
      AVG_LAT=$(echo "$LATENCIES" | tr ',' '\n' | awk '{s+=$1;n++} END {printf "%.2f", s/n}' 2>/dev/null || echo "null")

      AS_INFO=$(whois -h whois.radb.net "$HOP_IP" 2>/dev/null | grep "^origin:" | awk '{print $2}' | head -1 || echo "unknown")

      HOPS+=("{\"hop\":$HOP_NUM,\"ip\":\"$HOP_IP\",\"as\":\"$AS_INFO\",\"avg_ms\":$AVG_LAT}")
      HOP_COUNT=$((HOP_COUNT + 1))
    fi
  done <<< "$TRACE_OUTPUT"
fi

AS_LIST=$(printf '%s\n' "${HOPS[@]}" | grep -oP '"as":"[^"]*"' | cut -d'"' -f4 | uniq | tr '\n' ',' | sed 's/,$//')

cat <<EOF
{
  "test_type": "traceroute",
  "tool": "$([ "$USE_MTR" = true ] && echo "mtr" || echo "traceroute")",
  "target": "$TARGET",
  "timestamp": "$TIMESTAMP",
  "params": {
    "max_hops": $MAX_HOPS,
    "timeout_sec": $TIMEOUT
  },
  "result": {
    "hop_count": $HOP_COUNT,
    "hops": [$(printf '%s,' "${HOPS[@]}" | sed 's/,$//')],
    "as_path": "$AS_LIST"
  },
  "status": "ok"
}
EOF
