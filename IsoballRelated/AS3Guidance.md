# Isoball 1代 ActionScript 3 编码指南

> 基于 `新1代.as` 和 `isoball1_maintimeline_20260912.as` 编写
> 基线版本：`Original_Final.as`（修改前）、`新1代.as`（修改后）
> 适用于：Flash/Animate CC、Apache Flex、OpenFL 等 AS3 环境

---

## 0. 阅读前必读：`Original_Final.as` → `新1代.as` 版本沿革

理解这条演进链是读懂本项目的前提。`新1代.as` **不是重写**，而是在 `Original_Final.as` 之上做的一次**"可配置化 + 关卡扩容 + 文档化"**改造。

### 0.1 两版基本信息对比

| 项目 | `Original_Final.as`（基线） | `新1代.as`（当前） |
|------|---------------------------|--------------------|
| 总行数 | 3783 | 4063（+280） |
| 有效代码相似度 | — | **91.8%**（归一化后逐行比对） |
| 函数数量 | 154 | 155（仅新增 `pagechanger`） |
| 成员变量 | 128 | 132（新增 `ExtendedSettings`/`BallValue`/`page`/`maxPage`） |
| 代码风格 | FFDEC 反编译紧凑式 `if(x){` | 格式化 `if (x) {` + 全角空格 |
| 注释 | **0 条** | 约 **90 条中文行尾注释** |
| 正式关卡 | 20 关（page 单一） | **40 关**（page 0 共 20 + page 1 共 20） |
| 沙盒关卡 | 10001–10005 | 10001–10005 ×2 套 |
| 网格尺寸 | 固定 `6×6×6` | 可变 `levelsize`（2–18），每关独立 |

> **关键认知**：`新1代.as` 里 91.8% 的代码与基线**逐字符相同**（仅空白与注释不同）。
> 所有实质改动都集中在下面 7 类里，逐类排查比通读 4000 行高效得多。

### 0.2 改动分类 A：魔法数字配置化（最大改动）

基线版把物理参数直接写死在运算里；新版抽出 `BallValue` 字典统一管理。

**新增成员变量（4 个）**

```as3
public var BallValue:Object;      // 物理参数表
public var ExtendedSettings:Object; // 游戏开关表
public var page:*;                // 当前关卡集 (0 / 1)
public var maxPage:*;             // 关卡集总数
```

**`BallValue` 定义位置：`initlevel()` 开头**（不是常量，是每关重设的变量）

```as3
BallValue = {          // 最初球数据
      gravity:    4,      // 重力加速度
      friction:   0.985,  // 摩擦系数
      small_acc:  1.045,  // 小坡道上坡加速
      big_acc:    1.075,  // 大坡道上坡加速
      small_dec:  0.97,   // 小坡道下坡减速
      big_dec:    0.94    // 大坡道下坡减速
   };
```

**全量替换对照表（共 11 处）**

| 基线写法 | 新版写法 | 所在函数 |
|----------|----------|----------|
| `ballvx *= 1.045; ballvy *= 1.045;` | `ballvx *= BallValue["small_acc"];` | `setheight()` |
| `ballvx *= 0.97;` | `ballvx *= BallValue["small_dec"];` | `setheight()` |
| `ballvx *= 1.075;` | `ballvx *= BallValue["big_acc"];` | `setheight()` |
| `ballvx *= 0.94;` | `ballvx *= BallValue["big_dec"];` | `setheight()` |
| `ballvx *= 0.985;` | `ballvx *= BallValue["friction"];` | `roll()` |
| `ballvx *= -1.045;` | `ballvx *= -BallValue["small_acc"];` | `roll()` 静止回推 |
| `ballvx *= 1.075;` | `ballvx *= BallValue["big_acc"];` | `conveyball()` |
| `ballvx *= 0.94;` | `ballvx *= BallValue["big_dec"];` | `conveyball()` |
| `ballvx/0.985`（**反除，用 friction 抵消衰减**） | `ballvx/BallValue["friction"]` | `usehole()`、`turnball()` |
| `VX *= 0.985; VY *= 0.985;` | `VX *= BallValue["friction"];` | `falling_anim()` |
| `VZ -= G;` | `VZ -= BallValue["gravity"];` | `falling_anim()` |

> ⚠️ **最隐蔽的一类**：`usehole()` 和 `turnball()` 里的 `ballvx/0.985` **不是摩擦，是"反摩擦"**——
> 逻辑是"预测下一帧摩擦衰减后的位移落在哪"，用于判断球心是否在格子中心。
> 改 `friction` 时这两处必须同步改，否则球洞判定和转向器判定会失准。

> ⚠️ `G` 变量仍然保留（`frame1()` 中 `G = 4`），但新版 `falling_anim()` 已改用 `BallValue["gravity"]`。
> **`G` 成为死变量**，改动时不要被它误导。

### 0.3 改动分类 B：`ExtendedSettings` 游戏开关

在 `frame1()` 末尾新增（`新1代.as:1534`）：

```as3
ExtendedSettings = {lastupdatetime: 20260912,
      usecheat:         true,
      time_deduction:   true,
      piece_deduction:  true,
      skill_deduction:  true,
      infinite_time:    true
   };
page = 1;
maxPage = 2;
```

| 开关 | 作用位置 | 效果 |
|------|----------|------|
| `lastupdatetime` | 无（仅记录） | 硬编码日期字面量 `20260912`，非构建时间戳 |
| `usecheat` | `unlockcheat()` | 是否允许作弊码生效 |
| `time_deduction` | `levelcomplete()` | 关是否按剩余时间扣分 |
| `piece_deduction` | `levelcomplete()` | 关是否按剩余零件数扣分 |
| `skill_deduction` | `levelcomplete()` | 关是否按技巧分扣分 |
| `infinite_time` | `initlevel()` 末尾 | 强制 `leveltime = 9999`（计时关变沙盒） |

