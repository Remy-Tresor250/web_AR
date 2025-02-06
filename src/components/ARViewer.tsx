/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ARViewerProps {
  modelPath?: string; // Optional path to a 3D model
}

const ARViewer: React.FC<ARViewerProps> = ({ modelPath }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isARSupported, setIsARSupported] = useState(true);
  const [isARSessionActive, setIsARSessionActive] = useState(false);

  const startARSession = async () => {
    try {
      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
      });

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(session);

      setIsARSessionActive(true);

      // Clean up session when it ends
      session.addEventListener('end', () => {
        setIsARSessionActive(false);
      });
    } catch (error) {
      console.error('Error starting AR session:', error);
      setIsARSessionActive(false);
    }
  };

  useEffect(() => {
    if (!('xr' in navigator)) {
      setIsARSupported(false);
      return;
    }

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
      alpha: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Create AR object (cube as default)
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      specular: 0x444444,
      shininess: 30
    });
    const cube = new THREE.Mesh(geometry, material);

    // Add lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    let controller: THREE.Group;
    let objectPlaced = false;

    const startARSession = async () => {
      try {
        const session = await (navigator as any).xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        });

        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');
        await renderer.xr.setSession(session);

        // Set up controller for hit testing
        controller = renderer.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.add(controller);

        setIsARSessionActive(true);

        // Clean up session when it ends
        session.addEventListener('end', () => {
          setIsARSessionActive(false);
        });
      } catch (error) {
        console.error('Error starting AR session:', error);
        setIsARSessionActive(false);
      }
    };

    const onSelect = () => {
      if (!objectPlaced) {
        scene.add(cube);
        cube.position.setFromMatrixPosition(controller.matrixWorld);
        objectPlaced = true;
      }
    };

    // Animation loop
    renderer.setAnimationLoop((timestamp, frame) => {
      if (objectPlaced) {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    });

    // Handle window resize
    const handleResize = () => {
      if (containerRef.current) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef?.current?.removeChild(renderer.domElement);
      }
      renderer.setAnimationLoop(null);
      if (renderer.xr.getSession()) {
        renderer.xr.getSession()?.end();
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-full" />
      
      {!isARSupported && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded">
          WebXR is not supported in your browser
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
      
      {!isARSessionActive && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded">
          Tap in the real world to place the object
        </div>
      )}
    </div>
  );
};

export default ARViewer;