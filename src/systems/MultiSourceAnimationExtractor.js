import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

/**
 * 多源动画提取器
 * 从Camera.glb和Scenes B系列模型中提取完整的动画数据
 */
export class MultiSourceAnimationExtractor {
  constructor() {
    this.isInitialized = false
    this.animationData = {
      camera: null,
      rings: {
        ring1: null, // Scenes_B_00100
        ring2: null, // Scenes_B_0023
        ring3: null  // Scenes_B_00100001
      }
    }
    this.totalDuration = 0
    this.loader = new GLTFLoader()
    
    // 设置DRACO解码器
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    this.loader.setDRACOLoader(dracoLoader)
  }

  /**
   * 初始化并提取所有动画数据
   */
  async initialize() {
    try {
      console.log('🎬 Initializing Multi-Source Animation Extractor...')
      
      // 并行提取所有动画数据
      const [cameraData, ring1Data, ring2Data, ring3Data] = await Promise.all([
        this.extractCameraAnimation(),
        this.extractRingAnimation('ring1', '/Scenes_B_00100-transformed.glb', 'Scenes_B_00100'),
        this.extractRingAnimation('ring2', '/Scenes_B_0023-transformed.glb', 'Scenes_B_0023'),
        this.extractRingAnimation('ring3', '/Scenes_B_00100.001-transformed.glb', 'Scenes_B_00100001')
      ])

      this.animationData.camera = cameraData
      this.animationData.rings.ring1 = ring1Data
      this.animationData.rings.ring2 = ring2Data
      this.animationData.rings.ring3 = ring3Data

      // 计算最大动画时长
      this.calculateTotalDuration()
      
      this.isInitialized = true
      this.logExtractionSummary()
      
      return this.animationData
      
    } catch (error) {
      console.error('❌ Failed to initialize Multi-Source Animation Extractor:', error)
      throw error
    }
  }