> ⚠️ **`lastupdatetime` 是死数据**，仅供人工判断版本，新版没有读它。
> `usecheat` 默认为 `true`，**发正式版前务必改成 `false`**（见 0.9 节）。

### 0.4 改动分类 C：关卡系统从 1 套扩到 2 套（`page` 机制）

**基线版**：`initlevel()` 只有一个 `switch (level)`，20 个正式关 + 5 个沙盒关。

**新版**：拆成两段互斥分支

```as3
// initlevel() 中的重置块（防空关卡卡死）
piecelimits = [0, 0, 0, 0, 0, 0];
piecelimits[9] = 0;
piecelimits[10] = 0;
gamestart  = [1, 0];
gamefinish = [0, 0];
leveltime  = 300;
levelsize  = 6;

if (page == 0) {
   switch (level) { case 1: ... case 20: ... case 10001: ... }
}
else if (page == 1) {
   switch (level) { case 1: ... case 20: ... case 10001: ... }  // 全新的一套
}
```

**两套关卡的关系**

| | page 0 | page 1 |
|---|--------|--------|
| 关卡 1–20 | 原版 20 关（基线照搬） | **全新 20 关**，普遍更大（`levelsize` 2–18）、时间更长、预置件更多 |
| 沙盒 10001–10005 | 基线照搬 | 新增第二套沙盒 |
| 网格 | 固定 6×6×6 | 每关可调 `levelsize` |
| 定位 | 经典原味 | 高难度/大尺寸挑战 |

**`page` 切换方式**

```as3
// 新增函数（新1代.as 中唯一的全新函数）
public function pagechanger():*
{
   if (page + 1 < maxPage) { page = page + 1; }
   else                    { page = 0; }
   tooltip_top.text = "CURRENT PAGE " + String(page + 1) + " / " + String(maxPage);
}

// 绑定：initfrontend() 中给 logo 加双击
logoball.addEventListener(MouseEvent.DOUBLE_CLICK, pagechanger);
```

> **触发方式**：双击标题 logo 切页。`maxPage = 2`，故 `page` 在 `0 ↔ 1` 之间循环。
> **`page` 默认值是 `1`**（硬编码在 `frame1()`），即**开箱即进第二套**。
> 想让玩家从经典关卡开始，把 `page = 1;` 改成 `page = 0;`。

### 0.5 改动分类 D：网格尺寸参数化（`levelsize`）

**基线版**：`frame1()` 中写死，且 `initlevel()` 不重算

```as3
grid = [6, 6, 6];
gamescale = Math.min(11 / (grid[0] + grid[1]), 330 / ((grid[0] + grid[1]) * 30 + grid[2] * 50));
```

**新版**：`levelsize` 提升为独立变量，关卡数据里按需覆盖

```as3
// frame1() 新增
levelsize = 6;

// initlevel() 中（两套 switch 之后统一结算）
grid = [levelsize, levelsize, levelsize];
gamescale = 3 / levelsize;                                    // 固定比例，不再用 min() 双重约束
xoffset = 174 - 25 * gamescale * (grid[0] + grid[1] - 2);
yoffset = 80 + (30 + 50 * grid[2]) * gamescale;
```

page 1 中出现的 `levelsize` 取值示例：

| 关卡 | `levelsize` | 关卡 | `levelsize` |
|------|-------------|------|-------------|
| 1–6, 16 | 6（默认） | 17 | 8 |
| 14 | 3 | 1（10004） | 16 |
| 15 | 9 | 1（10005） | 18 |
| 18 | 2（最小棋盘） | | |

> ⚠️ **`gamescale` 算法变了**：基线用 `Math.min(横向约束, 纵向约束)` 自适应，
> 新版直接 `3 / levelsize`。后者简单但**不保证不出屏**——`levelsize` 过大时（如 18）会溢出，
> 依赖关卡作者手动保证。改 `levelsize` 前先算 `3 / levelsize` 的实际缩放。

### 0.6 改动分类 E：计分系统重构（`levelcomplete`）

**基线版**（固定扣分公式）

```as3
timescore  = Math.min(int(timescore  / leveltime * 440) * 5, 2000);
piecescore = Math.min(int(piecescore / totalpiecelimit() * 400) * 5, 2000);
skillscore = Math.max(int(skillscore / totalpiecelimit() * 200) * 5, 0);
DATA.scores[level] = Math.max(DATA.scores[level], timescore + piecescore + skillscore);
```

**新版**（三路开关 + 5000 分封顶）

```as3
timescore  = ExtendedSettings["time_deduction"]  ? Math.min(int(timescore  / leveltime * 440) * 5, 2000) : 2000;
piecescore = ExtendedSettings["piece_deduction"] ? Math.max(Math.min(int(piecescore / totalpiecelimit() * 400) * 5, 2000), 0) : 2000;
skillscore = ExtendedSettings["skill_deduction"] ? Math.max(int(skillscore / totalpiecelimit() * 200) * 5, 0) : 1000;
DATA.scores[level] = Math.min(Math.max(DATA.scores[level], timescore + piecescore + skillscore), 5000);
```

| 变化点 | 说明 |
|--------|------|
| 三个 `*_deduction` 开关 | 关闭时该项直接给**满分**（时间/零件 = 2000，技巧 = 1000） |
| `piecescore` 加 `Math.max(..., 0)` | 兜底防负分（擦除零件扣分可能扣成负数） |
| **总分封顶 5000** | `Math.min(..., 5000)`，新版新增的硬上限 |
| 满分总和 = 5000 | 2000 + 2000 + 1000，与封顶值自洽 |

> **调试友好设计**：关掉三个 `*_deduction` 就能让每关必得 5000 分，
> 配合 `usecheat` 一起关掉，是最快的"全解锁"测试组合。

### 0.7 改动分类 F：交互与可用性修复

