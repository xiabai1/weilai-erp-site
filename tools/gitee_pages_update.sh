#!/bin/bash
# 触发 Gitee Pages 重新构建(免费版 Pages 推送后需手动更新,用这个脚本可代替点按钮)
# 前提:仓库已在 Gitee 网页开通 Pages(服务 → Gitee Pages),并生成过私人令牌(勾选 projects 权限)
# 用法:GITEE_TOKEN=你的令牌 ./tools/gitee_pages_update.sh
set -e
if [ -z "$GITEE_TOKEN" ]; then
  echo "用法:GITEE_TOKEN=你的私人令牌 $0"
  exit 1
fi
code=$(curl -sS -o /tmp/gitee_pages_resp.json -w "%{http_code}" -X POST \
  "https://gitee.com/api/v5/repos/tang-yingjie0/weilai-erp-site/pages/builds" \
  -d "access_token=$GITEE_TOKEN")
cat /tmp/gitee_pages_resp.json; echo
if [ "$code" = "200" ] || [ "$code" = "201" ]; then
  echo "✅ Pages 构建已触发,约 1 分钟后生效"
else
  echo "❌ 触发失败(HTTP $code):确认已开通 Pages、令牌含 projects 权限"
  exit 1
fi
