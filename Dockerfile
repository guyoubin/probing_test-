FROM node:22-alpine

# 安装网络工具（ping, mtr, dig, traceroute）
RUN apk add --no-cache iputils mtr bind-tools traceroute whois bash

WORKDIR /app

# 复制依赖定义
COPY package.json package-lock.json* ./
RUN npm install --production

# 复制源码
COPY server/ ./server/
COPY db/ ./db/
COPY dist/ ./dist/

# 数据目录
RUN mkdir -p /app/data/reports
VOLUME /app/data

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/server.js"]