| # | 位置 | 基线行为 | 新版行为 | 价值 |
|---|------|----------|----------|------|
| 1 | `startbtn_click()` | 只处理 `ballvx+ballvy==0` → `startgame()` | 增加 `else { resetballpos(); }` | 球滚动中再点开始键 = **把球归位**，可反复试跑同一关 |
| 2 | `keyboardEvent()` `E` 键 | `bridgebtn_click(null)` | `conveyorbtn_click(null)` | 基线 `E` 与数字键 `4` **重复**（都是桥），新版 `E` = **传送带**，消除冗余 |
| 3 | `initfrontend()` | 无 | `logoball` 双击 → `pagechanger()` | 隐藏式关卡集切换入口 |
| 4 | `addcommas()` | `param1 /= 1000;` | `param1 = int(param1 / 1000);` | 整数截断，避免分数显示出现浮点尾巴 |
| 5 | `unlockcheat()` | `unlockcheat(param1:*)`，无任何判断 | 无参 + `if (ExtendedSettings["usecheat"])` 守卫 + `else` 提示 `"You Can't Cheat"` | 作弊码受开关控制 |
| 6 | `showhighscores()` | 调用 `scoreretype()` | 调用 `scoretype()` | 函数名拼写修正（原为 `scoreretype`） |

**键盘映射全表（新版，含中文注释）**

