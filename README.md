# 蔚来智居 ERP · 产品官网

装修公司全流程管理系统的产品宣传页。纯静态单页（HTML + CSS + 原生 JS），无构建步骤。

**线上地址**：https://xiabai1.github.io/weilai-erp-site/ （正式域名 蔚来智居.中国 的指向待定，见下方「部署位置」）

## 目录结构

```
index.html          页面结构（含 SEO / OG / JSON-LD 标签）
assets/style.css    样式（含移动端菜单、截图带等）
assets/main.js      交互逻辑（表单、菜单、下载下拉）；顶部 CONFIG 是全站唯一要改的配置
assets/sea.js       WebGL 黄昏海岸背景（已定稿，勿动；内含完整降级链）
assets/app/         业主端 App 真机截图 + 下载二维码
assets/og-image.png 分享卡片图（用 tools/og_gen.py 重新生成）
downloads/          安装包（不入库，走 GitHub Release，见下）
tools/og_gen.py     分享图生成脚本（python3 tools/og_gen.py，需 pillow）
```

## 常改配置（都在 `assets/main.js` 顶部 `CONFIG`）

- `phone`：客服电话，全站展示统一取这里
- `formEndpoint`：试用申请提交接口（POST JSON）。留空 = 仅在本机 localStorage 暂存（key：`njwz_trial_leads`）；
  ERP 的 `POST /api/public/lead` 上线后填入即可（注意按交接文档 A6 对字段：type/name/phone/email/content）

## 流水线（推送即部署）

仓库启用 GitHub Pages（分支部署）：**push 到 `main` 自动发布**，约 1 分钟生效，无构建步骤。
查看发布状态：仓库 → Settings → Pages，或 `gh api repos/xiabai1/weilai-erp-site/pages`。

正式域名解析到 Pages 或改走阿里云 OSS + CDN 时，同步修改：
`index.html` 里 canonical / og:url / og:image 三处 + `robots.txt` + `sitemap.xml`（HTML 顶部有 TODO 注释）。

## 更新安装包

安装包不进 git（单个 100MB+），以 **GitHub Release 资产**分发，页面下载链接指向 Release：

```bash
# 1. 把新安装包按 ASCII 名拷出来
cp 蔚来智居_1.0.5_aarch64.dmg /tmp/WeilaiZhiju_1.0.5_aarch64.dmg
# 2. 追加到现有 Release（或 gh release create 新开一个版本）
gh release upload installers /tmp/WeilaiZhiju_1.0.5_aarch64.dmg --clobber
# 3. 改 index.html 下载菜单里的版本号和文件名，commit + push
```

## 本地预览

```bash
python3 -m http.server 8123
# 打开 http://127.0.0.1:8123
```
