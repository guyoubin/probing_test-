#!/usr/bin/env bash
#=============================================
# ICMP Ping 拨测脚本
# 输出: JSON 格式的 RTT 统计与丢包率
# 用法: ./icmp_ping_test.sh <target> [count] [interval] [timeout]
#=============================================

set -euo pipefail

TARGET="${1:?用法: $0 <target> [count] [interval] [timeout]}"
COUNT="${2:-10}"
INTERVAL="${3:-1}"
TIMEOUT="${4:-2}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 执行 ping
PING_OUTPUT=$(ping -c "$COUNT" -i "$INTERVAL" -W "$TIMEOUT" "$TARGET" 2>&1) || true

# 解析丢包率
if echo "$PING_OUTPUT" | grep -q "0% packet loss"; then
  PLR=0
else
  PLR=$(echo "$PING_OUTPUT" | tail -1 | grep -oP '\d+(?=% packet loss)' 2>/dev/null || echo "100")
fi

# 解析 RTT 统计
if echo "$PING_OUTPUT" | grep -q "rtt min/avg/max/mdev"; then
  RTT_LINE=$(echo "$PING_OUTPUT" | grep "rtt min/avg/max/mdev")
  RTT_VALUES=$(echo "$RTT_LINE" | grep -oP '[\d.]+/[\d.]+/[\d.]+/[\d.]+' | head -1)
  RTT_MIN=$(echo "$RTT_VALUES" | cut -d'/' -f1)
  RTT_AVG=$(echo "$RTT_VALUES" | cut -d'/' -f2)
  RTT_MAX=$(echo "$RTT_VALUES" | cut -d'/' -f3)
  RTT_MDEV=$(echo "$RTT_VALUES" | cut -d'/' -f4)
else
  RTT_MIN="null"
  RTT_AVG="null"
  RTT_MAX="null"
  RTT_MDEV="null"
fi

# 计算抖动 (Jitter = mdev)
JITTER="$RTT_MDEV"

# 输出 JSON
cat <<EOF
{
  "test_type": "icmp_ping",
  "target": "$TARGET",
  "timestamp": "$TIMESTAMP",
  "params": {
    "count": $COUNT,
    "interval": $INTERVAL,
    "timeout": $TIMEOUT
  },
  "result": {
    "rtt_min_ms": $RTT_MIN,
    "rtt_avg_ms": $RTT_AVG,
    "rtt_max_ms": $RTT_MAX,
    "rtt_mdev_ms": $RTT_MDEV,
    "packet_loss_rate": $PLR,
    "jitter_ms": $JITTER
  },
  "status": "$([ "$PLR" -eq 100 ] && echo "fail" || echo "ok")"
}
EOF