| 按键 | `keyCode` | 触发 | 备注 |
|------|-----------|------|------|
| `Esc` / `` ` `` | 27 / 192 | `eraserbtn_click` | 橡皮擦 |
| `空格` | 32 | `startbtn_click` | 开始 / 归位 |
| `1`–`6` | 49–54 | box / ramp / turner / **bridge** / bigbox / bigramp | 无 Shift 时 |
| `E` | 69 | `conveyorbtn_click` | 传送带（**基线为 bridge**） |
| `R` | 82 | `phasebridgebtn_click` | 相位桥 |
| `Shift`+`3` | 51 | `conveyorbtn_click` | 传送带（备用绑定） |
| `Shift`+`4` | 52 | `phasebridgebtn_click` | 相位桥（备用绑定） |
| 双击 logo | — | `pagechanger` | 切换关卡集 |

> 🐛 **已知注释错误**（`新1代.as:3155`）：注释写"数字键 4 选择传送带工具"，
> 但代码调用的是 `bridgebtn_click(null)`（桥梁）。**以代码为准**。
> 这是批量加注释时把 `4` 和 `E` 的说明写串了。

### 0.8 改动分类 G：健壮性与等价重构

这些改动**不改变正常路径行为**，但修掉了潜在坑：

| # | 位置 | 改动 | 原因 |
|---|------|------|------|
| 1 | `setheight()` | `if(a \|\| b \|\| c)` → `if(Boolean(a \|\| b) \|\| Boolean(c))` | 消除 `\|\|`/`&&` 混合优先级隐患 |
| 2 | `levelfailed()` | `if(x && (a \|\| Boolean(b)))` → `if(x && (Boolean(a) \|\| Boolean(b)))` | 同上 |
| 3 | `mouseMoveEvent()` | `if` → `if / else if`（删掉一个多余 `break`） | 避免两分支同时执行 |
| 4 | `mouseMoveEvent()` | `(_loc5_.topmost != _loc5_ && Boolean(...))` → `(Boolean(...) && Boolean(...))` | 显式化 |
| 5 | `scoretype()` | `0.9` → `9/10`，`0.7` → `7/10` | **数值等价**，纯字面量改写 |
| 6 | `showhighscores()` | `17 * _loc3_` → `153 / 9 * _loc3_` | 同上（153/9 = 17） |
| 7 | `initlevel()` | 新增完整重置块 | **防"空关卡"卡死**（关卡号写错时不至于 NPE） |

> 第 5、6 项是**纯等价改写**，不改变任何行为。若你在做 diff 比对，忽略它们即可。

### 0.9 新版遗留问题清单（改代码前必读）

| # | 问题 | 位置 | 影响 | 建议 |
|---|------|------|------|------|
| 1 | 键盘注释与代码不符 | `新1代.as:3155` | 误导后续维护者 | 改成"数字键 4 选择桥梁工具" |
| 2 | `page = 1` 硬编码 | `frame1()` | **page 0 的 20 关不可达**（除非改代码或双击 logo） | 发正式版前确认是否有意 |
| 3 | `usecheat: true` 默认开启 | `frame1()` | 作弊码可用 | 正式版改 `false` |
| 4 | `infinite_time: true` 默认开启 | `frame1()` + `initlevel()` | **所有关卡无时间限制**，`timescore` 恒为满分 2000 | 正式版改 `false` |
| 5 | `initlevel()` 被调用两次 | `begingame()` 与 `animate_entrance_end()` 各一次 | `levelsize`/`BallValue`/`leveltime` 被重算两次；`time.addEventListener` 可能重复注册 | 加幂等保护或去重 |
| 6 | `G` 成为死变量 | `frame1()` vs `falling_anim()` | 改 `G` 不影响重力 | 删除 `G` 或改用 `BallValue["gravity"]` |
| 7 | `lastupdatetime` 死数据 | `frame1()` | 不会自动更新 | 改用构建期注入 |
| 8 | `for...in` 遍历数组 | `initBase`/`entrance_anim_init`/`transition_anim_init`/`interface_off` | 键为字符串、顺序不保证 | 改索引 `for` 循环 |
| 9 | `gamescale = 3 / levelsize` 无出屏保护 | `initlevel()` | `levelsize` 过大时溢出屏幕 | 恢复 `Math.min()` 双约束 |
| 10 | `BallValue` 是变量不是常量 | `initlevel()` | 每关重设，跨关读取会拿到上一关的值 | 若需全局唯一，改为 `const` |
| 11 | 事件监听器无成对移除 | `time`/`theBall`/`gamegrid` 项 | 长时间游玩有泄漏风险 | 见第 5.3 节 |

### 0.10 修改影响矩阵

改这些地方，**必须回归测试对应场景**：

| 改动点 | 风险 | 必测场景 |
|--------|------|----------|
| `BallValue.friction` | 🔴 高 | 洞口吸附、转向器转向、传送带、坡道微推、静止判定 |
| `BallValue.gravity` | 🔴 高 | 坠落动画 `falling_anim`、悬空失败判定（`> 49`） |
| `BallValue.*_acc` / `*_dec` | 🟡 中 | 上坡加速、下坡减速、坡道静止回推 |
| `levelsize` | 🔴 高 | 坐标换算 `arrangeGrid`、墙体 `arrangeWalls`、鼠标命中 `mouseMoveEvent`、幽灵件定位 |
| `piecelimits` 索引 | 🟡 中 | 工具栏显示 `setlimits`、擦除返还 `typeindex` |
| `page` / `maxPage` | 🟡 中 | `levelselect` 按钮布局、`DATA.scores[level]` 读写是否跨页串档 |
| `ExtendedSettings.*_deduction` | 🟢 低 | `levelcomplete` 分数、`DATA.scores` 写入 |
| `pagechanger` | 🟢 低 | 双击 logo 翻页、`tooltip_top` 文案 |
| `keyboardEvent` | 🟢 低 | 逐键验证（注意注释错误） |
| `addcommas` | 🟢 低 | 千分位边界：999 / 1000 / 1000000 |
| `unlockcheat` | 🟢 低 | `usecheat` 开/关两态 |

### 0.11 从基线升级到新版的操作清单

若你手上是 `Original_Final.as`，想迁到新版结构：

- [ ] 1. 加 4 个成员变量：`BallValue` / `ExtendedSettings` / `page` / `maxPage` / `levelsize`
- [ ] 2. `frame1()` 末尾追加 `ExtendedSettings`、`page`、`maxPage` 初始化
- [ ] 3. `initlevel()` 开头插入完整重置块（`piecelimits`/`gamestart`/`gamefinish`/`leveltime`/`levelsize`/`BallValue`）
- [ ] 4. 原 `switch(level)` 用 `if (page == 0) { ... }` 包住
- [ ] 5. 复制一份 switch 作为 `else if (page == 1) { ... }`，按需改数值
- [ ] 6. switch 之后补上网格结算：`grid` / `gamescale` / `xoffset` / `yoffset` / `preplaced.push`
- [ ] 7. 11 处魔法数字按 0.2 节对照表替换为 `BallValue[...]`
- [ ] 8. 新增 `pagechanger()`，在 `initfrontend()` 里绑定 `logoball` 双击
- [ ] 9. `levelcomplete()` 套上三个 `*_deduction` 三元 + 5000 分封顶
- [ ] 10. `unlockcheat()` 去掉参数，加 `usecheat` 守卫
- [ ] 11. `startbtn_click()` 补 `else { resetballpos(); }`
- [ ] 12. `keyboardEvent()` 的 `E` 键改成 `conveyorbtn_click(null)`
- [ ] 13. `addcommas()` 的 `/= 1000` 改成 `int(... / 1000)`
- [ ] 14. 3 处布尔表达式加 `Boolean()` 显式包裹
- [ ] 15. 批量补中文注释（注意 0.7 节的注释错误别照抄）

---

## 1. 项目概览

Isoball 是一款 **等轴测视角的物理益智游戏**，玩家需在网格上放置方块、斜坡、桥梁等零件，引导小球从起点滚动到终点。

### 核心架构

```
MainTimeline (Document Class)
├── 游戏状态管理 (level, score, time, DATA)
├── 场景层级 (gamearea → bases/walls/wbase)
├── 网格系统 (gamegrid[x][y][z] 三维数组)
├── 物件系统 (Box, Ramp, Bridge, Turner, Conveyor 等)
├── 物理模拟 (roll(), setheight(), 重力/摩擦/加速)
├── 关卡数据驱动 (initlevel() 中的巨大 switch-case)
├── 动画系统 (入场/过关/晋级/游戏结束)
└── UI 交互 (工具栏、提示、高分榜、作弊码)
```

---

## 2. 关键设计模式与技巧

### 2.1 动态类 + 非类型化变量 (`*` / `dynamic`)

```as3
public dynamic class MainTimeline extends MovieClip {
    public var ballvx:*;      // 任意类型，运行时决定
    public var piecelimits:*; // 实际为 Array
    public var BallValue:Object; // 字典式配置对象
}
```

**优点**：快速原型、兼容旧版 FLA 导出的符号  
**缺点**：无编译期类型检查、重构困难、IDE 提示失效  
**建议**：新代码改用强类型；维护旧代码时加注释说明实际类型

```as3
// 推荐注释风格
/** @type {Array.<Number>} 每种工具的剩余数量：[box, bigbox, ramp, bigramp, bridge, phasebridge] */
public var piecelimits:*;

/** @type {{gravity:Number, friction:Number, small_acc:Number, big_acc:Number, small_dec:Number, big_dec:Number}} */
public var BallValue:Object;
```

### 2.2 帧脚本驱动 (`addFrameScript`)

```as3
public function MainTimeline() {
    super();
    addFrameScript(0, frame1); // 第1帧执行 frame1()
}
internal function frame1():* { /* 初始化逻辑 */ }
```

- 所有初始化集中在 `frame1()`，避免构造函数过早执行（舞台未就绪）
- 适合 **单帧主时间轴** 的传统 Flash 游戏

### 2.3 `for...in` 遍历数组（非索引遍历）

```as3
for (_loc1_ in gamegrid) {  // _loc1_ 是字符串键 "0","1"...
    var item:* = gamegrid[_loc1_];
}
```

⚠️ **陷阱**：`for...in` 遍历的是**键名（字符串）**，不是索引；顺序不保证。  
**修正**：`for (var i:int = 0; i < gamegrid.length; i++)` 或 `gamegrid.forEach()`

### 2.4 显示列表层级管理

```
gamearea (Sprite)
├── wbase (MovieClip)     // 底层装饰格子
├── walls (MovieClip)     // 四周围墙
└── bases (MovieClip)     // 核心游戏格子 (gamegrid 项)
    ├── base (格子基类)
    │   ├── box / bigbox
    │   ├── ramp / bigramp
    │   ├── bridge / phasebridge
    │   └── turner / conveyor / hole
