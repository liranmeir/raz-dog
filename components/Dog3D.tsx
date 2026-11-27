'use client';

/* eslint-disable react-hooks/immutability -- three.js objects (animation actions, bones) are
   mutable scene-graph nodes that R3F expects us to mutate imperatively in effects and useFrame. */

import { ContactShadows, useAnimations, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Box3, LoopOnce, LoopRepeat, MathUtils, Vector3, type Bone, type Group, type Object3D } from 'three';
import type { DogMood } from '@/components/Dog';
import { Accessory } from '@/components/dog3d/Accessory';
import { ToyDog } from '@/components/dog3d/ToyDog';
import { ONE_SHOT_MOODS, pickClip, pickHeadBoneName } from '@/lib/dog3d/animation-map';
import { DOG_MODEL } from '@/lib/dog3d/config';

export type Dog3DProps = {
  mood: DogMood;
  mouthOpen?: number;
  accessory?: { emoji: string; slot: 'head' | 'face' } | null;
  onHeadTap?: () => void;
  onBellyTap?: () => void;
  className?: string;
};

const CAMERA_TARGET = new Vector3(0, 0.8, 0);

export default function Dog3D(props: Dog3DProps) {
  const [hasModel, setHasModel] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(DOG_MODEL.url, { method: 'HEAD' })
      .then((r) => alive && setHasModel(r.ok))
      .catch(() => alive && setHasModel(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className={`aspect-[6/7] ${props.className ?? ''}`}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.25, 3.9], fov: 32 }}>
        <LookAt />
        <ambientLight intensity={0.9} />
        <hemisphereLight args={['#fff7e6', '#b8d8f0', 0.8]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.6} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#cfe8ff" />
        <Suspense fallback={null}>
          {hasModel === true && <ModelDog {...props} />}
          {hasModel === false && <ToyDog {...props} />}
        </Suspense>
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={4} blur={2.5} far={2} />
      </Canvas>
    </div>
  );
}

function LookAt() {
  const camera = useThree((s) => s.camera);
  useEffect(() => camera.lookAt(CAMERA_TARGET), [camera]);
  return null;
}

// ---------------------------------------------------------------- GLB model

function ModelDog({ mood, mouthOpen = 0, accessory, onHeadTap, onBellyTap }: Dog3DProps) {
  const { scene, animations } = useGLTF(DOG_MODEL.url);
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const hat = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, root);

  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const s = DOG_MODEL.targetHeight / Math.max(size.y, size.x * 0.75, size.z * 0.75);
    return { s, offset: new Vector3(-center.x * s, -box.min.y * s, -center.z * s), height: size.y * s };
  }, [scene]);

  const headBone = useMemo(() => {
    const bones: Bone[] = [];
    scene.traverse((o: Object3D) => {
      if ((o as Bone).isBone) bones.push(o as Bone);
    });
    const name = pickHeadBoneName(bones.map((b) => b.name));
    return bones.find((b) => b.name === name) ?? null;
  }, [scene]);

  // cross-fade to the clip that fits the mood
  useEffect(() => {
    const clip = pickClip(mood, names);
    const action = clip ? actions[clip] : null;
    if (!action) return;
    const once = ONE_SHOT_MOODS.has(mood);
    action.reset();
    action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.timeScale = mood === 'sleep' ? 0.5 : 1;
    action.fadeIn(0.25).play();
    return () => {
      action.fadeOut(0.25);
    };
  }, [mood, actions, names]);

  const tmp = useMemo(() => new Vector3(), []);
  const mouth = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    mouth.current = MathUtils.damp(mouth.current, mood === 'talk' ? mouthOpen : 0, 18, dt);
    const m = mouth.current;
    if (body.current) {
      // procedural "talking" + gentle life when the model has no idle clip
      const bob = names.length === 0 && mood !== 'sleep' ? Math.sin(t * 2.4) * 0.02 : 0;
      body.current.scale.set(1 - m * 0.03, 1 + m * 0.07, 1 - m * 0.03);
      body.current.position.y = bob;
      const dance = mood === 'dance' && names.length === 0 ? Math.sin(t * 6) * 0.25 : 0;
      body.current.rotation.y = dance;
    }
    if (headBone) {
      headBone.rotation.x += m * 0.35; // runs after the mixer, adds a nod on top
      if (mood === 'hmm') headBone.rotation.z += 0.2;
    }
    if (hat.current) {
      if (headBone) {
        headBone.getWorldPosition(tmp);
        hat.current.position.set(tmp.x, tmp.y + (accessory?.slot === 'face' ? 0.05 : fit.height * 0.18), tmp.z + 0.05);
      } else {
        hat.current.position.set(0, fit.height * (accessory?.slot === 'face' ? 0.75 : 1.02), 0.1);
      }
    }
  });

  function tap(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (e.point.y > fit.height * 0.55) onHeadTap?.();
    else onBellyTap?.();
  }

  return (
    <>
      <group ref={body}>
        <group ref={root} rotation-y={DOG_MODEL.rotationY} position={fit.offset} scale={fit.s} onPointerDown={tap}>
          <primitive object={scene} />
        </group>
      </group>
      <group ref={hat}>
        <Accessory accessory={accessory} size={fit.height * 0.32} />
      </group>
    </>
  );
}
