# Isoball 1代 ActionScript 3 编码指南

> 基于 `isoball1_maintimeline_20260914.as` 和 `isoball1_maintimeline_20260912.as` 编写
> 适用于：Flash/Animate CC、Apache Flex、OpenFL 等 AS3 环境

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
// 网格索引 → 舞台坐标
xoffset = 174 - 25 * gamescale * (grid[0] + grid[1] - 2);
yoffset = 80 + (30 + 50 * grid[2]) * gamescale;

// 格子内部局部坐标系：x/y 水平，z 垂直（每层 100）
ballx, bally: 水平位置 (0~grid*100)
ballz:      垂直高度 (level * 100)
```

**换算公式**（伪代码）：
```
screenX = xoffset + (gridX - gridY) * 25 * gamescale
screenY = yoffset - (gridX + gridY) * 15 * gamescale - ballz * gamescale
```

---

## 3. 核心模块详解

### 3.1 关卡数据驱动 (`initlevel`)

```as3
public function initlevel():* {
    // 1. 重置通用参数
    piecelimits = [0,0,0,0,0,0];
    gamestart = [1,0];
    gamefinish = [0,0];
    leveltime = 300;
    levelsize = 6;
    BallValue = { gravity:4, friction:0.985, ... };

    // 2. 根据 page(页) 与 level 切换配置
    if (page == 0) {
        switch(level) { case 1: ... case 2: ... }
    } else if (page == 1) {
        switch(level) { ... }
    }

    // 3. 计算网格与缩放
    grid = [levelsize, levelsize, levelsize];
    gamescale = 3 / levelsize;
    // ...
}
```

**扩展新关卡步骤**：
1. 在对应 `page` 的 `switch` 中添加 `case N:`
2. 设置 `gamestart`, `gamefinish`, `leveltime`, `piecelimits`, `gaps`, `preplaced`
3. `gaps` = 空洞索引数组（球会掉下去）
4. `preplaced` = `[索引, 类名, 索引, 类名...]` 预置物件

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

**关键参数 (`BallValue`)**：
| 参数 | 含义 | 典型值 |
|------|------|--------|
| `gravity` | 重力加速度（帧/帧²） | 4 |
| `friction` | 水平摩擦系数 | 0.985 |
| `small_acc` | 小坡道上坡加速 | 1.045 |
| `small_dec` | 小坡道下坡减速 | 0.97 |
| `big_acc` | 大坡道上坡加速 | 1.075 |
| `big_dec` | 大坡道下坡减速 | 0.94 |

### 3.3 幽灵件预览 (`ghostpiece` / `ghostbase`)

```as3
// 鼠标移动时：在目标格子生成半透明预览
ghostpiece = new Box();  // 或 Ramp, Bridge...
ghostpiece.alpha = 0.5;
ghostbase.addChild(ghostpiece);

// 点击确认：alpha=1, 计数-1, ghostpiece=null
// 取消/右键：removeGhost() 恢复层级
```

### 3.4 分数系统

```as3
// 三维度得分
timescore   = 时间奖励 (剩余秒数 * 系数)
piecescore  = 剩余零件奖励
skillscore  = 技巧分 (初始=总零件数, 放置/移除各 -1)

// 完美评价阈值 (scoretype)
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

### 6.3 作弊模式利用

```as3
ExtendedSettings = { usecheat: true, ... }
// 启用后：所有关卡满分、禁用高分上传、显示提示
// 利用此模式快速测试后期关卡
```

---

## 7. 常见坑与避坑指南

| 现象 | 原因 | 解决 |
|------|------|------|
| 小球穿墙/卡墙 | `setheight` 仅检测当前格子顶层 | 增加射线检测或扩大碰撞体积 |
| 桥梁悬空不掉落 | `check_for_loose_bridges` 逻辑漏洞 | 补充拓扑连通性检查 (BFS/DFS) |
| 关卡切换残留物件 | `initBase` 仅清理 `gamegrid` 未清 `walls/wbase` | 统一 `destroy()` 清理所有容器 |
| 高分上传失败 | HTTP 明文、跨域、服务端下线 | 改 HTTPS、配置 `crossdomain.xml`、本地降级 |
| 变量污染 (page=1 逻辑混入 page=0) | `page` 变量在 `initlevel` 中被覆盖 | 重命名或封装 `LevelPage` 类 |
| `for...in` 导致顺序错乱 | 遍历 `gamegrid`/`gamewalls` 用 `for...in` | 改用 `for (var i=0; i<arr.length; i++)` |

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

- [ ] 阅读 `新1代.as` 全文，理解变量命名规律 (`_loc1_` = 临时变量)
- [ ] 在 Flash/Animate 中打开对应 FLA，对照符号链接类名
- [ ] 运行 SWF，观察 `trace` 输出（需 Debug Player）
- [ ] 修改 `BallValue` 感受物理手感变化
- [ ] 在 `initlevel` 添加 `case 21:` 测试新关卡
- [ ] 尝试将 `piecelimits` 改为 `Vector.<int>` 并修复报错
- [ ] 写一个 `LevelExporter` 把 switch-case 导出为 JSON

---

> **提示**：本代码库属于 **“面向时间轴编程”** 典型风格，耦合度高、全局状态多。  
> 维护时**优先保持可运行**，再**逐模块解耦**；切勿一次性大重构导致无法验证。

---

*文档版本：1.0 | 编写日期：2026-09-27 | 适用代码版本：isoball1_maintimeline_20260912.as*