```

- **父子关系即逻辑层级**：`base.topmost` 指向最顶层物件
- `level` 属性记录堆叠高度（每层 100 单位）

### 2.5 坐标系与等轴测投影

```as3
// 网格尺寸由 levelsize 决定（新版可每关不同，基线版固定 6）
grid = [levelsize, levelsize, levelsize];
gamescale = 3 / levelsize;   // ⚠️ 新版算法，已无出屏保护，见 0.5 节
xoffset = 174 - 25 * gamescale * (grid[0] + grid[1] - 2);
yoffset = 80 + (30 + 50 * grid[2]) * gamescale;

// 格子内部局部坐标系：x/y 水平，z 垂直（每层 100）
ballx, bally: 水平位置 (0~grid*100)
ballz:      垂直高度 (level * 100)
```

**换算公式**（伪代码）：
```
screenX = xoffset + (gridX + gridY) * 50 * gamescale        // arrangeGrid() 实际写法
screenY = yoffset + (grid[0] - 1 + gridY - gridX) * 30 * gamescale
```

> 详见 **0.5 节**：`levelsize` 参数化后，`gamescale` 从
> `Math.min(横向约束, 纵向约束)` 简化为 `3 / levelsize`，改大网格时需自行验证不出屏。

---

## 3. 核心模块详解

### 3.1 关卡数据驱动 (`initlevel`)

```as3
public function initlevel():* {
    // 1. 重置通用参数（防空关卡卡死）
    piecelimits = [0,0,0,0,0,0];
    piecelimits[9] = 0;  piecelimits[10] = 0;
    gamestart = [1,0];
    gamefinish = [0,0];
    leveltime = 300;
    levelsize = 6;
    BallValue = { gravity:4, friction:0.985, small_acc:1.045,
                  big_acc:1.075, small_dec:0.97, big_dec:0.94 };

    // 2. 根据 page(关卡集) 与 level 切换配置
    if (page == 0) {                    // 经典 20 关 + 沙盒
        switch(level) { case 1: ... case 20: ... case 10001: ... }
    } else if (page == 1) {             // 挑战 20 关 + 沙盒（网格更大）
        switch(level) { case 1: ... case 20: ... case 10001: ... }
    }

    // 3. 计算网格与缩放
    grid = [levelsize, levelsize, levelsize];
    gamescale = 3 / levelsize;
    xoffset = 174 - 25 * gamescale * (grid[0] + grid[1] - 2);
    yoffset = 80 + (30 + 50 * grid[2]) * gamescale;
    preplaced.push(gamefinish[1]);
    preplaced.push(hole);
    tooltip_bottom.text = tip;
    skillscore = totalpiecelimit();

    // 4. 无限时间开关（可在 ExtendedSettings 中关闭）
    if (ExtendedSettings["infinite_time"]) { leveltime = 9999; }
}
```

**扩展新关卡步骤**：
1. 确认 `page`（0 = 经典 / 1 = 挑战），在对应分支的 `switch` 中添加 `case N:`
2. 设置 `gamestart`, `gamefinish`, `leveltime`, `piecelimits`, `gaps`, `preplaced`
3. 需要非 6×6×6 棋盘时，加一行 `levelsize = N;`
4. `gaps` = 空洞索引数组（球会掉下去）
5. `preplaced` = `[索引, 类名, 索引, 类名...]` 预置物件
6. 若两套都要，加完后记得同步另一套的 `switch`

> ⚠️ `DATA.scores[level]` **不区分 page**——两套关卡共用同一份分数数组。
> 同号关卡（如两套的 `case 3`）会互相覆盖最高分。若要独立计分，
> 需改成 `DATA.scores[page][level]` 二维结构（见 0.10 节风险表）。
>
> 完整的 page 机制说明见 **0.4 节**，`levelsize` 参数化见 **0.5 节**。

### 3.2 物理模拟 (`roll` + `setheight`)

```as3
public function roll(param1:*):* {
    // 1. 特殊格子交互
    if (abcd(currentbase()) is turner) turnball();
    else if (abcd(currentbase()) is conveyor) conveyball();
    else if (abcd(currentbase()) is hole) usehole();

    // 2. 边界反弹
    if (出界) bounceback();

    // 3. 位置更新
    prevbase = currentbase();
    ballx += ballvx;  bally += ballvy;
    setheight();      // 关键：根据格子高度修正 ballz 并调整速度

    // 4. 摩擦衰减
    ballvx *= BallValue.friction;
    ballvy *= BallValue.friction;

    // 5. 静止判定
    if (速度极小) {
        if (在坡道上) 反向微推; else gameover("zzz");
    }
}
```

**关键参数 (`BallValue`，新版从魔法数字提取)**：
| 参数 | 含义 | 典型值 | 使用处 |
|------|------|--------|--------|
| `gravity` | 重力加速度（帧/帧²） | 4 | `falling_anim()` |
| `friction` | 水平摩擦系数 | 0.985 | `roll()`、`falling_anim()`、**`usehole()`/`turnball()` 反向除法** |
| `small_acc` | 小坡道上坡加速 | 1.045 | `setheight()`、`roll()` 静止回推 |
| `small_dec` | 小坡道下坡减速 | 0.97 | `setheight()` |
| `big_acc` | 大坡道上坡加速 | 1.075 | `setheight()`、`conveyball()` |
| `big_dec` | 大坡道下坡减速 | 0.94 | `setheight()`、`conveyball()` |

> ⚠️ **`friction` 有一处反着用**：`usehole()` / `turnball()` 中的
> `ballvx / BallValue["friction"]` 是"预测下一帧衰减后的位移"，用于判断球心是否在格心。
> 改 `friction` 必须连带验证洞口吸附与转向器转向。完整替换清单见 **0.2 节**。
>
> ⚠️ `BallValue` 定义在 `initlevel()` 里（**每关重设**），不是 `const`。
> `G` 变量虽保留但已成死变量，见 **0.2 节**说明。

### 3.3 幽灵件预览 (`ghostpiece` / `ghostbase`)

```as3
// 鼠标移动时：在目标格子生成半透明预览
ghostpiece = new Box();  // 或 Ramp, Bridge...
ghostpiece.alpha = 0.5;
ghostbase.addChild(ghostpiece);

