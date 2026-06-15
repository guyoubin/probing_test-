# CyberProbe — 增强版拨测系统

> 基于 Uptime Kuma 架构理念，面向 AI API 代理场景的增强版网络拨测系统

## 快速开始

### 方式一：直接部署

```bash
# 安装依赖 + 构建前端 + 初始化数据库
chmod +x deploy.sh
./deploy.sh install

# 启动服务
./deploy.sh start

# 访问 http://localhost:3001
```

### 方式二：Docker 部署

```bash
docker compose up -d
# 访问 http://localhost:3001
```

## 系统要求

- Node.js >= 20
- Linux (推荐 Ubuntu 22.04+)
- 网络工具: ping, mtr, dig, traceroute

```bash
# Ubuntu 安装网络工具
apt install -y iputils-ping mtr-tiny dnsutils traceroute whois
```

## 核心特性

### 9 种 Monitor Type（插件式架构）

| 类型 | 层级 | 功能 |
|------|------|------|
| icmp-ping | L1 | ICMP 延迟、丢包率、抖动 |
| tcp-connect | L1 | TCP 握手延迟、成功率 |
| dns-resolve | L1 | DNS 解析延迟、一致性、劫持检测 |
| tls-handshake | L2 | TLS 握手、协议降级、证书检测 |
| http-api | L3 | HTTP TTFB/TTLB、API 功能测试 |
| sse-streaming | L3 | SSE 首Token延迟、Token/s、断连率 |
| traceroute-mtr | L1 | MTR 路由追踪、AS 路径分析 |
| bandwidth | L1 | 可用带宽估测 |
| business-logic | L4 | AI API 业务正确性验证 |

### 8 种通知渠道

Webhook / 飞书 / 钉钉 / 企业微信 / Telegram / SMTP / Slack / Discord

### 架构特性

- Socket.IO 双向实时通信
- 插件式 MonitorType + NotificationProvider
- setTimeout 链式 Beat 心跳循环
- SQLite (WAL) + Knex 迁移
- 链路质量评分引擎 (0-100)
- 赛博朋克 UI 主题

## 项目结构

```
server/           # 后端 (Node.js + Express + Socket.IO)
  model/          # 数据模型
  monitor-types/  # 9种监控类型插件
  notification-providers/ # 8种通知Provider
  socket-handlers/ # Socket.IO 事件处理
  scoring/        # 评分引擎
  report/         # 报告生成器
  routers/        # REST API
src/              # 前端 (Vue 3 + Vite)
  pages/          # 8个页面
  components/     # 通用组件
  assets/         # 赛博朋克主题CSS
db/               # 数据库迁移
standalone-scripts/ # 独立可执行拨测脚本
```

## 独立脚本

`standalone-scripts/` 目录包含可独立运行的拨测脚本：

| 脚本 | 语言 | 用法 |
|------|------|------|
| icmp_ping_test.sh | Bash | `./icmp_ping_test.sh 8.8.8.8` |
| tcp_connect_test.sh | Bash | `./tcp_connect_test.sh example.com 443` |
| dns_resolve_test.sh | Bash | `./dns_resolve_test.sh example.com` |
| tls_handshake_test.sh | Bash | `./tls_handshake_test.sh example.com` |
| http_api_test.py | Python | `python3 http_api_test.py <url> --api-key sk-xxx` |
| traceroute_test.py | Python | `python3 traceroute_test.py 8.8.8.8` |
| bandwidth_test.sh | Bash | `./bandwidth_test.sh <url>` |
| business_logic_test.py | Python | `python3 business_logic_test.py --base-url <url> --api-key <key>` |
| comprehensive_prober.sh | Bash | `./comprehensive_prober.sh config.json` |

## 登录

首次访问自动跳转 Setup 页面创建管理员。默认无预设账号。
