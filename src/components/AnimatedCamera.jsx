import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 动画相机组件
 * 三阶段动画系统：等待 -> 过渡 -> 动画
 */
function AnimatedCamera({
  animationExtractor,
  isPlaying = false,
  currentTime = 0,
  onCameraUpdate = null
}) {
  const cameraRef = useRef()
  const { set } = useThree()

  // 用于存储Phase 3开始时的相机状态，确保平滑过渡
  const phase3StartState = useRef(null)

  // 三阶段动画配置
  const PHASE_CONFIG = {
    WAIT_DURATION: 2.0,      // Phase 0: 等待阶段 2秒
    TRANSITION_DURATION: 1.0, // Phase 1: 过渡阶段 1秒

    // Phase 0: 等待阶段的相机参数
    WAIT_CAMERA: {
      position: [-18.43, 14.48, 16.30],
      target: [-1.40, 15.30, -1.33],
      fov: 35.0
    }
  }

  // 相机默认参数（来自Camera.jsx）
  const defaultCameraParams = {
    position: [13.037, 2.624, 23.379],
    rotation: [0.318, 0.562, -0.051],
    fov: 25.361,
    near: 0.1,
    far: 10000
  }

  // 计算当前动画阶段
  const getCurrentPhase = (time) => {
    const originalAnimationDuration = animationExtractor?.getOriginalAnimationDuration() || 7
    const phase2EndTime = PHASE_CONFIG.WAIT_DURATION + PHASE_CONFIG.TRANSITION_DURATION + originalAnimationDuration

    if (time < PHASE_CONFIG.WAIT_DURATION) {
      return { phase: 0, phaseTime: time }
    } else if (time < PHASE_CONFIG.WAIT_DURATION + PHASE_CONFIG.TRANSITION_DURATION) {
      return {
        phase: 1,
        phaseTime: time - PHASE_CONFIG.WAIT_DURATION
      }
    } else if (time < phase2EndTime) {
      return {
        phase: 2,
        phaseTime: time - PHASE_CONFIG.WAIT_DURATION - PHASE_CONFIG.TRANSITION_DURATION
      }
    } else {
      return {
        phase: 3,
        phaseTime: time - phase2EndTime
      }
    }
  }

  // 计算lookAt旋转
  const calculateLookAtRotation = (position, target) => {
    const camera = new THREE.PerspectiveCamera()
    camera.position.set(position[0], position[1], position[2])
    camera.lookAt(target[0], target[1], target[2])
    return camera.rotation.toArray()
  }

  // 设置为默认相机
  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current })
      console.log('📹 Three-Phase Animated Camera set as default')
    }
  }, [set])

  // 每帧更新相机变换
  useFrame(() => {
    if (!cameraRef.current || !isPlaying) {
      return
    }

    try {
      const { phase, phaseTime } = getCurrentPhase(currentTime)

      // 重置Phase 3状态（当不在Phase 3时）
      if (phase !== 3 && phase3StartState.current) {
        phase3StartState.current = null
      }

      if (phase === 0) {
        // Phase 0: 等待阶段 - 静态相机位置
        cameraRef.current.position.set(...PHASE_CONFIG.WAIT_CAMERA.position)

        // 计算lookAt旋转
        const rotation = calculateLookAtRotation(
          PHASE_CONFIG.WAIT_CAMERA.position,
          PHASE_CONFIG.WAIT_CAMERA.target
        )
        cameraRef.current.rotation.set(rotation[0], rotation[1], rotation[2])

        // 设置FOV
        cameraRef.current.fov = PHASE_CONFIG.WAIT_CAMERA.fov
        cameraRef.current.updateProjectionMatrix()

      } else if (phase === 1) {
        // Phase 1: 过渡阶段 - 从等待位置过渡到动画开始位置
        if (!animationExtractor?.isReady()) return

        const progress = phaseTime / PHASE_CONFIG.TRANSITION_DURATION
        const easeProgress = easeInOutCubic(progress)

        // 获取动画第一帧的相机数据
        const animStartTransform = animationExtractor.getCameraTransformAtTime(0)

        if (animStartTransform) {
          // 位置插值
          const startPos = PHASE_CONFIG.WAIT_CAMERA.position
          const endPos = [animStartTransform.position.x, animStartTransform.position.y, animStartTransform.position.z]

          const currentPos = [
            startPos[0] + (endPos[0] - startPos[0]) * easeProgress,
            startPos[1] + (endPos[1] - startPos[1]) * easeProgress,
            startPos[2] + (endPos[2] - startPos[2]) * easeProgress
          ]
          cameraRef.current.position.set(...currentPos)

          // 旋转插值
          const startRotation = calculateLookAtRotation(
            PHASE_CONFIG.WAIT_CAMERA.position,
            PHASE_CONFIG.WAIT_CAMERA.target
          )

          let endRotation
          if (animStartTransform.rotation.w !== undefined) {
            // 四元数转欧拉角
            const quat = new THREE.Quaternion(
              animStartTransform.rotation.x,
              animStartTransform.rotation.y,
              animStartTransform.rotation.z,
              animStartTransform.rotation.w
            )
            const euler = new THREE.Euler().setFromQuaternion(quat)
            endRotation = [euler.x, euler.y, euler.z]
          } else {
            endRotation = [animStartTransform.rotation.x, animStartTransform.rotation.y, animStartTransform.rotation.z]
          }

          const currentRotation = [
            startRotation[0] + (endRotation[0] - startRotation[0]) * easeProgress,
            startRotation[1] + (endRotation[1] - startRotation[1]) * easeProgress,
            startRotation[2] + (endRotation[2] - startRotation[2]) * easeProgress
          ]
          cameraRef.current.rotation.set(...currentRotation)

          // FOV插值
          const startFov = PHASE_CONFIG.WAIT_CAMERA.fov
          const endFov = animStartTransform.fov || defaultCameraParams.fov
          const currentFov = startFov + (endFov - startFov) * easeProgress

          cameraRef.current.fov = currentFov
          cameraRef.current.updateProjectionMatrix()
        }

      } else if (phase === 2) {
        // Phase 2: 动画阶段 - 播放原有动画
        if (!animationExtractor?.isReady()) return

        // 从动画提取器获取相机变换数据
        console.log(`🎬 Getting camera transform for time: ${phaseTime.toFixed(2)}s`)
        const cameraTransform = animationExtractor.getCameraTransformAtTime(phaseTime)
        console.log(`📊 animationExtractor ready: ${animationExtractor?.isReady()}, duration: ${animationExtractor?.getDuration()}`)

        // 计算结尾调整（最后3秒开始轻微调整，为 Phase 3 做准备）
        const originalDuration = animationExtractor.getDuration()
        const adjustDuration = 3.0 // 减少到3秒，让调整更轻微
        const endAdjustStartTime = originalDuration - adjustDuration
        const isInEndAdjustment = phaseTime >= endAdjustStartTime

        // 平滑调整因子 (0 到 1)
        const adjustFactor = isInEndAdjustment
          ? Math.min(1, (phaseTime - endAdjustStartTime) / adjustDuration)
          : 0

        const smoothFactor = easeInOutCubic(adjustFactor)

        // 调试信息 - 检查调整是否被触发
        if (phaseTime > 5) { // 只在动画后期显示
          console.log(`🎯 Time: ${phaseTime.toFixed(2)}s, Duration: ${originalDuration.toFixed(2)}s, EndStart: ${endAdjustStartTime.toFixed(2)}s`)
          console.log(`🎯 IsInEndAdjustment: ${isInEndAdjustment}, AdjustFactor: ${adjustFactor.toFixed(3)}`)
        }

        // 调试cameraTransform
        console.log(`🔍 cameraTransform exists: ${!!cameraTransform}, phaseTime: ${phaseTime.toFixed(2)}s`)
        if (cameraTransform) {
          console.log(`✅ cameraTransform found, proceeding with camera updates`)
          // 更新相机位置
          if (cameraTransform.position) {
            let x = cameraTransform.position.x
            let y = cameraTransform.position.y
            let z = cameraTransform.position.z

            // 结尾调整：微调相机位置让构图更居中
            if (isInEndAdjustment) {
              // 分阶段调整：位置调整在前70%时间内完成，更柔和
              const positionFactor = Math.min(1, adjustFactor / 0.7)
              const positionSmooth = easeInOutCubic(positionFactor)

              const deltaX = 4.0 * positionSmooth  // 减少向左移动，让过渡更平滑
              const deltaY = -0.15 * positionSmooth // 减小向下移动

              x += deltaX
              y += deltaY

              console.log(`🎯 END ADJUSTMENT ACTIVE! Time: ${phaseTime.toFixed(2)}s`)
              console.log(`📍 Position adjustment: deltaX=${deltaX.toFixed(3)}, deltaY=${deltaY.toFixed(3)}`)
              console.log(`📍 Final position: [${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`)
            }

            cameraRef.current.position.set(x, y, z)
          }

          // 更新相机旋转
          if (cameraTransform.rotation) {
            if (cameraTransform.rotation.w !== undefined) {
              // 四元数旋转
              let quat = new THREE.Quaternion(
                cameraTransform.rotation.x,
                cameraTransform.rotation.y,
                cameraTransform.rotation.z,
                cameraTransform.rotation.w
              )

              // 结尾调整：微调相机角度指向圆环中心
              if (isInEndAdjustment) {
                // 分阶段调整：角度调整从30%开始，在后70%时间内完成
                const rotationFactor = adjustFactor > 0.3 ? (adjustFactor - 0.3) / 0.7 : 0
                const rotationSmooth = easeInOutCubic(rotationFactor)

                // 创建向左看的额外旋转，减小幅度更自然
                const adjustRotation = new THREE.Quaternion()
                adjustRotation.setFromEuler(new THREE.Euler(0, -0.05 * rotationSmooth, 0)) // 更轻微的角度调整

                // 应用额外旋转
                quat.multiply(adjustRotation)
              }

              cameraRef.current.setRotationFromQuaternion(quat)
            } else {
              // 欧拉角旋转
              let rotX = cameraTransform.rotation.x
              let rotY = cameraTransform.rotation.y
              let rotZ = cameraTransform.rotation.z

              // 结尾调整：微调相机角度
              if (isInEndAdjustment) {
                // 分阶段调整：角度调整从30%开始
                const rotationFactor = adjustFactor > 0.3 ? (adjustFactor - 0.3) / 0.7 : 0
                const rotationSmooth = easeInOutCubic(rotationFactor)

                rotY += 0 * rotationSmooth // 更轻微的角度调整
              }

              cameraRef.current.rotation.set(rotX, rotY, rotZ)
            }
          }

          // 更新FOV
          if (cameraTransform.fov !== undefined) {
            cameraRef.current.fov = cameraTransform.fov
            cameraRef.current.updateProjectionMatrix()
          }
        }

      } else if (phase === 3) {
        // Phase 3: 结尾优化阶段 - 优雅的相机漂移调整
        console.log(`✨ Phase 3 - Elegant camera drift! Time: ${phaseTime.toFixed(2)}s`)

        // 在Phase 3刚开始时，记录当前相机状态作为起始点
        if (phaseTime < 0.05 && !phase3StartState.current) {
          phase3StartState.current = {
            position: {
              x: cameraRef.current.position.x,
              y: cameraRef.current.position.y,
              z: cameraRef.current.position.z
            },
            rotation: {
              x: cameraRef.current.rotation.x,
              y: cameraRef.current.rotation.y,
              z: cameraRef.current.rotation.z
            },
            fov: cameraRef.current.fov
          }
          console.log(`🎯 Phase 3 baseline recorded`)
        }

        if (phase3StartState.current) {
          // 使用更长的调整时间和更优雅的缓动
          const adjustDuration = 4.0 // 延长调整时间到4秒，给足时间精确对位
          const adjustProgress = Math.min(1, phaseTime / adjustDuration)
          
          // 使用更优雅的缓动函数 - quintic easing
          const easeOutQuint = (t) => {
            return 1 - Math.pow(1 - t, 5)
          }
          const smoothProgress = easeOutQuint(adjustProgress)

          const startPos = phase3StartState.current.position
          const startRot = phase3StartState.current.rotation
          const startFov = phase3StartState.current.fov

          // 优化目标调整 - 正对圆环中心
          const targetXOffset = 2.5   // 向右移动，居中对准圆环
          const targetYOffset = -1.0  // 向下移动，垂直居中
          const targetZOffset = 5.0   // 向后移动到最佳观看距离

          // 使用分段调整，让移动更有层次
          let positionProgress = smoothProgress
          let rotationProgress = Math.max(0, smoothProgress - 0.2) / 0.8 // 旋转稍微延迟
          rotationProgress = Math.min(1, rotationProgress)

          // 平滑位置调整
          const currentX = startPos.x + targetXOffset * positionProgress
          const currentY = startPos.y + targetYOffset * positionProgress
          const currentZ = startPos.z + targetZOffset * positionProgress

          cameraRef.current.position.set(currentX, currentY, currentZ)

          // 精确旋转调整 - 使用lookAt方法确保正对圆环
          const ringCenterPosition = [0, 8, 0] // 假设的圆环中心位置
          
          if (rotationProgress > 0) {
            // 创建一个临时相机来计算lookAt旋转
            const tempCamera = new THREE.PerspectiveCamera()
            tempCamera.position.set(currentX, currentY, currentZ)
            tempCamera.lookAt(ringCenterPosition[0], ringCenterPosition[1], ringCenterPosition[2])
            
            // 在原始旋转和lookAt旋转之间插值
            const targetRotation = tempCamera.rotation
            
            const currentRotX = startRot.x + (targetRotation.x - startRot.x) * rotationProgress
            const currentRotY = startRot.y + (targetRotation.y - startRot.y) * rotationProgress
            const currentRotZ = startRot.z + (targetRotation.z - startRot.z) * rotationProgress
            
            cameraRef.current.rotation.set(currentRotX, currentRotY, currentRotZ)
          } else {
            cameraRef.current.rotation.set(startRot.x, startRot.y, startRot.z)
          }

          // FOV调整 - 适合圆环完整显示
          const targetFovOffset = -3.0  // 稍微缩小FOV，让圆环更突出
          const currentFov = startFov + targetFovOffset * smoothProgress

          cameraRef.current.fov = currentFov
          cameraRef.current.updateProjectionMatrix()

          // 简化日志输出
          if (phaseTime % 0.5 < 0.05) { // 每0.5秒输出一次
            console.log(`✨ Elegant drift: ${(smoothProgress * 100).toFixed(0)}% complete`)
          }
        }
      }

      // 通知父组件相机已更新
      if (onCameraUpdate) {
        onCameraUpdate({
          position: cameraRef.current.position.toArray(),
          rotation: cameraRef.current.rotation.toArray(),
          fov: cameraRef.current.fov,
          phase: phase,
          phaseTime: phaseTime
        })
      }

    } catch (error) {
      console.error('Error updating three-phase animated camera:', error)
    }
  })

  // 缓动函数
  const easeInOutCubic = (t) => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={true}
      position={defaultCameraParams.position}
      rotation={defaultCameraParams.rotation}
      fov={defaultCameraParams.fov}
      near={defaultCameraParams.near}
      far={defaultCameraParams.far}
    />
  )
}

export default AnimatedCamera