// 点击确认：alpha=1, 计数-1, ghostpiece=null
// 取消/右键：removeGhost() 恢复层级
```

> ⚠️ `mouseMoveEvent()` 在新版被改成 `if / else if` 结构（基线版是 `if` + 多余 `break`），
> 见 **0.8 节**第 3 项。

### 3.4 分数系统

```as3
// 三维度得分（levelcomplete() 中结算）
timescore  = ExtendedSettings["time_deduction"]  ? int(timescore  / leveltime * 440) * 5  (≤2000) : 2000;
piecescore = ExtendedSettings["piece_deduction"] ? int(piecescore / totalpiecelimit() * 400) * 5 (0~2000) : 2000;
skillscore = ExtendedSettings["skill_deduction"] ? int(skillscore / totalpiecelimit() * 200) * 5 : 1000;
DATA.scores[level] = Math.min(Math.max(DATA.scores[level], 三项之和), 5000);  // 封顶 5000
```

| 维度 | 基准 | 满分 | 开关 |
|------|------|------|------|
| `timescore` | `leveltime`（关卡限时） | 2000 | `time_deduction` |
| `piecescore` | `totalpiecelimit()`（零件总数） | 2000 | `piece_deduction` |
| `skillscore` | `totalpiecelimit()` | 1000 | `skill_deduction` |

> 三项满分之和 = **5000**，与总分封顶值自洽。关闭任一开关即得该项满分。
> 详见 **0.6 节**。

```as3
// 完美评价阈值 (scoretype，注意基线版名为 scoreretype，新版已修正)
scoretype(score / 基准值) → 0~4 星级
```

### 3.5 本地存储 (`SharedObject`)

```as3
localdata = SharedObject.getLocal("isoball");
DATA = localdata.data;  // { scores:[], bonus:[], sandbox:[], name:"", lastsent:0 }
```

- 自动持久化分数、解锁进度、玩家名
- **注意**：`SharedObject` 大小限制 100KB，仅存必要数据

### 3.6 高分上传 (`URLLoader`)

```as3
public function gethighscores():* {
    var loader:URLLoader = new URLLoader();
    loader.load(new URLRequest("http://domain/highscores.php?time=" + Date.now()));
    loader.addEventListener(Event.COMPLETE, highscoresloaded);
}
```

- 简单 GET 请求，防缓存加时间戳
- **现代替代**：`URLRequestMethod.POST` + JSON + HTTPS

---

## 4. 常见修改场景

### 4.1 新增零件类型

1. **创建符号**：FLA 中新建 `MovieClip`，链接类名 `NewPiece`
2. **注册类型索引**：
   ```as3
   // 在 initTools() 或类似处添加
   tools.push(newToolBtn);
   typeIndexMap["NewPiece"] = tools.length - 1;
   ```
3. **物理行为**：在 `roll()` / `setheight()` 中添加 `is NewPiece` 分支
4. **关卡配置**：`piecelimits` 扩展长度，`initlevel` 中分配数量
5. **预置/存档**：`preplaced` 支持新类名，`DATA.sandbox` 序列化逻辑同步

### 4.2 调整物理手感

只需修改 `initlevel()` 中的 `BallValue`：
```as3
BallValue = {
    gravity: 5,        // 更重
    friction: 0.99,    // 更滑
    small_acc: 1.03,   // 坡道更温和
    big_dec: 0.9       // 大坡减速更明显
};
```

### 4.3 增加页面/章节

```as3
// page 变量控制关卡组
if (page == 2) {  // 新增第3页
    switch(level) { case 1: ... }
}
```
配合 `pagechanger()` 实现翻页。

### 4.4 移植到 H5 / OpenFL / LayaAir

| 原 API | OpenFL 等价 | LayaAir 等价 | 注意 |
|--------|-------------|--------------|------|
| `MovieClip` | `openfl.display.MovieClip` | `Laya.Animation` | 时间轴动画需导出为 JSON |
| `SharedObject` | `openfl.net.SharedObject` | `Laya.LocalStorage` | API 不同 |
| `URLLoader` | `openfl.net.URLLoader` | `Laya.HttpRequest` | 事件名不同 |
| `addFrameScript` | 不支持 | 不支持 | 改用 `onEnterFrame` 或游戏循环 |
| `gotoAndPlay/Stop` | 支持 | `play()/stop()` + 帧标签 | 需适配 |

---

## 5. 代码质量提升建议

### 5.1 类型收敛（渐进式）

```as3
// 原：public var ballvx:*;
// 改：
/** @type {Number} 小球水平速度 */
public var ballvx:Number;

// 原：public function roll(param1:*):*
// 改：
public function roll(e:Event = null):void
```

### 5.2 提取常量与配置

```as3
// 顶部集中定义
const GRAVITY:Number = 4;
const FRICTION:Number = 0.985;
const LEVEL_HEIGHT:Number = 100;
const MAX_LEVELS:int = 20;

