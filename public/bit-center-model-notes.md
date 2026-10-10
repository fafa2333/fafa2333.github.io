# 北京理工大学中心教学楼 — Proportion V5 / 统一白模

本轮按用户要求收窄正面、调高顶部。沿用 V4 的加强凹凸、宽窗格和统一白模；V4 文件保留，V5 另存。

## 比例调整

- 正面朝东，画面中的左右宽度对应 Blender Y / glTF Z。沿此轴以原中心线为基准收窄 **10%**（scale 0.90）；前后深度 X 不变。
- 主楼、立面、门廊、入口基座、西侧低块和隐藏的 linked row 模板同步变换，保持窗框贴合弧面、构件间隙和装配关系。横向轮廓按本轮要求作比例修正，未重新描摹 footprint。
- 仅对高度 **43.0 以上**的顶部突出几何，按 `43 + (z - 43) × 1.40` 拉高。阶梯顶部高出中央楼体的部分由 **3.20** 增至 **4.48**，总最高点由 **46.20** 增至 **47.48**。
- 屋顶各层仍保持水平、同轴及逐级收缩。43.0 以下的主体、每层层高、门廊与圆端高度都不变，没有新增屋顶设备。
- 这是用户本轮授权的比例调整，取代之前严格锁定 footprint / 顶部高度的约束。所有对象 rotation / scale 均为已应用状态，变化写入 mesh 顶点。

## 保留的 V4 几何表现

保持宽窗格节奏、连续水平带以及窗面回退。每层的 bay 数、窗梃数、linked duplicate 数量、面连接关系均未改变。沿正面方向的窗格宽度随整体收窄；未恢复细碎分格。

V4 凸框深度 0.46、楼层带深度 0.55、窗面深度 0.025。仅前后轴 X 分量保持原值，横向 Y 分量随整体乘 0.9；几何层级仍明显。未增加 shader、point cloud、环境或新交互。

全部建筑几何共用同一个中性白材质 `#EEEEEB` / roughness 0.78 / metallic 0。纹理 0、颜色分区 0；预览相机、灯光、影棚不导出。

## 验证与统计

- 逐顶点验证仅发生指定横向变换和屋顶高度变换；所有面索引与 V4 一致。
- Blender vertices：**35,329**；GLB vertices（硬边拆点后）：**72,878**。
- triangles：**49,524**，与 V4 相同。
- GLB：**2,051,416 bytes / 1.96 MiB**。
- mesh objects：6；draw primitives：6；材质 1。
- 源模块 23 个，linked row 实例 196 个；模板几何同步收窄。
- 主体的正面跨度（不含立面浅凸边）：86.65 → 77.98；屋顶最高点：46.20 → 47.48。

## 文件与预览

- `public/models/bit-center-teaching-building-v5.glb`
- `assets/blender/bit-center-teaching-building-v5.blend`
- `scripts/build_bit_center_model_v5.py`
- `renders/bit-proportion-v5/01_front_clay.png`
- `renders/bit-proportion-v5/02_ne_3quarter_clay.png`
- `renders/bit-proportion-v5/03_sw_3quarter_clay.png`
- `renders/bit-proportion-v5/04_facade_closeup.png`
- `renders/bit-proportion-v5/05_side_closeup.png`
- `renders/bit-proportion-v5/06_top.png`
- `renders/bit-proportion-v5/07_roof_closeup.png`
- `renders/bit-proportion-v5/model-stats.json`

复现：Blender -b --python scripts/build_bit_center_model_v5.py；`-- --skip-renders` 仅导出模型。运行 `pnpm build` 将 public 源说明复制到 `docs/bit-center-model-notes.md`。只修改本地，完成后停止，不推送或部署。

## V6：正面左半边镜像对称

按用户要求，以正面左半边（Blender Y 小于 1.261929）为基准，沿中央屋顶与立面横向中心轴镜像右半边。所有建筑网格按世界坐标先切分，再镜像并反转镜像面绕序；中心线顶点共用，避免接缝重复或反向法线。主体、窗格、水平楼层带、圆柱端部、门廊、西侧低块及入口薄基座同步处理。左侧原顶点位置误差 < 0.00001，镜像对应误差 < 0.00002；保留原有高度、深度、浅凸细节和统一白材质。

V5 原文件保留，另存 `assets/blender/bit-center-teaching-building-v6.blend` 与 `public/models/bit-center-teaching-building-v6.glb`。V6 立面已烘焙，移除新文件内的旧隐藏行模板，避免继续编辑到非对称模板。总三角面 **50,104**，GLB **2.01 MiB**。

本轮只刷新线稿预览中的 BIT 建筑与白模检查页；点云 Blend、点云二进制、点数量和点云交互均不改动。Hive 模型与线稿数据不改动。线稿来源切换到 `BIT_SYMMETRY_V6`，仍基于真实面邻接提取特征边，排除三角化斜线。预览：`/wireframe-dual-preview/`。正面、俯视和 3/4 白模检查图见 `renders/bit-symmetry-v6/`。

复现：Blender -b --python scripts/build_bit_center_model_v6.py；随后 Blender -b --python scripts/export_architectural_lines.py -- --model bit。仅本地更新，不推送或发布。
