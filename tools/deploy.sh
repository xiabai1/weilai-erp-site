#!/bin/bash
# 双远端部署:主推 Gitee(代码托管稳定),GitHub 尽力同步(Pages 发布依赖它)
# 用法:./tools/deploy.sh  (在 main 分支、已 commit 的前提下)
set -e
cd "$(dirname "$0")/.."

echo "▶ 推送 Gitee(origin)…"
git push origin main
echo "✅ Gitee 已更新"

echo "▶ 同步 GitHub(github)…"
if git push github main; then
  echo "✅ GitHub 已同步,Pages 将自动重新发布"
else
  echo "⚠️ GitHub 推送失败(网络原因),不影响 Gitee;网络恢复后执行:git push github main"
  exit 0
fi
