# Tailscale 家庭电脑配置指南

## 目标

在家里的电脑上配置 Tailscale，实现与公司电脑的 SSH 互联。

## 公司电脑信息（已配置完成）

| 项目 | 值 |
|------|-----|
| 设备名 | `enyoumacbook-pro` |
| Tailscale IP | `100.92.27.101` |
| Tailscale 账号 | `saldarriagacesar427@` |
| SSH 用户名 | `enyousun` |
| 系统 | macOS |
| Tailscale 版本 | 1.94.2 |
| SSH 服务 | 已开启（远程登录） |
| 远程管理 | 已开启 |

## 家里电脑需要完成的步骤

### 1. 安装 Tailscale

- 下载地址: https://tailscale.com/download
- macOS 可直接从 App Store 或官网下载
- Linux/Windows 参考官网对应平台安装指引

### 2. 登录 Tailscale

> **必须使用同一个账号 `saldarriagacesar427@` 登录**

```bash
# macOS / Linux 命令行
tailscale login
```

终端会输出一个认证 URL，在浏览器中打开并用上述账号登录。

### 3. 验证连接

```bash
# 检查是否登录成功并看到公司电脑
tailscale status
```

应看到类似输出：
```
100.92.27.101  enyoumacbook-pro  saldarriagacesar427@  macOS  -
100.x.x.x     家里设备名         saldarriagacesar427@  ...    -
```

### 4. 开启 SSH 服务（如需从公司反向 SSH 到家里）

**macOS:**
- 系统设置 → 通用 → 共享 → 打开「远程登录」

**Linux:**
```bash
sudo systemctl enable ssh
sudo systemctl start ssh
```

### 5. 测试 SSH 连接

```bash
# 从家里 SSH 到公司电脑
ssh enyousun@100.92.27.101

# 或通过设备名
ssh enyousun@enyoumacbook-pro
```

### 6.（可选）配置 SSH 免密登录

```bash
# 在家里电脑上生成密钥（如果还没有）
ssh-keygen -t ed25519

# 将公钥复制到公司电脑
ssh-copy-id enyousun@100.92.27.101
```

之后 SSH 连接就不需要输入密码了。

### 7.（可选）配置 SSH 快捷方式

在家里电脑的 `~/.ssh/config` 中添加：

```
Host company
    HostName 100.92.27.101
    User enyousun
```

之后只需 `ssh company` 即可连接。

## 验证清单

- [ ] Tailscale 已安装
- [ ] 已用 `saldarriagacesar427@` 账号登录
- [ ] `tailscale status` 能看到公司电脑 `enyoumacbook-pro`
- [ ] `ssh enyousun@100.92.27.101` 能成功连接
- [ ] （可选）家里电脑 SSH 服务已开启
- [ ] （可选）SSH 免密登录已配置
