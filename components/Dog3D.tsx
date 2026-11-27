'use client';

/* eslint-disable react-hooks/immutability -- three.js objects (animation actions, bones) are
   mutable scene-graph nodes that R3F expects us to mutate imperatively in effects and useFrame. */

import { ContactShadows, useAnimations, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box3,
  CanvasTexture,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  type Bone,
  type Group,
  type Object3D,
} from 'three';
import type { DogMood } from '@/components/Dog';
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
          {hasModel === false && <PlaceholderDog {...props} />}
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

/** Emoji hat/glasses rendered as a sprite inside the 3D scene (no DOM overlay). */
function Accessory({ accessory, size = 0.5 }: { accessory: Dog3DProps['accessory']; size?: number }) {
  const texture = useMemo(() => {
    if (!accessory || typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(accessory.emoji, 128, 140);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [accessory]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <sprite scale={[size, size, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
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

// --------------------------------------------------- built-in placeholder

const FUR = '#EDB06A';
const FUR_DARK = '#D9944A';
const EAR = '#8A5A2B';
const CREAM = '#FFF1DC';
const INK = '#2E211A';

/** A toy-like dog built from primitives, used until a real model is added. */
function PlaceholderDog({ mood, mouthOpen = 0, accessory, onHeadTap, onBellyTap }: Dog3DProps) {
  const dog = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const earL = useRef<Group>(null);
  const earR = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const jaw = useRef<Group>(null);
  const blink = useRef({ next: 2, until: 0 });
  const mouth = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = dog.current;
    const h = head.current;
    if (!d || !h) return;

    mouth.current = MathUtils.damp(mouth.current, mood === 'talk' ? mouthOpen : mood === 'eat' ? (Math.sin(t * 14) + 1) * 0.3 : 0, 18, dt);
    const m = mouth.current;

    // body
    const jump = mood === 'happy' || mood === 'dance' ? Math.abs(Math.sin(t * 7)) * 0.18 : 0;
    const bob = mood === 'sleep' ? 0 : Math.sin(t * 2.4) * 0.02;
    d.position.y = MathUtils.damp(d.position.y, jump + bob, 12, dt);
    d.rotation.y = MathUtils.damp(d.rotation.y, mood === 'dance' ? Math.sin(t * 5) * 0.5 : 0, 6, dt);
    d.rotation.z = MathUtils.damp(d.rotation.z, mood === 'giggle' ? Math.sin(t * 30) * 0.06 : 0, 10, dt);
    const breathe = mood === 'sleep' ? 1 + Math.sin(t * 1.8) * 0.02 : 1;
    d.scale.set(breathe, breathe * (1 + m * 0.04), breathe);

    // head
    const tiltZ = mood === 'hmm' ? 0.3 : mood === 'listen' ? -0.18 : 0;
    const nodX = mood === 'sleep' ? 0.45 : mood === 'eat' ? 0.25 + Math.sin(t * 10) * 0.08 : -m * 0.15;
    h.rotation.z = MathUtils.damp(h.rotation.z, tiltZ, 8, dt);
    h.rotation.x = MathUtils.damp(h.rotation.x, nodX, 10, dt);

    if (jaw.current) jaw.current.rotation.x = MathUtils.damp(jaw.current.rotation.x, m * 0.6, 20, dt);

    // tail + ears
    const wagSpeed = ['happy', 'dance', 'giggle', 'eat'].includes(mood) ? 22 : mood === 'sleep' ? 0 : 5;
    if (tail.current) tail.current.rotation.z = Math.sin(t * wagSpeed) * (wagSpeed > 10 ? 0.6 : 0.2);
    const earUp = mood === 'listen' || mood === 'talk' ? 0.5 : 0;
    if (earL.current) earL.current.rotation.z = MathUtils.damp(earL.current.rotation.z, 0.35 - earUp + Math.sin(t * 2) * 0.04, 8, dt);
    if (earR.current) earR.current.rotation.z = MathUtils.damp(earR.current.rotation.z, -0.35 + earUp - Math.sin(t * 2) * 0.04, 8, dt);

    // eyes: blink, squint when happy, closed when asleep
    const b = blink.current;
    if (t > b.next) {
      b.until = t + 0.14;
      b.next = t + 2.5 + Math.random() * 2.5;
    }
    const closed = mood === 'sleep' || t < b.until;
    const happy = mood === 'happy' || mood === 'giggle' || mood === 'dance';
    if (eyes.current) eyes.current.scale.y = MathUtils.damp(eyes.current.scale.y, closed ? 0.1 : happy ? 0.35 : 1, 25, dt);
  });

  const headTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHeadTap?.();
  };
  const bellyTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onBellyTap?.();
  };

  return (
    <group ref={dog}>
      {/* body */}
      <group onPointerDown={bellyTap}>
        <mesh position={[0, 0.5, -0.05]} scale={[0.5, 0.45, 0.62]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color={FUR} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.45, 0.33]} scale={[0.32, 0.3, 0.25]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color={CREAM} roughness={0.9} />
        </mesh>
        {[
          [-0.25, 0.32],
          [0.25, 0.32],
          [-0.25, -0.4],
          [0.25, -0.4],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.11, z]} scale={[0.13, 0.12, 0.15]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial color={FUR_DARK} roughness={0.8} />
          </mesh>
        ))}
        <group ref={tail} position={[0, 0.72, -0.6]}>
          <mesh position={[0, 0.15, -0.05]} rotation={[-0.5, 0, 0]} scale={[0.07, 0.22, 0.07]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color={FUR_DARK} roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* head */}
      <group ref={head} position={[0, 1.05, 0.2]} onPointerDown={headTap}>
        <mesh>
          <sphereGeometry args={[0.44, 40, 40]} />
          <meshStandardMaterial color={FUR} roughness={0.75} />
        </mesh>
        <group ref={earL} position={[-0.36, 0.18, -0.02]} rotation={[0, 0, 0.35]}>
          <mesh position={[-0.04, -0.2, 0]} scale={[0.12, 0.28, 0.07]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial color={EAR} roughness={0.85} />
          </mesh>
        </group>
        <group ref={earR} position={[0.36, 0.18, -0.02]} rotation={[0, 0, -0.35]}>
          <mesh position={[0.04, -0.2, 0]} scale={[0.12, 0.28, 0.07]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial color={EAR} roughness={0.85} />
          </mesh>
        </group>
        {/* cheeks */}
        {[-0.27, 0.27].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.33]} scale={[0.08, 0.06, 0.03]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#F59AA0" transparent opacity={0.55} />
          </mesh>
        ))}
        {/* eyes */}
        <group ref={eyes} position={[0, 0.08, 0.36]}>
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh>
                <sphereGeometry args={[0.075, 24, 24]} />
                <meshStandardMaterial color={INK} roughness={0.2} />
              </mesh>
              <mesh position={[0.025, 0.03, 0.06]}>
                <sphereGeometry args={[0.022, 12, 12]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
        </group>
        {/* muzzle + nose + jaw */}
        <mesh position={[0, -0.12, 0.33]} scale={[0.22, 0.16, 0.16]}>
          <sphereGeometry args={[1, 28, 28]} />
          <meshStandardMaterial color={CREAM} roughness={0.85} />
        </mesh>
        <mesh position={[0, -0.05, 0.49]} scale={[0.07, 0.05, 0.05]}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial color={INK} roughness={0.3} />
        </mesh>
        <group ref={jaw} position={[0, -0.2, 0.36]}>
          <mesh position={[0, -0.03, 0.06]} scale={[0.12, 0.05, 0.08]}>
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial color="#6B2D2D" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.04, 0.1]} scale={[0.07, 0.025, 0.06]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#F07F8A" roughness={0.6} />
          </mesh>
        </group>
        <group position={accessory?.slot === 'face' ? [0, 0.08, 0.5] : [0, 0.48, 0.05]}>
          <Accessory accessory={accessory} size={accessory?.slot === 'face' ? 0.55 : 0.5} />
        </group>
      </group>
    </group>
  );
}
