#!/usr/bin/env bash
#=============================================
# DNS 解析拨测脚本
# 输出: JSON 格式的解析延迟、结果与一致性
# 用法: ./dns_resolve_test.sh <domain> [dns_server1,dns_server2,...]
#=============================================

set -euo pipefail

DOMAIN="${1:?用法: $0 <domain> [dns_server1,dns_server2,...]}"
DNS_SERVERS="${2:-8.8.8.8,1.1.1.1,223.5.5.5}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if ! command -v dig &>/dev/null; then
  echo '{"error": "dig 命令不可用，请安装 dnsutils"}' >&2
  exit 1
fi

RESULT_SERVERS=()
ALL_RESULTS=()

for DNS_SERVER in $(echo "$DNS_SERVERS" | tr ',' ' '); do
  START_NS=$(date +%s%N)
  DIG_OUTPUT=$(dig "@$DNS_SERVER" "$DOMAIN" A +noall +answer +stats +dnssec 2>&1) || true
  END_NS=$(date +%s%N)
  QUERY_TIME_MS=$(( (END_NS - START_NS) / 1000000 ))

  ANSWERS=$(echo "$DIG_OUTPUT" | grep -E "^[^;].*IN\s+A\s+" | awk '{print $NF}' | sort | tr '\n' ',' | sed 's/,$//')
  DIG_QUERY_MS=$(echo "$DIG_OUTPUT" | grep "Query time" | grep -oP '\d+' | head -1 || echo "$QUERY_TIME_MS")

  DNSSEC_STATUS=$(echo "$DIG_OUTPUT" | grep -c "RRSIG" || echo "0")
  if [ "$DNSSEC_STATUS" -gt 0 ]; then
    DNSSEC="signed"
  else
    DNSSEC="unsigned_or_not_checked"
  fi

  AD_FLAG=$(echo "$DIG_OUTPUT" | grep -c "flags:.*ad" || echo "0")

  RESULT_SERVERS+=("$DNS_SERVER")
  if [ -n "$ANSWERS" ]; then
    ALL_RESULTS+=("$ANSWERS")
  fi
done

UNIQUE_RESULTS=($(printf '%s\n' "${ALL_RESULTS[@]}" | sort -u))
if [ ${#UNIQUE_RESULTS[@]} -le 1 ]; then
  CONSISTENCY="consistent"
else
  CONSISTENCY="inconsistent"
fi

cat <<EOF
{
  "test_type": "dns_resolve",
  "target": "$DOMAIN",
  "timestamp": "$TIMESTAMP",
  "params": {
    "dns_servers": "$(echo $DNS_SERVERS | sed 's/ /,/g')"
  },
  "result": {
    "consistency": "$CONSISTENCY",
    "unique_result_count": ${#UNIQUE_RESULTS[@]}
  },
  "status": "$([ "$CONSISTENCY" = "consistent" ] && echo "ok" || echo "warn")"
}
EOF
