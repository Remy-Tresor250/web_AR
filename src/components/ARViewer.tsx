/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ARButton } from "three/examples/jsm/webxr/ARButton";

const ARShoeApp: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isARSupported, setIsARSupported] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check for WebXR AR support
    const checkARSupport = async () => {
      if ("xr" in navigator) {
        try {
          const supported = await navigator.xr?.isSessionSupported(
            "immersive-ar"
          );
          setIsARSupported(!!supported);
        } catch (error) {
          console.error("AR support check failed", error);
        }
      }
    };
    checkARSupport();

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // Add AR button
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["hit-test"],
    });
    containerRef.current.appendChild(arButton);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 0);
    scene.add(directionalLight);

    // Load 3D Shoe Model
    const loader = new GLTFLoader();
    loader.load(
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf", // Replace with your shoe model
      (gltf: { scene: any }) => {
        const model = gltf.scene;
        model.scale.set(0.5, 0.5, 0.5);

        // Add interaction for placing and moving the model
        renderer.xr.addEventListener("sessionstart", () => {
          const session = renderer.xr.getSession();

          if (session) {
            session.addEventListener(
              "select",
              async (event: XRInputSourceEvent) => {
                // Place or move the model when user selects
                const referenceSpace = renderer.xr.getReferenceSpace();

                if (referenceSpace) {
                  const hitTestSource = await session.requestHitTestSource?.({
                    space: referenceSpace,
                  });

                  if (hitTestSource && event.frame) {
                    // Type-safe hit test
                    const hitTestResults =
                      event.frame.getHitTestResults(hitTestSource);
                    if (hitTestResults.length > 0) {
                      const pose = hitTestResults[0].getPose(referenceSpace);
                      if (pose) {
                        model.position.set(
                          pose.transform.position.x,
                          pose.transform.position.y,
                          pose.transform.position.z
                        );
                        scene.add(model);
                      }
                    }
                  }
                }
              }
            );
          }
        });
      },
      undefined,
      (error: any) => console.error("Model load error", error)
    );

    // Render loop
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });

    // Cleanup
    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-screen">
      {!isARSupported && (
        <div className="absolute top-0 left-0 w-full text-center p-4 bg-red-500 text-white">
          AR Not Supported on this Device
        </div>
      )}
    </div>
  );
};

export default ARShoeApp;
