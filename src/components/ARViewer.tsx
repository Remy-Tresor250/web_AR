import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

// Types
interface ARViewerProps {
  modelPath?: string;
  objectColor?: string;
  objectSize?: number;
}

// Use the built-in XRSystem type
declare global {
  interface Navigator {
    xr?: XRSystem;
  }
}

const ARViewer: React.FC<ARViewerProps> = ({
  modelPath,
  objectColor = "#00ff00",
  objectSize = 0.1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectRef = useRef<THREE.Mesh | null>(null);
  const controllerRef = useRef<THREE.Group | null>(null);

  const [isARSupported, setIsARSupported] = useState(true);
  const [isARSessionActive, setIsARSessionActive] = useState(false);
  const [isObjectPlaced, setIsObjectPlaced] = useState(false);

  // Initialize Three.js scene
  const initializeScene = useCallback(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create default object (cube) or load 3D model
    const geometry = new THREE.BoxGeometry(objectSize, objectSize, objectSize);
    const material = new THREE.MeshPhongMaterial({
      color: objectColor,
      specular: 0x444444,
      shininess: 30,
    });
    const object = new THREE.Mesh(geometry, material);

    // Lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Store refs
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    objectRef.current = object;

    return () => {
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [objectColor, objectSize]);

  // Handle object placement
  const handleSelect = useCallback(() => {
    if (
      !isObjectPlaced &&
      objectRef.current &&
      controllerRef.current &&
      sceneRef.current
    ) {
      sceneRef.current.add(objectRef.current);
      objectRef.current.position.setFromMatrixPosition(
        controllerRef.current.matrixWorld
      );
      setIsObjectPlaced(true);
    }
  }, [isObjectPlaced]);

  // Start AR session
  const startARSession = async () => {
    try {
      const session = await navigator?.xr?.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body },
      });

      const renderer = rendererRef.current;
      if (!renderer) return;

      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local");
      await renderer.xr.setSession(session);

      // Set up controller
      const controller = renderer.xr.getController(0);
      controller.addEventListener("select", handleSelect);
      sceneRef.current?.add(controller);
      controllerRef.current = controller;

      setIsARSessionActive(true);

      session.addEventListener("end", () => {
        setIsARSessionActive(false);
        setIsObjectPlaced(false);
      });
    } catch (error) {
      console.error("Error starting AR session:", error);
      setIsARSessionActive(false);
    }
  };

  // Animation loop
  const startAnimationLoop = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.setAnimationLoop(() => {
      if (isObjectPlaced && objectRef.current) {
        objectRef.current.rotation.x += 0.01;
        objectRef.current.rotation.y += 0.01;
      }

      if (sceneRef.current && cameraRef.current) {
        renderer.render(sceneRef.current, cameraRef.current);
      }
    });
  }, [isObjectPlaced]);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current)
      return;

    const camera = cameraRef.current;
    const renderer = rendererRef.current;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, []);

  // Check AR support
  useEffect(() => {
    if (!("xr" in navigator)) {
      setIsARSupported(false);
      return;
    }

    navigator?.xr
      ?.isSessionSupported("immersive-ar")
      .then((supported) => setIsARSupported(supported))
      .catch(() => setIsARSupported(false));
  }, []);

  // Initialize scene and set up event listeners
  useEffect(() => {
    const cleanup = initializeScene();
    startAnimationLoop();
    window.addEventListener("resize", handleResize);

    return () => {
      cleanup?.();
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.setAnimationLoop(null);
      rendererRef.current?.xr.getSession()?.end();
    };
  }, [initializeScene, startAnimationLoop, handleResize]);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />

      {!isARSupported && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded">
          WebXR AR is not supported in your browser
        </div>
      )}

      {!isARSessionActive && isARSupported && (
        <button
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-lg hover:bg-blue-600 transition-colors"
          onClick={startARSession}
        >
          Start AR
        </button>
      )}

      {isARSessionActive && !isObjectPlaced && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded">
          Tap in the real world to place the object
        </div>
      )}
    </div>
  );
};

export default ARViewer;
