# Fello Hero Try V7 - 3D动画粒子系统

这是一个基于Three.js和React Three Fiber的3D动画粒子系统项目，专注于从GLB模型文件中提取动画数据并创建动态粒子效果。

## 项目特性

- 🎬 **动画提取**: 从GLB模型文件中提取动画轨道数据
- ✨ **粒子系统**: 高级粒子渲染和动画效果
- 🎯 **环映射**: 将动画数据映射到三个独立的环系统
- 🎨 **视觉效果**: 轨迹渲染、连接线效果和发光着色器
- 📊 **性能优化**: 优化的渲染性能和内存管理

## 技术栈

- **React 18** - 用户界面框架
- **Three.js** - 3D图形库
- **React Three Fiber** - React的Three.js渲染器
- **Vite** - 构建工具
- **GLTF/GLB** - 3D模型格式

## 项目结构

```
fello_hero_try_v7/
├── src/                    # React组件源码
│   ├── App.jsx            # 主应用组件
│   ├── components/        # 组件目录
│   │   ├── AnimatedCamera.jsx  # 动画相机组件
│   │   ├── AnimationControls.jsx  # 动画控制器
│   │   └── CompleteAnimationScene.jsx  # 完整动画场景
│   ├── systems/           # 系统目录
│   │   └── MultiSourceAnimationExtractor.js  # 多源动画提取器
│   └── main.jsx           # 应用入口
```

## 模型文件

⚠️ **重要说明**: 由于GitHub的文件大小限制（100MB），GLB模型文件未包含在此仓库中。

项目需要以下GLB模型文件才能正常运行：
- `LOST_cut2_v6.glb` - 主模型文件 (880MB)
- `Scenes_B_00100.glb` - 场景B模型 (267MB)
- `Scenes_B_0023.glb` - 场景B模型 (267MB)
- `Camera.glb` - 相机模型

### 获取模型文件

请将模型文件放置在以下目录中：
```
fello_hero_try_v7/
├── original_model/         # 原始GLB模型文件
│   ├── LOST_cut2_v6.glb
│   ├── Scenes_B_00100.glb
│   ├── Scenes_B_0023.glb
│   └── Camera.glb
└── public/                 # 转换后的模型文件
    ├── LOST_cut2_v6-transformed.glb
    ├── Scenes_B_00100-transformed.glb
    ├── Scenes_B_0023-transformed.glb
    └── Camera-transformed.glb
```

## 核心功能

### 1. 动画分析器 (AnimationAnalyzer)
- 加载和分析GLB模型文件
- 提取动画轨道数据
- 识别环相关的动画对象
- 提供动画播放控制

### 2. 粒子系统 (ParticleSystem)
- 基于动画数据的粒子生成
- 动态粒子生命周期管理
- 性能优化的粒子渲染
- 多环同步动画支持

### 3. 视觉效果 (VisualEffects)
- 高级粒子着色器
- 轨迹渲染系统
- 粒子连接线效果
- 发光和光晕效果

## 开发状态

当前项目正在积极开发中，主要功能包括：

- ✅ 基础项目结构搭建
- ✅ React Three Fiber集成
- ✅ GLB模型加载和分析
- ✅ 动画数据提取
- ✅ 粒子系统基础实现
- ✅ 视觉效果系统
- 🔄 动画播放控制器优化
- 🔄 多环同步动画完善

## 快速开始

1. 安装依赖：
```bash
npm install
```

2. 添加模型文件：
   - 将GLB模型文件放置在 `original_model/` 目录中
   - 运行模型转换脚本（如果提供）

3. 启动开发服务器：
```bash
npm run dev
```

4. 打开浏览器访问 `http://localhost:5173`

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT License 