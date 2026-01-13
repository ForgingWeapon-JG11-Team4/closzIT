#!/bin/bash

# elasticache-connect.command
# macOS용 ElastiCache Redis 포트 포워딩 스크립트
# 더블클릭으로 실행 가능

# ⚠️ 아래 값들을 확인하세요!
INSTANCE_ID="i-0617e4b725d90c05b"  # EC2 인스턴스 ID (RDS와 동일)
ELASTICACHE_ENDPOINT="closzit-queue.7dvcuy.ng.0001.apn2.cache.amazonaws.com"  # ElastiCache 엔드포인트

echo "========================================"
echo "🔌 ElastiCache Redis 포트 포워딩 시작..."
echo "========================================"
echo ""
echo "📍 .env 설정 정보:"
echo "   REDIS_HOST=localhost"
echo "   REDIS_PORT=6379"
echo ""
echo "⏸️  종료하려면 Ctrl + C"
echo ""

aws ssm start-session \
    --target "$INSTANCE_ID" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"$ELASTICACHE_ENDPOINT\"],\"portNumber\":[\"6379\"],\"localPortNumber\":[\"6379\"]}"
