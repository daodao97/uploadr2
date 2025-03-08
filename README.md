# Uploadr2

基于 Cloudflare Workers 构建的文件上传服务。使用 Hono 框架开发，支持文件上传和管理功能。

## 特性

- 基于 Cloudflare Workers 的高性能文件处理
- 使用 Hono 框架构建的现代化 API
- TypeScript 支持，提供完整的类型定义
- 支持文件上传和管理功能

## 技术栈

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/) - 轻量级的 Web 框架
- TypeScript
- Wrangler CLI - Cloudflare Workers 命令行工具

## 开始使用

### 前置要求

- Node.js 18.0.0 或更高版本
- npm 或 yarn
- Cloudflare 账号

### 安装

1. 克隆仓库：

```bash
git clone https://github.com/daodao97/uploadr2.git
cd uploadr2
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境：

复制 `wrangler.jsonc.example` 为 `wrangler.jsonc` 并根据需要修改配置。

```shell
cp wrangler.jsonc.example wrangler.jsonc 
```

修改  `$YOUR_BUCKET_NAME` 为你自己的桶名称

### 开发

运行开发服务器：

```bash
npm run dev
```

### 部署

部署到 Cloudflare Workers：

```bash
npm run deploy
```

## 配置

项目使用 `wrangler.jsonc` 进行配置，主要配置项包括：

- Cloudflare Workers 相关配置
- 环境变量设置
- 绑定设置

## 开发

### 生成类型定义

```bash
npm run cf-typegen
```

## License

MIT

