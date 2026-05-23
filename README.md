# At - Photos

基于 Ionic + Angular 17 的现代照片画廊应用，部署于 Cloudflare Workers。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Angular 17 (Standalone) |
| UI | Ionic 7 |
| 样式 | SCSS |
| 动画 | Angular Animations |
| 平台 | Cloudflare Workers |
| 元数据 | Cloudflare KV |
| 图片存储 | Cloudflare R2 |
| 剪贴板 | ngx-clipboard |

## 功能

- 响应式瀑布流照片画廊，自适应各尺寸屏幕
- 点击照片放大查看（Lightbox），支持左右导航
- 分享照片链接（复制到剪贴板）
- 查看原图 / 下载照片（Worker 代理绕过 CORS）
- 浅色主题，简洁优雅

## 项目结构

```
src/
├── app/
│   ├── gallery/                    # 画廊组件（主页面）
│   │   ├── gallery.component.ts    # 逻辑：数据加载、lightbox、分享/下载
│   │   ├── gallery.component.html  # 模板：瀑布流 + lightbox 弹窗
│   │   └── gallery.component.scss  # 样式：响应式列布局 + 动画
│   ├── splash-page/                # 启动页组件
│   ├── disable-right-click.directive.ts  # 禁用右键指令
│   ├── photos.model.ts             # Photo 类型定义
│   ├── app.component.ts            # 根组件
│   └── app.routes.ts               # 路由配置
├── assets/
│   ├── icons/                      # PWA 图标
│   └── Papyrus V1.woff             # 标题字体
├── environments/
│   ├── environment.ts              # 开发环境配置
│   └── environment.prod.ts         # 生产环境配置（R2 域名等）
├── theme/variables.scss            # Ionic 主题变量
├── global.scss                     # 全局样式 + 字体定义
├── worker.ts                       # Cloudflare Worker 入口
├── index.html                      # HTML 入口
└── manifest.webmanifest            # PWA 清单
angular.json                        # Angular 构建配置
wrangler.toml                       # Cloudflare Wrangler 配置
```

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm start
```

## 部署

### 前置条件

1. 安装 [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI

   ```bash
   npm install -g wrangler
   ```

2. 登录 Cloudflare 账号

   ```bash
   npx wrangler login
   ```

3. 创建以下 Cloudflare 资源并修改 `wrangler.toml` 中的绑定配置：

   | 资源 | 说明 |
   |------|------|
   | KV Namespace | 用于存储照片元数据，将 Namespace ID 填入 `wrangler.toml` 的 `id` 字段 |
   | R2 Bucket | 用于存储照片文件，将存储桶名称填入 `bucket_name` 字段 |

### 上传照片到 R2

将照片文件上传到 R2 存储桶，WebP 缩略图放入 `img/` 目录，原图放入 `org/` 目录。

### 写入照片元数据到 KV

将照片元数据以 JSON 数组格式写入 KV，key 为 `photos`：

```bash
# 批量写入（从 JSON 文件）
npx wrangler kv key put --remote photos --path ./photos.json --binding KV

# 或通过 Worker /docs/ 端点的初始化逻辑自动写入（需自行实现）
```

每条照片记录格式：

```json
[
  {
    "description": "照片描述",
    "date": "2024-01-01",
    "images": [
      { "img": "DSCN0803.jpg", "webp": "DSCN0803" }
    ]
  }
]
```

### 构建并部署

```bash
# 方式一：一键部署
npm run deploy

# 方式二：分步执行
npm run build
npx wrangler deploy
```

构建产物生成在 `www/` 目录，由 Worker Assets 绑定托管。部署完成后即可通过 `https://<worker-name>.<subdomain>.workers.dev` 访问。

## Cloudflare 绑定

Worker 使用以下绑定（定义于 `wrangler.toml`）：

| 绑定 | 类型 | 用途 |
|------|------|------|
| `KV` | KV Namespace | 照片元数据存储 |
| `R2` | R2 Bucket | 照片文件存储（`photo` 桶） |
| `ASSETS` | Assets | 静态资源（`./www`） |

## Worker API

| 端点 | 说明 |
|------|------|
| `/docs/` | 返回全部照片元数据（JSON，从 KV 读取） |
| `/api/r2-download/*` | 代理 R2 文件下载（设置 `Content-Disposition: attachment`，绕过 CORS） |

所有其他路径回退到 SPA 的 `index.html`。

## 版权

Copyright &copy; 2026 ATBSPB. All rights reserved.