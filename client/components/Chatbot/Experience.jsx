import {
  CameraControls,
  Environment,
  Gltf,
  Html,
  useProgress,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Chatbot from "./ChatbotUser";
import { degToRad } from "three/src/math/MathUtils";
import { Suspense, useState, useEffect } from "react";
import MessageBox from "./MessageBox";
import { useLanguage } from "@/context/LanguageContext";
import ChatComponent from "./ChatComponent";

const CameraManager = () => {
  return (
    <CameraControls
      minZoom={1}
      maxZoom={2}
      polarRotateSpeed={-0.3}
      azimuthRotateSpeed={-0.3}
      mouseButtons={{
        left: 1,
        wheel: 16,
      }}
      touches={{
        one: 32,
        two: 512,
      }}
      minAzimuthAngle={degToRad(-10)}
      maxAzimuthAngle={degToRad(10)}
      minPolarAngle={degToRad(90)}
      maxPolarAngle={degToRad(100)}
    />
  );
};

const Loader = ({ progress }) => {
  const { dict } = useLanguage();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 space-y-4 w-72">
        <p className="text-xl font-semibold">{dict?.chatbot?.loading}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
      </div>
    </Html>
  );
};

const Experience = () => {
  const [messages, setMessages] = useState([]);
  const [latestMessage, setLatestMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [animationNumber, setAnimationNumber] = useState(0);
  const { progress } = useProgress();

  useEffect(() => {
    if (messages.length > 0) {
      const assistantMessages = messages.filter(
        (msg) => msg.senderId === "assistant"
      );
      if (assistantMessages.length > 0) {
        const lastAssistantMessage =
          assistantMessages[assistantMessages.length - 1];
        setLatestMessage(lastAssistantMessage.message);
      }
    }
  }, [messages]);

  return (
    <div className="h-full w-full relative overflow-hidden flex gap-x-5">
      <div className="rounded-xl h-full w-2/3 relative overflow-hidden">
        <div
          className={`z-10 md:justify-center absolute top-10 right-12 ${
            Math.round(progress) !== 100 ? "hidden" : ""
          }`}
        >
          <MessageBox message={latestMessage} />
        </div>
        <Canvas
          camera={{
            position: [0, 0, 3],
            fov: 50,
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Environment preset="sunset" />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} intensity={0.5} />
          <Suspense fallback={<Loader progress={progress} />}>
            <Gltf
              src="/models/city.glb"
              position={[-1, -0.9, -3.2]}
              rotation-y={-0.75}
              scale={1.2}
            />
            <Chatbot
              position={[-1.4, -0.85, -0.9]}
              scale={0.7}
              rotation-x={degToRad(5)}
              rotation-y={degToRad(10)}
              rotation-z={degToRad(-1)}
              animationNumber={animationNumber}
              name="chatbot"
            />
          </Suspense>
          <CameraManager />
        </Canvas>
      </div>

      <ChatComponent
        messages={messages}
        setMessages={setMessages}
        setLoading={setLoading}
      />
    </div>
  );
};

export default Experience;
