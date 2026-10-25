#!/usr/bin/env python3
# 备用推送通道:github.com 直连不通时,经 api.github.com 把当前工作区内容推到远端 main
# 用法:python3 tools/api_push.py "提交说明"(需要 gh 已登录;首次对空仓库会自动引导)
# 通过 Git Data API 推送当前 HEAD 的内容(github.com 直连不可用时的替代通道)
import subprocess, json, base64, sys, os

REMOTE = "repos/xiabai1/weilai-erp-site"

def gh(endpoint, payload=None, method="POST", fields=None):
    cmd = ["gh", "api", endpoint, "-X", method]
    inp = None
    if fields is not None:
        for k, v in fields.items():
            cmd += ["-f", f"{k}={v}"]
    elif payload is not None:
        cmd += ["--input", "-"]
        inp = json.dumps(payload)
    r = subprocess.run(cmd, input=inp, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{endpoint}: {r.stderr.strip()[:300]}")
    return json.loads(r.stdout) if r.stdout.strip() else None

def sh(*args):
    return subprocess.run(args, capture_output=True, text=True, check=True).stdout.strip()

os.chdir(os.path.expanduser("~/Desktop/蔚来智居官网"))
message = sys.argv[1] if len(sys.argv) > 1 else sh("git", "log", "-1", "--pretty=%B")

# 空仓库引导:Git Data API 在无任何提交时返回 409,先用 Contents API 建第一个提交
try:
    gh(f"{REMOTE}/contents", method="GET")  # 根目录可列出 = 仓库非空,Git Data API 可用
    print("仓库非空,跳过引导")
except RuntimeError as e:
    if "empty" in str(e):
        gh(f"{REMOTE}/contents/bootstrap.md",
           fields={"message": "bootstrap", "content": base64.b64encode("init\n".encode()).decode()})
        print("已引导空仓库")
    else:
        raise

tree = []
for f in sh("git", "ls-files").splitlines():
    with open(f, "rb") as fp:
        data = base64.b64encode(fp.read()).decode()
    blob = gh(f"{REMOTE}/git/blobs", {"content": data, "encoding": "base64"})
    tree.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    print("blob:", f)

t = gh(f"{REMOTE}/git/trees", {"tree": tree})

# 若远端 main 已存在,则在其上追加提交;否则建根提交
heads = gh(f"{REMOTE}/git/refs/heads/main", method="GET") if False else None
try:
    ref = gh(f"{REMOTE}/git/ref/heads/main", method="GET")
    parent = ref["object"]["sha"]
    c = gh(f"{REMOTE}/git/commits", {"message": message, "tree": t["sha"], "parents": [parent]})
    gh(f"{REMOTE}/git/refs/heads/main", {"sha": c["sha"]}, method="PATCH")
    print("已追加提交到远端 main:", c["sha"][:10])
except RuntimeError:
    c = gh(f"{REMOTE}/git/commits", {"message": message, "tree": t["sha"], "parents": []})
    gh(f"{REMOTE}/git/refs", {"ref": "refs/heads/main", "sha": c["sha"]})
    print("已创建远端 main:", c["sha"][:10])
