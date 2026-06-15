#!/usr/bin/env bash
#=============================================
# 带宽估测脚本 (轻量级)
# 输出: JSON 格式的下载速率与估算带宽
# 用法: ./bandwidth_test.sh <download_url> [duration_sec] [connections]
#=============================================

set -euo pipefail

URL="${1:?用法: $0 <download_url> [duration_sec] [connections]}"
DURATION="${2:-10}"
CONNECTIONS="${3:-4}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

TOTAL_BYTES=0
PIDS=()

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

START_TIME=$(date +%s%N)

for i in $(seq 1 "$CONNECTIONS"); do
  curl -s -o "$TEMP_DIR/part_$i" --max-time "$DURATION" "$URL" &
  PIDS+=($!)
done

for PID in "${PIDS[@]}"; do
  wait "$PID" 2>/dev/null || true
done

END_TIME=$(date +%s%N)

for f in "$TEMP_DIR"/part_*; do
  if [ -f "$f" ]; then
    SIZE=$(stat -c%s "$f" 2>/dev/null || echo "0")
    TOTAL_BYTES=$((TOTAL_BYTES + SIZE))
  fi
done

ELAPSED_SEC=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)
DOWNLOAD_RATE_MBPS=$(echo "scale=2; $TOTAL_BYTES * 8 / ($ELAPSED_SEC * 1000000)" | bc 2>/dev/null || echo "0")

cat <<EOF
{
  "test_type": "bandwidth",
  "target": "$URL",
  "timestamp": "$TIMESTAMP",
  "params": {
    "duration_sec": $DURATION,
    "connections": $CONNECTIONS
  },
  "result": {
    "total_bytes": $TOTAL_BYTES,
    "elapsed_sec": $ELAPSED_SEC,
    "download_rate_mbps": $DOWNLOAD_RATE_MBPS
  },
  "status": "$([ "$TOTAL_BYTES" -gt 0 ] && echo "ok" || echo "fail")"
}
EOF
