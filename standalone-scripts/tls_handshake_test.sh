#!/usr/bin/env bash
#=============================================
# TLS 握手拨测脚本
# 输出: JSON 格式的握手延迟、协议、证书信息
# 用法: ./tls_handshake_test.sh <host> [port] [timeout]
#=============================================

set -euo pipefail

HOST="${1:?用法: $0 <host> [port] [timeout]}"
PORT="${2:-443}"
TIMEOUT="${3:-10}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# TLS 握手延迟测量
START_NS=$(date +%s%N)
OPENSSL_OUTPUT=$(echo | timeout "$TIMEOUT" openssl s_client -connect "$HOST:$PORT" -servername "$HOST" 2>&1) || true
END_NS=$(date +%s%N)
HANDSHAKE_MS=$(( (END_NS - START_NS) / 1000000 ))

# 协议版本
PROTOCOL="unknown"
if echo "$OPENSSL_OUTPUT" | grep -q "TLSv1.3"; then
  PROTOCOL="1.3"
elif echo "$OPENSSL_OUTPUT" | grep -q "TLSv1.2"; then
  PROTOCOL="1.2"
fi

# 密码套件
CIPHER=$(echo "$OPENSSL_OUTPUT" | grep "Cipher" | awk '{print $NF}' || echo "unknown")

# 证书信息
CERT_INFO=$(echo "$OPENSSL_OUTPUT" | sed -n '/-----BEGIN CERT/,/-----END CERT/p' | openssl x509 -noout -subject -dates -issuer 2>/dev/null || echo "parse_failed")
CERT_SUBJECT=$(echo "$CERT_INFO" | grep "subject=" | sed 's/subject= //' || echo "unknown")
CERT_ISSUER=$(echo "$CERT_INFO" | grep "issuer=" | sed 's/issuer= //' || echo "unknown")
CERT_NOT_AFTER=$(echo "$CERT_INFO" | grep "notAfter=" | sed 's/notAfter=//' || echo "unknown")

# 证书过期检查
CERT_EXPIRED="false"
DAYS_LEFT="unknown"
if [ "$CERT_NOT_AFTER" != "unknown" ]; then
  EXPIRY_EPOCH=$(date -d "$CERT_NOT_AFTER" +%s 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
  if [ "$NOW_EPOCH" -gt "$EXPIRY_EPOCH" ] 2>/dev/null; then
    CERT_EXPIRED="true"
  fi
fi

# 协议降级测试
DOWNGRADE_TLS10="blocked"
DOWNGRADE_TLS11="blocked"
echo | timeout 5 openssl s_client -connect "$HOST:$PORT" -tls1 2>&1 | grep -q "Cipher" && DOWNGRADE_TLS10="vulnerable" || true
echo | timeout 5 openssl s_client -connect "$HOST:$PORT" -tls1_1 2>&1 | grep -q "Cipher" && DOWNGRADE_TLS11="vulnerable" || true

cat <<EOF
{
  "test_type": "tls_handshake",
  "target": "$HOST:$PORT",
  "timestamp": "$TIMESTAMP",
  "result": {
    "handshake_time_ms": $HANDSHAKE_MS,
    "protocol_version": "TLS$PROTOCOL",
    "cipher_suite": "$CIPHER",
    "cert_subject": "$CERT_SUBJECT",
    "cert_issuer": "$CERT_ISSUER",
    "cert_not_after": "$CERT_NOT_AFTER",
    "cert_days_remaining": $DAYS_LEFT,
    "cert_expired": $CERT_EXPIRED,
    "downgrade_tls10": "$DOWNGRADE_TLS10",
    "downgrade_tls11": "$DOWNGRADE_TLS11"
  },
  "status": "$([ "$CERT_EXPIRED" = "true" ] && echo "fail" || echo "ok")"
}
EOF
