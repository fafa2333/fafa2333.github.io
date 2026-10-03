# 李玉夫的工程作品集

网址：https://fafa2333.github.io/

React + Vite 多页面项目，采用水泥灰、白色与少量荧光黄。GSAP / ScrollTrigger 负责入场与滚动动效；尊重系统“减少动态效果”偏好。

## 开发与发布

Node.js 24，pnpm 11。

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
```

`pnpm build` 输出到 `docs/`。GitHub Pages 使用 `main` 分支的 `/docs` 目录；构建产物随源码一起提交、Git push 后发布。不需要额外服务器，子页面刷新和旧链接继续可用。

## 结构

- `src/main.jsx`：共享导航、全屏 Hero、交互式作品目录、四项个人能力、教育时间轴、收尾联系方式与项目详情组件。
- `src/styles.css`：响应式布局、统一排版和克制的工程视觉。
- `src/projects.json`：三个项目的已有内容、指标、5 个流程阶段及每页 3 组 / 6 张图片。
- `src/media.js`：Hero 视频、海报、教育装饰图设置。
- `index.html`、`projects/*.html`：Vite 多页面入口。保留原来的项目网址。
- `public/media/`：可直接引用的媒体。
- `docs/`：生成的发布文件，修改源码后重新构建，不直接编辑。

桌面视口宽度至少 1000px、高度至少 560px 时，首页四个分区各占 `100svh`，包含固定导航栏的留白。教育背景与收尾联系方式合并在最后一屏，上方为教育时间轴和图片预留，下方为紧凑的深灰联系区，不再显示“05 保持联系”小标题。作品展示区与教育时间轴按屏幕剩余高度分配空间；较小视口和手机端保持内容自然滚动。项目详情页保持原有长页布局。

首页分区进入视口时，标题、图像、卡片与联系元素依次淡入并轻微上移；离开后重置，再次进入可重播。作品大图与说明也在进入目录时依次显现，切换项目继续保留原转场。桌面首页采用 CSS `scroll-snap-type: y proximity` 轻微吸附，允许自由跨越多个分区；手机端和项目详情页不吸附。系统启用“减少动态效果”时，不播放入场、视差和吸附效果，内容保持直接可见。

## 媒体替换

首屏当前使用自制的 8 秒无声齿轮啮合线稿循环视频，2880×1800、24fps、MP4 / H.264。同模数的 30 齿与 20 齿齿轮在同一投影平面内反向联动，转速比为 1:1.5，沿用浅水泥灰、灰色细线和少量黄绿色轴心，不绘制轴心十字线。视频采用高分辨率抗锯齿和较低压缩，主轮廓与后侧线条保留明暗层次；右侧视频、简介与邮箱使用一致的自适应下移量，短屏自动收紧。属于抽象工程视觉，不代表真实项目模型。视频及匹配海报为 `public/media/hero-gears.mp4` 和 `hero-gears-poster.jpg`。生成源码在 `scripts/render-hero-gears.py`，需要 Pillow 和 ffmpeg，可用 `python scripts/render-hero-gears.py --ffmpeg /path/to/ffmpeg` 重新生成；网站构建和发布不依赖这些工具。

支持暂停、视频失败时使用海报、减少动态效果时默认静止，以及离开首屏时暂停。可在 `src/media.js` 替换 `heroVideo`、`heroPoster`，换上自己的视频后将 `heroIsPlaceholder` 设为 `false`。建议使用压缩后的横向 MP4 / H.264，提供静态海报。

作品目录左侧使用用户提供的三个 PNG 线稿图标，依次为蝴蝶、四足机器人、移动机械臂，存放于 `public/media/project-icons/`，纵向排列；点击后右侧切换对应大图、名称、简介、指标及详情入口。图像显现与文字错峰入场由 GSAP 实现，支持连续快速切换、方向键及 Home / End，尊重减少动态效果偏好。大图占位属于概念示意，不是实际项目模型。

项目封面 `P01/P02/P03`：在 `src/projects.json` 填写 `cover` 和具体 `coverAlt`，封面同时用于目录展示区与项目页。目录大图使用 `object-fit: contain`，推荐透明背景渲染或干净背景的整机图片。

教育装饰图 `D02`：在 `src/media.js` 填写 `educationImage`。

各项目的 `FIG.01–06`：在 `src/projects.json` 对应 `gallery[].images[]` 填写 `src`、`title`。封面填满图片框，图纸与过程图保留原始比例。空路径展示明确标记的示意线稿与待补充说明，不虚构作品图片。

将素材放在 `public/media/`，以 `/media/文件名.jpg` 引用，再运行 `pnpm build` 并提交源码和 `docs/`。

公开联系方式：`yufuli99@gmail.com`。原个人照片 `assets/portrait.png` 留存在源码目录，不参与构建或页面展示。
