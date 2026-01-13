# elasticache-connect.ps1

# ⚠️ 아래 값들을 확인하세요!
$INSTANCE_ID = "i-0617e4b725d90c05b"  # EC2 인스턴스 ID (RDS와 동일)
$ELASTICACHE_ENDPOINT = "closzit-queue.7dvcuy.ng.0001.apn2.cache.amazonaws.com"  # ElastiCache 엔드포인트

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔌 ElastiCache Redis 포트 포워딩 시작..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 .env 설정 정보:" -ForegroundColor Yellow
Write-Host "   REDIS_HOST=localhost"
Write-Host "   REDIS_PORT=6379"
Write-Host ""
Write-Host "⏸️  종료하려면 Ctrl + C" -ForegroundColor Red
Write-Host ""

aws ssm start-session `
    --target $INSTANCE_ID `
    --document-name AWS-StartPortForwardingSessionToRemoteHost `
    --parameters "{
        \`"host\`":[\`"$ELASTICACHE_ENDPOINT\`"],
        \`"portNumber\`":[\`"6379\`"],
        \`"localPortNumber\`":[\`"6379\`"]
    }"
