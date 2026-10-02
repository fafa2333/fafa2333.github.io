# 李玉夫的作品集

浅水泥灰与白色的工业感个人作品集，适配手机与电脑。
首页首屏仅展示姓名、个人简介与联系邮箱；下方依次为作品集目录、技术与语言能力、教育背景时间轴。

网站地址：https://fafa2333.github.io/

## 页面结构

- `index.html`：01 个人简介、02 作品集目录、03 技术与语言能力、04 教育背景。
- `projects/butterfly.html`：仿生蝴蝶飞行器。
- `projects/obstacle-robot.html`：仿生越障机器人。
- `projects/material-handling-robot.html`：移动物料搬运机器人。
- `assets/site.css`：首页和子页面共用的工业风样式。

公开联系邮箱为 `yufuli99@gmail.com`，点击可打开邮件客户端。
语言能力完整列出 CET-4、CET-6 和 IELTS 7.0；教育经历按本科到硕士的时间顺序展示。

首页照片已移除，原照片文件暂存于 `assets/portrait.png`，页面不引用它。

## 后续补充材料

每个项目页已有项目概览、5 个工作流程阶段和3 组图片区域，共6 个图片位置。
流程标题是初步整理的框架，后续可按实际材料调整。

将图片放入对应项目的资源目录，替换页面中的 `.media-placeholder`，并更新图片说明。
图片可使用 `<img src="../assets/项目目录/图片名.jpg" alt="具体图片内容">`；图片样式保持宽度100%，高度自动。
工作流程中的 `.slot-note` 为待补充说明的位置，可替换为实际过程描述。

网页使用原生 HTML 和 CSS，不需要安装依赖或构建。
GitHub Pages 从 `main` 分支的根目录发布，`.nojekyll` 让静态文件直接上线。
