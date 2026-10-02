# 李玉夫的作品集

采用柔和灰色背景、白色圆角卡片与石墨色文字的个人作品集，适配手机与电脑。
首页和项目页统一使用系统字体、轻阴影、灰色细边框与非对称图文布局。
首页首屏展示姓名、个人简介、联系邮箱与装饰图片预留；下方依次为作品集目录、个人能力、教育背景时间轴。

网站地址：https://fafa2333.github.io/

## 页面结构

- `index.html`：01 个人简介、02 作品集目录、03 个人能力、04 教育背景。
- `projects/butterfly.html`：仿生蝴蝶飞行器。
- `projects/obstacle-robot.html`：仿生越障机器人。
- `projects/material-handling-robot.html`：移动物料搬运机器人。
- `assets/site.css`：首页和子页面共用的工业风样式。

公开联系邮箱为 `yufuli99@gmail.com`，点击可打开邮件客户端。
四项个人能力在桌面端横向并排，平板端两列、手机端单列；语言能力与前三项共用同样的技能卡片样式，完整列出 CET-4、CET-6 和 IELTS 7.0。
教育经历按本科到硕士的时间顺序展示，学校和专业采用中英文左右对应的双语排版。

首页个人照片已移除，原照片文件暂存于 `assets/portrait.png`，页面不引用它。
装饰图使用中性的 SVG 线框标记作为位置提示，不代表实际项目模型。

## 图片位置与后续补充材料

- `D01`：个人简介右侧的装饰图，建议使用机械模型、金属细节或材料肌理。
- `D02`：教育时间轴旁的装饰图，建议使用校园、实验室或学习记录。
- `P01` / `P02` / `P03`：作品目录卡片与对应项目页共用的封面位置。
- `FIG. 01` 至 `FIG. 06`：各项目的三组过程图片，保留不等宽及错位布局。

更换封面和装饰图时，可在 `.visual-placeholder` 中放入 `<img>`，并移除线框 SVG 和待补充标记。
现有样式会自动填满封面区域；图纸及仿真结果建议使用项目页的 `.image-slot`，以保留图片完整比例。


每个项目页已有项目概览、5 个工作流程阶段和3 组图片区域，共6 个图片位置。
流程标题是初步整理的框架，后续可按实际材料调整。

将图片放入对应项目的资源目录，替换页面中的 `.media-placeholder`，并更新图片说明。
图片可使用 `<img src="../assets/项目目录/图片名.jpg" alt="具体图片内容">`；图片样式保持宽度100%，高度自动。
工作流程中的 `.slot-note` 为待补充说明的位置，可替换为实际过程描述。

网页使用原生 HTML 和 CSS，不需要安装依赖或构建。
GitHub Pages 从 `main` 分支的根目录发布，`.nojekyll` 让静态文件直接上线。

英文名称参考学校官方资料：[北京理工大学](https://isc.bit.edu.cn/admissionsaid/undergraduatate/mechanical/znzzgc/index.htm)、[北理工英文培养资料](https://ac.bit.edu.cn/docs/2023-04/60a4e9e332e84f23982c0cd345da0190.pdf)、[南洋理工大学](https://www.ntu.edu.sg/education/graduate-programme/master-of-science-in-smart-manufacturing)。