  /**
   * 加载GLB文件
   */
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject)
    })
  }

  /**
   * 提取相机动画数据
   */
  async extractCameraAnimation() {
    console.log('📹 Extracting camera animation from Camera.glb...')
    
    try {
      const gltf = await this.loadGLTF('/Camera-transformed.glb')
      const { animations, scene } = gltf
      
      console.log(`📊 Camera model: ${animations.length} animations, scene children:`, scene.children.length)

      if (animations.length === 0) {
        console.warn('⚠️ No camera animations found')
        return null
      }

      const cameraAnimation = {
        position: null,
        rotation: null,
        fov: null,
        duration: 0,
        metadata: {
          animationCount: animations.length,
          tracks: []
        }
      }

      // 处理所有动画
      animations.forEach((animation, index) => {
        console.log(`🎭 Processing camera animation ${index}: "${animation.name}" (${animation.duration}s)`)
        
        cameraAnimation.duration = Math.max(cameraAnimation.duration, animation.duration)

        animation.tracks.forEach(track => {
          const trackName = track.name
          const parts = trackName.split('.')
          const objectName = parts[0]
          const propertyName = parts[1]

          console.log(`  📍 Camera track: ${trackName}`)
          cameraAnimation.metadata.tracks.push(trackName)

          if (objectName === 'Camera') {
            switch (propertyName) {
              case 'position':
                cameraAnimation.position = this.processTrack(track, 'position')
                console.log(`    ✅ Extracted camera position (${track.times.length} keyframes)`)
                break
              case 'rotation':
                cameraAnimation.rotation = this.processTrack(track, 'rotation')
                console.log(`    ✅ Extracted camera rotation (${track.times.length} keyframes)`)
                break
              case 'quaternion':
                cameraAnimation.rotation = this.processTrack(track, 'quaternion')
                console.log(`    ✅ Extracted camera quaternion (${track.times.length} keyframes)`)
                break
              case 'fov':
                cameraAnimation.fov = this.processTrack(track, 'fov')
                console.log(`    ✅ Extracted camera FOV (${track.times.length} keyframes)`)
                break
            }
          }
        })
      })

      return cameraAnimation

    } catch (error) {
      console.error('❌ Failed to extract camera animation:', error)
      return null
    }
  }

  /**
   * 提取环动画数据
   */
  async extractRingAnimation(ringId, modelPath, objectName) {
    console.log(`🎯 Extracting ${ringId} animation from ${modelPath}...`)
    
    try {
      const gltf = await this.loadGLTF(modelPath)
      const { animations, scene } = gltf
      
      console.log(`📊 ${ringId} model: ${animations.length} animations, scene children:`, scene.children.length)

      if (animations.length === 0) {
        console.warn(`⚠️ No animations found for ${ringId}`)
        return null
      }

      const ringAnimation = {
        position: null,
        rotation: null,
        scale: null,
        duration: 0,
        metadata: {
          objectName,
          modelPath,
          animationCount: animations.length,
          tracks: []
        }
      }

      // 处理所有动画
      animations.forEach((animation, index) => {
        console.log(`🎭 Processing ${ringId} animation ${index}: "${animation.name}" (${animation.duration}s)`)
        
        ringAnimation.duration = Math.max(ringAnimation.duration, animation.duration)

        animation.tracks.forEach(track => {
          const trackName = track.name
          const parts = trackName.split('.')
          const trackObjectName = parts[0]
          const propertyName = parts[1]

          if (trackObjectName === objectName) {
            console.log(`  📍 ${ringId} track: ${trackName}`)
            ringAnimation.metadata.tracks.push(trackName)

            switch (propertyName) {
              case 'position':
                ringAnimation.position = this.processTrack(track, 'position')
                console.log(`    ✅ Extracted ${ringId} position (${track.times.length} keyframes)`)
                break
              case 'rotation':
                ringAnimation.rotation = this.processTrack(track, 'rotation')
                console.log(`    ✅ Extracted ${ringId} rotation (${track.times.length} keyframes)`)
                break
              case 'quaternion':
                ringAnimation.rotation = this.processTrack(track, 'quaternion')
                console.log(`    ✅ Extracted ${ringId} quaternion (${track.times.length} keyframes)`)
                break
              case 'scale':
                ringAnimation.scale = this.processTrack(track, 'scale')
                console.log(`    ✅ Extracted ${ringId} scale (${track.times.length} keyframes)`)
                break
            }
          }
        })
      })

      return ringAnimation

    } catch (error) {
      console.error(`❌ Failed to extract ${ringId} animation:`, error)
      return null
    }
  }

  /**
   * 处理动画轨道数据
   */
  processTrack(track, propertyType) {
    const processedTrack = {
      times: Array.from(track.times),
      values: Array.from(track.values),
      keyframes: [],
      interpolation: track.getInterpolation ? track.getInterpolation() : 'LINEAR',
      type: propertyType
    }

    // 根据属性类型处理数据
    switch (propertyType) {
      case 'position':
      case 'scale':
        for (let i = 0; i < track.values.length; i += 3) {
          processedTrack.keyframes.push({
            x: track.values[i],
            y: track.values[i + 1],
            z: track.values[i + 2]
          })
        }
        break

      case 'rotation':
        for (let i = 0; i < track.values.length; i += 3) {
          processedTrack.keyframes.push({
            x: track.values[i],
            y: track.values[i + 1],
            z: track.values[i + 2]
          })
        }
        break

      case 'quaternion':
        processedTrack.type = 'quaternion'
        for (let i = 0; i < track.values.length; i += 4) {
          processedTrack.keyframes.push({
            x: track.values[i],
            y: track.values[i + 1],
            z: track.values[i + 2],
            w: track.values[i + 3]
          })
        }
        break

      case 'fov':
        for (let i = 0; i < track.values.length; i++) {
          processedTrack.keyframes.push({
            value: track.values[i]
          })
        }
        break
    }

    return processedTrack
  }

  /**
   * 计算总动画时长
   * 包含三阶段：等待(2s) + 过渡(1s) + 原动画
   */
  calculateTotalDuration() {
    let maxOriginalDuration = 0

    if (this.animationData.camera) {
      maxOriginalDuration = Math.max(maxOriginalDuration, this.animationData.camera.duration)
    }

    Object.values(this.animationData.rings).forEach(ringData => {
      if (ringData) {
        maxOriginalDuration = Math.max(maxOriginalDuration, ringData.duration)
      }
    })

    // 三阶段总时长 = 等待阶段(2s) + 过渡阶段(1s) + 原动画时长
    const WAIT_DURATION = 2.0
    const TRANSITION_DURATION = 1.0
    this.totalDuration = WAIT_DURATION + TRANSITION_DURATION + maxOriginalDuration

    console.log(`⏱️ Three-Phase Animation Duration:`)
    console.log(`   Phase 0 (Wait): ${WAIT_DURATION}s`)
    console.log(`   Phase 1 (Transition): ${TRANSITION_DURATION}s`)
    console.log(`   Phase 2 (Original Animation): ${maxOriginalDuration.toFixed(2)}s`)
    console.log(`   Total: ${this.totalDuration.toFixed(2)}s`)
  }

  /**
   * 在指定时间获取相机变换
   */
  getCameraTransformAtTime(time) {
    if (!this.animationData.camera) return null

    const normalizedTime = time % this.animationData.camera.duration

    const result = {
      position: { x: 13.037, y: 2.624, z: 23.379 }, // 默认位置
      rotation: { x: 0.318, y: 0.562, z: -0.051 },   // 默认旋转
      fov: 25.361 // 默认FOV
    }

    if (this.animationData.camera.position) {
      result.position = this.interpolateProperty(this.animationData.camera.position, normalizedTime, 3)
    }

    if (this.animationData.camera.rotation) {
      const componentCount = this.animationData.camera.rotation.type === 'quaternion' ? 4 : 3
      result.rotation = this.interpolateProperty(this.animationData.camera.rotation, normalizedTime, componentCount)
    }

    if (this.animationData.camera.fov) {
      result.fov = this.interpolateProperty(this.animationData.camera.fov, normalizedTime, 1).value || 25.361
    }

    return result
  }

  /**
   * 在指定时间获取环变换
   */
  getRingTransformAtTime(ringId, time) {
    const ringData = this.animationData.rings[ringId]
    if (!ringData) return null

    const normalizedTime = time % ringData.duration

    const result = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    }

    if (ringData.position) {
      result.position = this.interpolateProperty(ringData.position, normalizedTime, 3)
    }

    if (ringData.rotation) {
      const componentCount = ringData.rotation.type === 'quaternion' ? 4 : 3
      result.rotation = this.interpolateProperty(ringData.rotation, normalizedTime, componentCount)
    }

    if (ringData.scale) {
      result.scale = this.interpolateProperty(ringData.scale, normalizedTime, 3)
    }

    return result
  }

  /**
   * 属性插值计算
   */
  interpolateProperty(track, time, componentCount) {
    const { times, values } = track
    
    if (times.length === 0) {
      if (componentCount === 4) return { x: 0, y: 0, z: 0, w: 1 }
      if (componentCount === 1) return { value: 0 }
      return { x: 0, y: 0, z: 0 }
    }

    // 查找时间区间
    let index = 0
    for (let i = 0; i < times.length - 1; i++) {
      if (time >= times[i] && time <= times[i + 1]) {
        index = i
        break
      }
    }

    // 边界处理
    if (time <= times[0]) index = 0
    if (time >= times[times.length - 1]) index = times.length - 1

    // 如果在最后一个关键帧
    if (index === times.length - 1 || times.length === 1) {
      const startIndex = index * componentCount
      if (componentCount === 4) {
        return {
          x: values[startIndex],
          y: values[startIndex + 1],
          z: values[startIndex + 2],
          w: values[startIndex + 3]
        }
      } else if (componentCount === 1) {
        return { value: values[startIndex] }
      } else {
        return {
          x: values[startIndex],
          y: values[startIndex + 1],
          z: values[startIndex + 2]
        }
      }
    }

    // 线性插值
    const t1 = times[index]
    const t2 = times[index + 1]
    const factor = (time - t1) / (t2 - t1)

    const startIndex = index * componentCount
    const endIndex = (index + 1) * componentCount

    if (componentCount === 4) {
      // 四元数插值
      const q1 = new THREE.Quaternion(
        values[startIndex], values[startIndex + 1], 
        values[startIndex + 2], values[startIndex + 3]
      )
      const q2 = new THREE.Quaternion(
        values[endIndex], values[endIndex + 1],
        values[endIndex + 2], values[endIndex + 3]
      )
      
      const result = new THREE.Quaternion().slerpQuaternions(q1, q2, factor)
      return { x: result.x, y: result.y, z: result.z, w: result.w }
    } else if (componentCount === 1) {
      return {
        value: values[startIndex] + (values[endIndex] - values[startIndex]) * factor
      }
    } else {
      return {
        x: values[startIndex] + (values[endIndex] - values[startIndex]) * factor,
        y: values[startIndex + 1] + (values[endIndex + 1] - values[startIndex + 1]) * factor,
        z: values[startIndex + 2] + (values[endIndex + 2] - values[startIndex + 2]) * factor
      }
    }
  }

  /**
   * 获取所有变换数据
   */
  getAllTransformsAtTime(time) {
    return {
      camera: this.getCameraTransformAtTime(time),
      rings: {
        ring1: this.getRingTransformAtTime('ring1', time),
        ring2: this.getRingTransformAtTime('ring2', time),
        ring3: this.getRingTransformAtTime('ring3', time)
      }
    }
  }

  /**
   * 输出提取摘要
   */
  logExtractionSummary() {
    console.group('📊 Multi-Source Animation Extraction Summary')
    
    // 相机动画摘要
    if (this.animationData.camera) {
      console.log('📹 Camera Animation:')
      console.log(`  ⏱️ Duration: ${this.animationData.camera.duration.toFixed(2)}s`)
      console.log(`  📍 Position: ${this.animationData.camera.position ? '✅' : '❌'}`)
      console.log(`  🔄 Rotation: ${this.animationData.camera.rotation ? '✅' : '❌'}`)
      console.log(`  🔍 FOV: ${this.animationData.camera.fov ? '✅' : '❌'}`)
      console.log(`  📋 Tracks: ${this.animationData.camera.metadata.tracks.length}`)
    } else {
      console.log('📹 Camera Animation: ❌ Not available')
    }

    // 环动画摘要
    console.log('\n🎯 Ring Animations:')
    Object.entries(this.animationData.rings).forEach(([ringId, data]) => {
      if (data) {
        console.log(`  ${ringId} (${data.metadata.objectName}):`)
        console.log(`    ⏱️ Duration: ${data.duration.toFixed(2)}s`)
        console.log(`    📍 Position: ${data.position ? '✅' : '❌'}`)
        console.log(`    🔄 Rotation: ${data.rotation ? '✅' : '❌'}`)
        console.log(`    📏 Scale: ${data.scale ? '✅' : '❌'}`)
        console.log(`    📋 Tracks: ${data.metadata.tracks.length}`)
      } else {
        console.log(`  ${ringId}: ❌ Not available`)
      }
    })

    console.log(`\n🕐 Total Duration: ${this.totalDuration.toFixed(2)}s`)
    console.log(`🎬 System Status: ${this.isInitialized ? '✅ Ready' : '❌ Not Ready'}`)
    
    console.groupEnd()
  }

  /**
   * 获取动画持续时间
   */
  getDuration() {
    return this.totalDuration
  }

  /**
   * 检查是否准备就绪
   */
  isReady() {
    return this.isInitialized
  }
}

/**
 * 全局多源动画提取器实例
 */
export const multiSourceAnimationExtractor = new MultiSourceAnimationExtractor()