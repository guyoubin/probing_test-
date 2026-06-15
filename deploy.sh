#!/usr/bin/env bash
#=============================================
# CyberProbe 一键部署脚本
# 用法: ./deploy.sh [install|start|stop|restart|status|logs]
#=============================================

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

# 颜色
RED='\033[0;31m'; CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

check_deps() {
    echo -e "${CYAN}检查依赖...${NC}"
    if ! command -v node &>/dev/null; then
        echo -e "${RED}未找到 Node.js，请先安装 Node.js >= 20${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
    if ! command -v npm &>/dev/null; then
        echo -e "${RED}未找到 npm${NC}"
        exit 1
    fi
}

check_tools() {
    echo -e "${CYAN}检查网络工具...${NC}"
    for tool in ping mtr dig traceroute; do
        if command -v "$tool" &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} $tool"
        else
            echo -e "  ${YELLOW}!${NC} $tool 未安装，部分测试不可用"
        fi
    done
}

do_install() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  CyberProbe 安装${NC}"
    echo -e "${CYAN}========================================${NC}"
    check_deps
    check_tools

    echo -e "${CYAN}安装 npm 依赖...${NC}"
    npm install --production

    echo -e "${CYAN}构建前端...${NC}"
    if [ -d "src" ]; then
        npm install --save-dev vite @vitejs/plugin-vue vue vue-router chart.js vue-chartjs socket.io-client
        npx vite build
    fi

    echo -e "${CYAN}初始化数据库...${NC}"
    mkdir -p data/reports
    env -i HOME=$HOME PATH=$PATH USER=$(whoami) node db/knex_init_db.js

    echo -e "${GREEN}安装完成！运行 ./deploy.sh start 启动服务${NC}"
}

do_start() {
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}未安装依赖，先执行安装...${NC}"
        do_install
    fi

    echo -e "${GREEN}启动 CyberProbe...${NC}"
    nohup node server/server.js > cyberprobe.log 2>&1 &
    echo $! > cyberprobe.pid
    sleep 2

    if kill -0 $(cat cyberprobe.pid) 2>/dev/null; then
        echo -e "${GREEN}CyberProbe 已启动 (PID: $(cat cyberprobe.pid))${NC}"
        echo -e "  访问地址: ${CYAN}http://localhost:3001${NC}"
    else
        echo -e "${RED}启动失败，查看日志: cat cyberprobe.log${NC}"
        exit 1
    fi
}

do_stop() {
    if [ -f cyberprobe.pid ]; then
        kill $(cat cyberprobe.pid) 2>/dev/null && echo -e "${GREEN}已停止${NC}" || echo -e "${YELLOW}进程已不存在${NC}"
        rm -f cyberprobe.pid
    else
        echo -e "${YELLOW}未找到 PID 文件${NC}"
    fi
}

do_restart() {
    do_stop
    sleep 1
    do_start
}

do_status() {
    if [ -f cyberprobe.pid ] && kill -0 $(cat cyberprobe.pid) 2>/dev/null; then
        echo -e "${GREEN}CyberProbe 运行中 (PID: $(cat cyberprobe.pid))${NC}"
        curl -s http://localhost:3001/api/status 2>/dev/null | python3 -m json.tool 2>/dev/null || \
        curl -s http://localhost:3001/api/status
    else
        echo -e "${RED}CyberProbe 未运行${NC}"
    fi
}

do_logs() {
    tail -f cyberprobe.log 2>/dev/null || echo -e "${YELLOW}无日志文件${NC}"
}

case "${1:-}" in
    install)  do_install ;;
    start)    do_start ;;
    stop)     do_stop ;;
    restart)  do_restart ;;
    status)   do_status ;;
    logs)     do_logs ;;
    *)
        echo "CyberProbe 部署工具"
        echo ""
        echo "用法: $0 <命令>"
        echo ""
        echo "  install   安装依赖 + 构建前端 + 初始化数据库"
        echo "  start     启动服务"
        echo "  stop      停止服务"
        echo "  restart   重启服务"
        echo "  status    查看状态"
        echo "  logs      查看实时日志"
        ;;
esac
