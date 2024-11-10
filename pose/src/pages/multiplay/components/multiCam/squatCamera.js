// squatCam.js

import React, { useEffect, useRef, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { angleCalc } from "../../../../app/workoutCam/angleCalc";
import { useGreenFlashEffect } from "../../../../app/workoutCam/greenFlashEffect";
import "../../../../app/workoutCam/exBL.css";
import socket from "../../services/Socket";
import ExerciseTimer from "../../../../app/exerciseTimer";

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

function MediapipeSquatTracking({
  onCanvasUpdate,
  active,
  onCountUpdate,
  roomName,
  duration,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const [squatCount, setSquatCount] = useState(0);
  const [remoteSquatCount, setRemoteSquatCount] = useState(0);
  const squatStateRef = useRef("up");
  
  const [showTimer, setShowTimer] = useState(false);
  const [remainingTime, setRemainingTime] = useState(null); // 남은 시간 관리
  const timerStartTimeRef = useRef(null);

  const countdownMusicRef = useRef(null);
  const [currentCountdownIndex, setCurrentCountdownIndex] = useState(0);
  const countdownImages = ["count3.png", "count2.png", "count1.png", "countStart.png"];
  
  

  const { triggerGreenFlash, triggerGoodBox, drawEffects } =
    useGreenFlashEffect();

  function onPreMovement() {
    triggerGreenFlash();
  }

  function onCountIncrease() {
    triggerGreenFlash();
    triggerGoodBox();
    setSquatCount((prevCount) => {
      const newCount = prevCount + 1;

      // 효과음 재생
      const audio = new Audio("/sound/good.wav"); // 효과음 파일 경로
      audio.play();

      // 서버에 스쿼트 횟수 업데이트 전송
      socket.emit("squatCountUpdate", {
        roomName,
        count: newCount,
      });

      if (onCountUpdate) {
        onCountUpdate(newCount);
      }

      return newCount;
    });
  }

  useEffect(() => {
    // 서버로부터 상대방의 스쿼트 횟수 업데이트 수신
    socket.on("remoteSquatCountUpdate", ({ username, count }) => {
      setRemoteSquatCount(count);
    });

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
        drawLandmarks(
          canvasCtx,
          results.poseLandmarks.filter((_, index) => index > 10),
          {
            color: "blue",
            lineWidth: 2,
          }
        );

        const landmarks = results.poseLandmarks;

        // Required landmark indices
        const requiredLandmarkIndices = [
          11, 12, 23, 24, 25, 26, 27, 28, 29, 30,
        ];
        const allLandmarksPresent = requiredLandmarkIndices.every(
          (index) => landmarks[index]
        );

        if (!allLandmarksPresent) {
          console.warn("Some landmarks are missing");
          return;
        }

        // Left knee angle (left_hip, left_knee, left_ankle)
        const leftKneeAngle = angleCalc(landmarks, 23, 25, 27);

        // Right knee angle (right_hip, right_knee, right_ankle)
        const rightKneeAngle = angleCalc(landmarks, 24, 26, 28);

        // Left hip angle (left_shoulder, left_hip, left_knee)
        const leftHipAngle = angleCalc(landmarks, 11, 23, 25);

        // Right hip angle (right_shoulder, right_hip, right_knee)
        const rightHipAngle = angleCalc(landmarks, 12, 24, 26);

        // Torso angle (nose, left_shoulder, left_hip)
        const leftTorsoAngle = angleCalc(landmarks, 0, 11, 23);
        const rightTorsoAngle = angleCalc(landmarks, 0, 12, 24);

        if (
          leftKneeAngle === null ||
          rightKneeAngle === null ||
          leftHipAngle === null ||
          rightHipAngle === null ||
          leftTorsoAngle === null ||
          rightTorsoAngle === null
        ) {
          console.warn("Angle calculation returned null");
          return;
        }

        // Squat down condition
        const isSquatDown =
          leftKneeAngle < 100 &&
          rightKneeAngle < 100 &&
          leftHipAngle < 100 &&
          rightHipAngle < 100 &&
          leftTorsoAngle > 30 &&
          rightTorsoAngle > 30;

        // Squat up condition
        const isSquatUp = leftKneeAngle > 140 || rightKneeAngle > 140;

        // Update squat state and count
        if (isSquatDown && squatStateRef.current === "up") {
          squatStateRef.current = "down";
          onPreMovement();
        }

        if (isSquatUp && squatStateRef.current === "down") {
          squatStateRef.current = "up";
          onCountIncrease();
        }

        // Draw effects (green flash and "Good!" box)
        drawEffects(
          canvasCtx,
          canvasRef.current.width,
          canvasRef.current.height
        );

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
      socket.off("remoteSquatCountUpdate");
    };
  }, [active, roomName]);


  const startExerciseTimer = (initialTime) => {
    setShowTimer(true);
    timerStartTimeRef.current = Date.now();
    setRemainingTime(Math.floor(initialTime));
  };

  const endExercise = () => {
    setShowTimer(false);
    console.log("운동 종료");
    // 운동 종료 시 추가 로직 (ex: 서버에 종료 알림)
  };

  // 타이머 시작 신호 수신 및 타이머 시작 로직
  useEffect(() => {

    socket.emit("startExerciseTimer", {
      roomName,
      duration: 60, // 예를 들어 5분(300초) 동안 운동 타이머
    });

    socket.on("exerciseTimerStarted", ({ startTime, duration }) => {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const initialRemainingTime = duration - elapsedTime;

      if (initialRemainingTime > 0) {
        startExerciseTimer(Math.floor(initialRemainingTime));
      } else {
        setRemainingTime(0); // 이미 종료된 경우
      }
    });

    return () => {
      socket.off("exerciseTimerStarted");
    };
  }, [roomName]);


  
  
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <video
        ref={videoRef}
        style={{
          display: "none", // 비디오 요소를 숨깁니다.
        }}
      ></video>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0, // 투명도를 0으로 설정하여 보이지 않게 합니다.
          width: "800px",
          height: "640px",
        }}
      ></canvas>
      {/* Squat count display */}
      <div className="vs_container">
        <div className="vs_element">
          {/* 로컬 사용자의 스쿼트 횟수 */}
          <h1>{squatCount}</h1>
          <h1>&nbsp; VS &nbsp;</h1>
          {/* 상대방의 스쿼트 횟수 */}
          <h1>{remoteSquatCount}</h1>
        </div>
      </div>
      {/* 운동 타이머 */}
      {showTimer && remainingTime !== null && (
        <ExerciseTimer
          durationInSeconds={remainingTime}
          onTimerEnd={endExercise}
          startTimeRef={timerStartTimeRef}
        />
      )}
    </div>
  );
}

export default MediapipeSquatTracking;
