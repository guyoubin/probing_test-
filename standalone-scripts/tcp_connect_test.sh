#!/usr/bin/env bash
#=============================================
# TCP Connect 拨测脚本
# 输出: JSON 格式的连接延迟与成功率
# 用法: ./tcp_connect_test.sh <host> <port> [count] [timeout]
#=============================================

set -euo pipefail

HOST="${1:?用法: $0 <host> <port> [count] [timeout]}"
PORT="${2:?用法: $0 <host> <port> [count] [timeout]}"
COUNT="${3:-10}"
TIMEOUT="${4:-5}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

SUCCESS=0
FAIL=0
LATENCIES=()

for i in $(seq 1 "$COUNT"); do
  START_NS=$(date +%s%N)
  if timeout "$TIMEOUT" bash -c "echo >/dev/tcp/$HOST/$PORT" 2>/dev/null; then
    END_NS=$(date +%s%N)
    ELAPSED_MS=$(( (END_NS - START_NS) / 1000000 ))
    LATENCIES+=("$ELAPSED_MS")
    SUCCESS=$((SUCCESS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
done

# 计算统计
TOTAL=$((SUCCESS + FAIL))
CSR=$(echo "scale=4; $SUCCESS / $TOTAL * 100" | bc 2>/dev/null || echo "0")

if [ ${#LATENCIES[@]} -gt 0 ]; then
  SORTED=($(printf '%s\n' "${LATENCIES[@]}" | sort -n))
  MIN=${SORTED[0]}
  MAX=${SORTED[${#SORTED[@]}-1]}
  AVG=$(echo "${LATENCIES[@]}" | tr ' ' '\n' | awk '{s+=$1;n++} END {printf "%.2f", s/n}')
  P90_IDX=$(echo "${#SORTED[@]} * 90 / 100" | bc)
  P90=${SORTED[$P90_IDX]:-$MAX}
  P99_IDX=$(echo "${#SORTED[@]} * 99 / 100" | bc)
  P99=${SORTED[$P99_IDX]:-$MAX}
else
  MIN="null"; MAX="null"; AVG="null"; P90="null"; P99="null"
fi

cat <<EOF
{
  "test_type": "tcp_connect",
  "target": "$HOST:$PORT",
  "timestamp": "$TIMESTAMP",
  "params": {
    "count": $COUNT,
    "timeout_sec": $TIMEOUT
  },
  "result": {
    "connect_success": $SUCCESS,
    "connect_fail": $FAIL,
    "connect_success_rate": $CSR,
    "latency_min_ms": $MIN,
    "latency_avg_ms": $AVG,
    "latency_max_ms": $MAX,
    "latency_p90_ms": $P90,
    "latency_p99_ms": $P99
  },
  "status": "$([ "$SUCCESS" -eq 0 ] && echo "fail" || echo "ok")"
}
EOF