// 关卡配置外置为 JSON/XML，initlevel() 读取而非硬编码
```

> ⚠️ **别重复造轮子**：新版已经把 `BallValue` 和 `ExtendedSettings` 抽出来了（见 0.2 / 0.3 节）。
> 你要做的是**把这两个从 `initlevel()` / `frame1()` 里的字面量赋值提升为真正的 `const`**，
> 而不是再新建一套配置表——否则会出现两套真相来源。
>
> 更彻底的方案：把 `initlevel()` 里两段共 2000+ 行的 `switch` 导出为
> `levels_page0.json` / `levels_page1.json`，配合 `page` 字段做运行时切换。
> 数据结构建议见第 9 节。

### 5.3 事件监听器内存管理

```as3
// 当前代码：大量 addEventListener 无 removeEventListener
// 导致切关卡/重启时泄漏

// 规范做法：
private function addListeners():void {
    time.addEventListener(Event.ENTER_FRAME, timeUpdate);
    // 记录引用以便移除
}
private function removeListeners():void {
    time.removeEventListener(Event.ENTER_FRAME, timeUpdate);
}
public function destroy():void {
    removeListeners();
    // 清理所有子对象、数组引用置 null
}
```

### 5.4 单一职责拆分（重构方向）

| 现状 | 建议拆分为 |
|------|------------|
| MainTimeline 2000+ 行 | `GameEngine`, `LevelManager`, `PhysicsEngine`, `UIManager`, `AudioManager`, `SaveManager` |
| 关卡数据硬编码 | `LevelConfig.json` + `LevelParser` |
| 物理逻辑分散在 roll/setheight/abcd | `BallPhysics` 类封装 |

---

## 6. 调试技巧

### 6.1 Trace 关键状态

```as3
// 临时添加在 roll() 顶部
trace("ball:", ballx, bally, ballz, "v:", ballvx, ballvy, "base:", currentbase()?.I, "top:", abcd(currentbase()));
```

### 6.2 可视化调试

```as3
// 在游戏区绘制网格坐标、碰撞箱、速度向量
var debugGfx:Sprite = new Sprite();
gamearea.addChild(debugGfx);
debugGfx.graphics.lineStyle(1, 0xFF0000);
debugGfx.graphics.moveTo(ballx, bally);
debugGfx.graphics.lineTo(ballx + ballvx*10, bally + ballvy*10);
```

### 6.3 作弊与调试开关

新版把所有可调项集中到 `ExtendedSettings`，**调试时优先改这里，不要改逻辑代码**：

```as3
// frame1() 中的默认值（新1代.as:1534）
ExtendedSettings = {lastupdatetime: 20260912,
      usecheat:        true,   // 作弊码是否生效
      time_deduction:  true,   // 关闭 → timescore  恒 2000
      piece_deduction: true,   // 关闭 → piecescore 恒 2000
      skill_deduction: true,   // 关闭 → skillscore 恒 1000
      infinite_time:   true    // 关闭 → 恢复关卡限时
   };
