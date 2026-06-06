# Textbook2Galgame — 苏格拉底式聊天学习助手

通过与 AI 角色实时对话，用苏格拉底提问和费曼学习法深入理解高阶数学和理论物理教材。

## 核心理念

> 苏格拉底提问 + 费曼学习法在理论上很优秀，但现实中没人给你当苏格拉底式的导师，也没人逼你用大白话复述。AI 角色来填补这个空缺。

- **不是你听课，是 AI 角色跟你聊天**：上传 PDF 后，选择一个导师角色，以自然对话的方式学习
- **不直接告诉答案**：角色用苏格拉底式提问引导你自己发现概念
- **不用术语糊弄过去**：角色会追问你用大白话解释，做费曼检验
- **不在你困惑时跳过**：角色必须确认你真正理解了才会推进到下个话题

## 七位导师

| 角色 | 头像 | 学科 | 教学风格 |
|------|------|------|----------|
| **林教授** | 👩‍🏫 | 广义相对论 / 微分几何 | 严格冷幽默，苏格拉底反问，重物理直觉 |
| **小陆** | 🧑‍💻 | 群论 / 表示论 | 话痨爱打比方，费曼检验，颜文字混用 |
| **陈师姐** | 👩‍🔬 | 量子力学 / 量子场论 | 温柔追问，日常类比，知识连贯 |
| **老周** | 👨‍🏫 | 四大力学基础 | 老派严谨，板书式一步步推导 |
| **拓扑猫** | 🐱 | 拓扑学 / 代数拓扑 | 脑回路清奇，奇怪但精准的比喻 |
| **学妹小安** | 👧 | 学习伙伴 / 费曼检验 | 同伴视角，撒娇式追问 |
| **弦学者** | 🎻 | 弦论 / SUSY / 数学物理 | 哲学思辨，第一性原理 |

每个角色有独立的人设、学科领域和教学风格，在设置页自由切换。

## 功能

- **实时聊天学习**：上传 PDF → AI 角色以该教材为素材，通过对话辅导你学习
- **三种学习模式**：苏格拉底式提问、费曼学习法、引导式教学
- **PDF 文本提取**：浏览器端解析 + Tesseract.js OCR 回退（扫描版 PDF 也能用）
- **LaTeX 渲染**：数学公式通过 KaTeX 在聊天界面中实时渲染
- **对话持久化**：localStorage 自动保存，关闭浏览器后可以继续学
- **中英文切换**：界面和对话语言独立选择
- **高阶资源库**：内置 David Tong、MIT OCW 等公开讲义链接和衔接路径
- **人格蒸馏**：上传微信聊天记录，让 AI 角色模仿你的说话风格

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API 密钥
cp .env.example .env.local
# 编辑 .env.local，填入你的密钥

# 3. 启动
npm run dev
# 浏览器打开 http://localhost:3000
```

## API 密钥

项目支持两种 AI 后端，在 `.env.local` 中配置：

```bash
# DeepSeek（国内可用，推荐）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
DEEPSEEK_MODEL=deepseek-v4-pro

# Gemini（需要代理/VPN）
GEMINI_API_KEY=xxxxxxxxxxxxxxxx
```

在设置页选择使用哪个模型。

### Gemini 模型选择

| 模型 | 费用 | 说明 |
|------|------|------|
| `gemini-2.5-flash` | 免费 | 默认，快速响应 |
| `gemini-2.5-pro` | 付费 | 推理更强，2M 上下文，适合复杂数学推导 |

切换模型：修改 `constants.ts` 中的 `GEMINI_MODEL`。

### DeepSeek

DeepSeek 国内可直接访问，价格极低。默认使用 `deepseek-v4-pro`。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | React 19 + TypeScript 5.8 (strict) |
| 构建 | Vite 6 |
| 数学渲染 | KaTeX |
| PDF 解析 | pdfjs-dist + Tesseract.js OCR |
| AI 代理 | Vite 中间件代理 Gemini / DeepSeek API |
| 样式 | Tailwind CSS (CDN) |
| 持久化 | localStorage |

## 项目结构

```
├── App.tsx                    # 根组件，状态机驱动
├── types.ts                   # 共享类型定义
├── constants.ts               # 配置常量
├── vite.config.ts             # Vite 构建 + API 代理
│
├── components/
│   ├── ChatSessionScreen.tsx   # ★ 实时聊天主界面
│   ├── TitleScreen.tsx         # 首页
│   ├── UploadScreen.tsx        # PDF 导入
│   ├── SettingsScreen.tsx      # 学习设置 + 角色选择
│   ├── ResourceLibraryScreen.tsx # 高阶资源库
│   ├── PersonalityDistillScreen.tsx # 人格蒸馏
│   └── LatexText.tsx           # KaTeX 渲染组件
│
├── services/
│   ├── aiService.ts            # Gemini / DeepSeek API 调用
│   ├── prompts.ts              # AI 系统提示词工程
│   ├── pdfTextService.ts       # PDF 文本提取 + OCR
│   ├── localStorageService.ts  # 本地持久化
│   ├── personalityService.ts   # 聊天记录分析
│   └── jsonParser.ts           # JSON 解析与修复
│
├── hooks/
│   └── useTypewriter.ts        # 打字机动画效果
│
├── data/
│   ├── characters.ts           # 内置角色定义
│   └── advancedResources.ts    # 高阶数学物理资源库
│
└── teacher/                    # 教学系统设计文档
```

## 适用领域

- 微分几何、黎曼几何
- 拓扑学、代数拓扑
- 群论、李群与表示论
- 纤维丛与规范场论
- 量子力学、量子场论
- 四大力学（经典力学、电动力学、统计力学、量子力学）
- 弦论、超对称、数学物理
- 其他高阶数学和理论物理教材

## License

MIT
