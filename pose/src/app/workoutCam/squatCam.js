// MediapipeSquatTracking.js

import React, { useEffect, useRef } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { angleCalc } from "./angleCalc";
import { useGreenFlashEffect } from "./greenFlashEffect";

let poseSingleton = null;

const POSE_CONNECTIONS = [
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 12],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, 31],
  [30, 32],
];

function MediapipeSquatTracking({ onCanvasUpdate, active, onCountUpdate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const squatCountRef = useRef(0);
  const squatStateRef = useRef("up");
  let currHeadY = useRef(null);
  let upHeadY = useRef(null);
  let downHeadY = useRef(null);
  let upHeadZ = useRef(null);


  const { triggerGreenFlash, triggerGoodBox, drawEffects } =
    useGreenFlashEffect();

  function onPreMovement() {
    triggerGreenFlash();
  }

  function onCountIncrease() {
    triggerGreenFlash();
    triggerGoodBox(); // Trigger the "Good!" box
    squatCountRef.current += 1;
    if (onCountUpdate) {
      onCountUpdate(squatCountRef.current);
    }
  }

  useEffect(() => {
    if (!poseSingleton) {
      poseSingleton = new Pose({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      poseSingleton.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseSingleton.onResults(onResults);
    }

    async function onResults(results) {
      if (!canvasRef.current) return;

      const canvasCtx = canvasRef.current.getContext("2d");
      canvasCtx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: "white",
          lineWidth: 4,
        });
        drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: "blue",
          lineWidth: 2,
        });

        // Check if poseLandmarks exists before accessing it
        if (results.poseLandmarks && results.poseLandmarks[0]) {
            currHeadY.current = results.poseLandmarks[0].y;
            console.log(currHeadY);
        }

        // 왼쪽과 오른쪽 다리의 각도 계산
        const leftSquatAngle = angleCalc(results.poseLandmarks, "left", 1, 3, 4);
        const rightSquatAngle = angleCalc(results.poseLandmarks, "right", 1, 3, 4);

        // 스쿼트 상태 전환 및 카운트 업데이트
        if (
          (leftSquatAngle < 90 && squatStateRef.current === "up") ||
          (rightSquatAngle < 90 && squatStateRef.current === "up")
        ) {
          squatStateRef.current = "down";
          downHeadY.current = results.poseLandmarks[0].y;
          console.log('downheadY',downHeadY);
        }

        if (isSquatUp && squatStateRef.current === "down") {
          squatStateRef.current = "up";
          // 내려갔을 때 downHeadY의 위치를 확인한다.
          upHeadY.current = results.poseLandmarks[0].y;
          upHeadZ.current = results.poseLandmarks[0].z;
          console.log('upheadY',upHeadY);
          console.log('upheadZ',upHeadZ);
          setSquatCount((prevCount) => {
            const newCount = prevCount + 1;
            if (onCountUpdate) {
              onCountUpdate(newCount); // 부모 컴포넌트로 카운트 업데이트 전달
            }
            return newCount;
          });
        }

        // 부모 컴포넌트로 업데이트된 캔버스 전달
        if (onCanvasUpdate) {
          onCanvasUpdate(canvasRef.current);
        }
      }
    }

    if (active) {
      let camera = cameraRef.current;
      const videoElement = videoRef.current;
      if (videoElement && !camera) {
        camera = new Camera(videoElement, {
          onFrame: async () => {
            if (poseSingleton) {
              await poseSingleton.send({ image: videoElement });
            }
          },
          width: 0,
          height: 0,
        });
        camera.start();
        cameraRef.current = camera;
      }
    } else {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, [active]);

  return (
    <div>
      <video
        ref={videoRef}
        width="800"
        height="auto"
        style={{ display: "block", position: "absolute", top: 10, right: 10 }}
      ></video>
      <canvas
        ref={canvasRef}
        width="800"
        height="640"
        style={{ display: "block", position: "absolute", top: 10, right: 10 }}
      ></canvas>
      {/* Squat count display */}
      <div
        style={{
          position: "absolute",
          width: "250px",
          textAlign: "center",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 3,
          border: "2px solid black",
          borderRadius: "30px",
          background: "white",
        }}
      >
        <h1>스쿼트 횟수: {squatCountRef.current}</h1>
      </div>
    </div>
  );
}

export default MediapipeSquatTracking;