page = 1;      // 0 = 经典 20 关，1 = 挑战 20 关
maxPage = 2;
```

**推荐调试组合**

| 目的 | 组合 |
|------|------|
| 快速验证后期关卡 | `usecheat: true` + 三个 `*_dededuction: true` + `infinite_time: true` |
| 验证计分/星级判定 | 三个 `*_deduction: false`（每关必得 5000 满星） |
| 验证限时失败流程 | `infinite_time: false` + `time_deduction: true` |
| 验证经典关卡 | `page = 0` |
| 验证大棋盘渲染 | `page = 1` + 第 10005 关（`levelsize = 18`） |

> 完整开关语义见 **0.3 节**；调试开关与正式发布的取舍见 **0.9 节**第 3、4 项
> （`usecheat` 与 `infinite_time` 默认都是 `true`，发版前务必改）。

---

## 7. 常见坑与避坑指南

### 7.1 原版遗留坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 小球穿墙/卡墙 | `setheight` 仅检测当前格子顶层 | 增加射线检测或扩大碰撞体积 |
| 桥梁悬空不掉落 | `check_for_loose_bridges` 逻辑漏洞 | 补充拓扑连通性检查 (BFS/DFS) |
| 关卡切换残留物件 | `initBase` 仅清理 `gamegrid` 未清 `walls/wbase` | 统一 `destroy()` 清理所有容器 |
| 高分上传失败 | HTTP 明文、跨域、服务端下线 | 改 HTTPS、配置 `crossdomain.xml`、本地降级 |
| `for...in` 导致顺序错乱 | 遍历 `gamegrid`/`gamewalls` 用 `for...in` | 改用 `for (var i=0; i<arr.length; i++)` |
| 改 `G` 不影响重力 | `falling_anim` 已改用 `BallValue["gravity"]`，`G` 是死变量 | 删 `G` 或统一走 `BallValue` |
| 改 `friction` 后球不吸附洞口 | `usehole`/`turnball` 里有 `ballvx / 0.985` 反向预测 | 同步改这两处，见 0.2 节 |
| 大棋盘（`levelsize ≥ 16`）出屏 | `gamescale = 3 / levelsize` 无出屏保护 | 恢复 `Math.min()` 双约束 |

### 7.2 新版（`新1代.as`）引入的坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 玩不到经典 20 关 | `frame1()` 硬编码 `page = 1` | 改 `page = 0` |
| 关卡无时间限制、分数虚高 | `infinite_time: true` 默认开启 | 改 `false` |
| 作弊码在正式版可用 | `usecheat: true` 默认开启 | 改 `false` |
| 同号关卡分数互相覆盖 | `DATA.scores[level]` 不含 `page` 维度 | 改二维 `DATA.scores[page][level]` |
| 计时器重复注册 | `initlevel()` 被 `begingame()` 和 `animate_entrance_end()` 各调一次 | 加幂等保护或去重调用 |
| 查 `4` 键行为对不上注释 | `新1代.as:3155` 注释误写为"传送带" | 以代码 `bridgebtn_click` 为准 |
| 关卡数据误改到另一套 | 两段 `switch` 结构相同，搜索易命中错误分支 | 改前先确认 `page` 值 |
| 数值改动不生效 | 怀疑改了 `BallValue` 但值在 `initlevel()` 里被每关重设 | 改 `BallValue` 定义处，而非读取处 |

> 完整遗留问题清单（11 项）见 **0.9 节**；逐项回归测试范围见 **0.10 节**。

---

## 8. 扩展阅读与参考

- **ActionScript 3.0 语言参考** (Adobe 官方存档)
- **《Essential ActionScript 3.0》** - Colin Moock
- **Flash 游戏物理引擎**：Box2DFlash (AS3 移植)、NAPE
- **现代替代方案**：
  - **TypeScript + PixiJS / Phaser** (Web)
  - **Haxe + OpenFL / Heaps.io** (跨平台，语法接近 AS3)
  - **LayaAir / Egret** (国内成熟引擎，支持 AS3 转码)

---

## 9. 文件结构建议 (重构后)

```
src/
├── core/
│   ├── GameEngine.ts           # 主循环、状态机
│   ├── Config.ts               # 常量、BallValue、关卡配置加载
│   └── Events.ts               # 自定义事件类
├── physics/
│   ├── BallPhysics.ts          # roll/setheight 逻辑
│   ├── GridSystem.ts           # 坐标换算、索引转换
│   └── Collision.ts            # 碰撞检测
├── level/
│   ├── LevelManager.ts         # 关卡加载/切换/进度
│   ├── LevelParser.ts          # JSON → 运行时数据
│   └── data/
│       ├── levels_page0.json
│       └── levels_page1.json
├── entities/
│   ├── BaseCell.ts             # 格子基类
│   ├── pieces/
│   │   ├── Box.ts, BigBox.ts, Ramp.ts, ...
│   │   └── PieceFactory.ts
│   └── Ball.ts
├── ui/
│   ├── Toolbar.ts
│   ├── Tooltip.ts
│   ├── LevelCompletePanel.ts
│   └── HighScorePanel.ts
├── save/
│   └── SaveManager.ts          # SharedObject 封装
├── net/
│   └── HighScoreService.ts     # 上传/下载排行榜
└── main.ts                     # 入口
```

---

## 10. 快速上手清单

**第一步：搞清版本关系（必做，30 分钟）**

- [ ] 读本指南 **第 0 节**，理解 `Original_Final.as` → `新1代.as` 的 7 类改动
- [ ] 跑一次 diff 确认现状：`git diff --no-index Original_Final.as 新1代.as`（应约 91.8% 相似）
- [ ] 打开 `frame1()` 末尾，确认 `ExtendedSettings` / `page` / `maxPage` 的当前取值
- [ ] 确认你要改的关卡在**哪一套**（`page = 0` 还是 `1`），否则会改错分支

**第二步：跑起来（1 小时）**

- [ ] 在 Flash/Animate 中打开对应 FLA，对照符号链接类名（`box`/`ramp`/`base`/`hole`…）
- [ ] 运行 SWF，观察 `trace` 输出（需 Debug Player）
- [ ] 双击标题 logo 验证 `pagechanger()` 能切页
- [ ] 逐个验证键盘快捷键（注意 `4` 键的注释是错的，见 0.7 节）

**第三步：小步改动（每步都验证）**

- [ ] 改 `initlevel()` 里的 `BallValue` 数值，感受物理手感变化
- [ ] 同步检查 `usehole()` / `turnball()` 的 `BallValue["friction"]` 反向除法
- [ ] 在对应 `page` 的 `switch` 里添加 `case 21:` 测试新关卡
- [ ] 试一个非默认 `levelsize`（如 `levelsize = 4`），验证坐标换算与墙体生成
- [ ] 三个 `*_deduction` 全关，验证每关 5000 满分与封顶逻辑

**第四步：进阶（可选）**

- [ ] 尝试将 `piecelimits` 改为 `Vector.<int>` 并修复报错
- [ ] 写一个 `LevelExporter` 把两段 `switch` 导出为 `levels_page0/1.json`
- [ ] 修 0.9 节列出的 11 项遗留问题（建议从死变量 `G` 和注释错误开始）
- [ ] 把 `BallValue` 从 `initlevel()` 提升为真正的 `const`

---

> **提示**：本代码库属于 **“面向时间轴编程”** 典型风格，耦合度高、全局状态多。  
> 维护时**优先保持可运行**，再**逐模块解耦**；切勿一次性大重构导致无法验证。

---

## 附录：本文档对应的代码事实速查

| 项 | 值 |
|----|----|
| 基线文件 | `Original_Final.as`（3783 行，无注释，单一 switch） |
| 当前文件 | `新1代.as`（4063 行，约 90 条中文注释，双 switch） |
| 参考文件 | `isoball1_maintimeline_20260912.as`（`page = 1` 硬编码在 `initlevel`，无 `infinite_time` 判断，作弊开关无 `else` 分支） |
| 有效代码相似度 | 91.8% |
| 关键定义位置 | `BallValue` → `initlevel()` 开头；`ExtendedSettings` / `page` / `maxPage` → `frame1()` 末尾；`pagechanger` 绑定 → `initfrontend()` |
| 正式关卡总数 | 40（page 0 共 20 + page 1 共 20） |
| 沙盒关卡 | 10001–10005 ×2 套 |
| `levelsize` 取值范围 | 2 – 18 |
| 总分上限 | 5000（timescore 2000 + piecescore 2000 + skillscore 1000） |
| 快捷键 | Esc/`、空格、1–6、E、R、Shift+3、Shift+4、双击 logo |
| 改动物理参数必测 | 洞口吸附、转向器转向、传送带、坡道微推、静止判定、坠落 |

---

*文档版本：2.0 | 更新日期：2026-09-27 | 覆盖 `Original_Final.as` → `新1代.as` 完整演进*
