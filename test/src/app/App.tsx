import { useEffect, useState } from "react";
import ZStackZSphere from "../imports/ZStackZSphere";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 886;

export default function App() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#f0f0f0] flex items-start justify-center">
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <ZStackZSphere />
      </div>
    </div>
  );
}
