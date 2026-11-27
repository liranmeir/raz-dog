'use client';

import { Outlines } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DataTexture, LatheGeometry, MathUtils, NearestFilter, RedFormat, Vector2, type Group, type Mesh } from 'three';
import type { DogMood } from '@/components/Dog';
import { Accessory, type AccessorySpec } from '@/components/dog3d/Accessory';
import { expressionFor, type Expression } from '@/lib/dog3d/expressions';

type Props = {
  mood: DogMood;
  mouthOpen?: number;
  accessory?: AccessorySpec;
  onHeadTap?: () => void;
  onBellyTap?: () => void;
};

const C = {
  fur: '#F2B86E',
  furDark: '#DE9A4E',
  ear: '#8E5A2E',
  cream: '#FFF3DF',
  ink: '#2B1D16',
  mouth: '#6E2A2E',
  tongue: '#F27C8C',
  blush: '#F7A1A8',
  collar: '#E2525F',
  gold: '#F5C542',
  line: '#7A4A26',
};

const OUTLINE = 0.012;

/** 3-step toon ramp shared by all materials. */
function useToonRamp() {
  return useMemo(() => {
    const t = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
    t.minFilter = t.magFilter = NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);
}

function Toon({ color, ramp }: { color: string; ramp: DataTexture }) {
  return <meshToonMaterial color={color} gradientMap={ramp} />;
}

/** Pear-shaped sitting body as one smooth lathe mesh. */
function useBodyGeometry() {
  return useMemo(() => {
    const profile = [
      [0.0, 0.0],
      [0.3, 0.02],
      [0.42, 0.14],
      [0.45, 0.3],
      [0.4, 0.46],
      [0.3, 0.6],
      [0.18, 0.7],
      [0.0, 0.74],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(profile, 40);
  }, []);
}

/**
 * A chibi, toon-shaded puppy built entirely from code, with a fully
 * controllable face: eyelids, brows, an opening mouth that follows the
 * child's voice, springy ears, and head turns toward where it was touched.
 */
export function ToyDog({ mood, mouthOpen = 0, accessory, onHeadTap, onBellyTap }: Props) {
  const ramp = useToonRamp();
  const bodyGeo = useBodyGeometry();

  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const tailTip = useRef<Group>(null);
  const earL = useRef<Group>(null);
  const earR = useRef<Group>(null);
  const lidsTop = useRef<Group[]>([]);
  const lidsBottom = useRef<Group[]>([]);
  const browL = useRef<Group>(null);
  const browR = useRef<Group>(null);
  const mouthMesh = useRef<Mesh>(null);
  const tongue = useRef<Mesh>(null);
  const smile = useRef<Group>(null);
  const eyesOpen = useRef<Group>(null);
  const eyesHappy = useRef<Group>(null);
  const eyesClosed = useRef<Group>(null);

  const cur = useRef<Expression>(expressionFor('idle'));
  const ears = useRef({ l: 0, lv: 0, r: 0, rv: 0 });
  const blink = useRef({ next: 2, until: 0 });
  const look = useRef({ yaw: 0, pitch: 0, until: 0, pendingFor: 0 });

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const d = Math.min(dt, 0.05);
    const target = expressionFor(mood);
    const e = cur.current;

    // blend every expression channel toward the mood's target
    (Object.keys(target) as (keyof Expression)[]).forEach((k) => {
      e[k] = MathUtils.damp(e[k], target[k], k === 'wag' ? 3 : 9, d);
    });

    // mouth: voice level while talking, chewing while eating
    let mouth = e.mouth;
    if (mood === 'talk') mouth = Math.max(mouth, mouthOpen);
    if (mood === 'eat') mouth = (Math.sin(t * 13) + 1) * 0.32;

    // blinking (not while asleep or squinting)
    const b = blink.current;
    if (t > b.next) {
      b.until = t + 0.13;
      b.next = t + 2.2 + Math.random() * 3;
    }
    const lidTop = t < b.until ? 1 : e.lidTop;

    // body
    const r = root.current;
    if (r) {
      const breathe = mood === 'sleep' ? Math.sin(t * 1.6) * 0.025 : Math.sin(t * 2.2) * 0.012;
      r.position.y = Math.abs(Math.sin(t * 7)) * e.bounce;
      r.scale.set(1 + breathe * 0.5, 1 + breathe + mouth * 0.03, 1 + breathe * 0.5);
      const sway = mood === 'dance' ? Math.sin(t * 5) * 0.45 : 0;
      const shake = mood === 'giggle' ? Math.sin(t * 32) * 0.05 : 0;
      r.rotation.y = MathUtils.damp(r.rotation.y, sway, 6, d);
      r.rotation.z = shake;
    }

    // head: mood pose + idle glance + look toward touch + talking nod
    const L = look.current;
    if (L.pendingFor) {
      L.until = t + L.pendingFor;
      L.pendingFor = 0;
    }
    const h = head.current;
    if (h) {
      const touching = t < L.until;
      const idleYaw = mood === 'sleep' ? 0 : Math.sin(t * 0.35) * 0.12;
      const yaw = touching ? L.yaw : idleYaw;
      const pitch = (touching ? L.pitch : 0) + e.nod - mouth * 0.12;
      h.rotation.y = MathUtils.damp(h.rotation.y, yaw, 5, d);
      h.rotation.x = MathUtils.damp(h.rotation.x, pitch, 7, d);
      h.rotation.z = MathUtils.damp(h.rotation.z, e.tilt + Math.sin(t * 0.8) * 0.02, 6, d);
    }

    // springy ears that swing with head motion
    const E = ears.current;
    const roll = h?.rotation.z ?? 0;
    const spring = (pos: number, vel: number, goal: number) => {
      const acc = (goal - pos) * 90 - vel * 9;
      vel += acc * d;
      return [pos + vel * d, vel];
    };
    [E.l, E.lv] = spring(E.l, E.lv, 0.25 - e.earLift * 0.55 - roll * 0.8 + Math.sin(t * 2) * 0.03);
    [E.r, E.rv] = spring(E.r, E.rv, -0.25 + e.earLift * 0.55 - roll * 0.8 - Math.sin(t * 2) * 0.03);
    if (earL.current) earL.current.rotation.z = E.l;
    if (earR.current) earR.current.rotation.z = E.r;

    // tail
    if (tail.current) tail.current.rotation.y = Math.sin(t * e.wag) * (e.wag > 10 ? 0.6 : 0.25);
    if (tailTip.current) tailTip.current.rotation.y = Math.sin(t * e.wag - 0.8) * 0.35;

    // eyelids: each lid is a dome rotated around the eye. The lid's front
    // edge sits at height -sin(angle), so asin maps "how closed" linearly.
    const topEdge = 1 - 2 * lidTop; // 1 = open (edge at top), -1 = closed
    const bottomEdge = -1 + 1.7 * e.lidBottom; // -1 = hidden, rises for "^^" eyes
    lidsTop.current.forEach((g) => g && (g.rotation.x = -Math.asin(MathUtils.clamp(topEdge, -1, 1))));
    lidsBottom.current.forEach((g) => g && (g.rotation.x = -Math.asin(MathUtils.clamp(bottomEdge, -1, 1))));
    // strong expressions switch to classic cartoon eyes: ^^ (happy) and ‿‿ (closed)
    const showClosed = lidTop > 0.85;
    const showHappy = !showClosed && e.lidBottom > 0.55;
    if (eyesOpen.current) eyesOpen.current.visible = !showClosed && !showHappy;
    if (eyesHappy.current) eyesHappy.current.visible = showHappy;
    if (eyesClosed.current) eyesClosed.current.visible = showClosed;

    // brows
    // inner ends slightly raised = soft, friendly look; never an angry slant
    if (browL.current) {
      browL.current.position.y = 0.6 + e.browL * 0.04;
      browL.current.rotation.z = 0.12 + e.browL * 0.15;
    }
    if (browR.current) {
      browR.current.position.y = 0.6 + e.browR * 0.04;
      browR.current.rotation.z = -0.12 - e.browR * 0.15;
    }

    // mouth: a "D"-shaped grin (flat top, round bottom) that deepens as it opens
    const depth = 0.015 + mouth * 0.1;
    if (mouthMesh.current) mouthMesh.current.scale.set(0.095 + mouth * 0.035, depth, 0.05);
    if (tongue.current) {
      tongue.current.visible = mouth > 0.12;
      tongue.current.position.y = -depth * 0.62;
    }
    if (smile.current) smile.current.visible = mouth < 0.1;
  });

  function tapHead(ev: ThreeEvent<PointerEvent>) {
    ev.stopPropagation();
    const L = look.current;
    L.yaw = MathUtils.clamp(ev.point.x * 1.2, -0.5, 0.5);
    L.pitch = -0.12;
    L.pendingFor = 1.5;
    onHeadTap?.();
  }

  function tapBody(ev: ThreeEvent<PointerEvent>) {
    ev.stopPropagation();
    const L = look.current;
    L.yaw = 0;
    L.pitch = 0.35; // look down at the tickled belly
    L.pendingFor = 1.2;
    onBellyTap?.();
  }

  const eyeX = 0.17;

  return (
    <group ref={root}>
      {/* ---------- body ---------- */}
      <group onPointerDown={tapBody}>
        <mesh geometry={bodyGeo} position={[0, 0.04, -0.02]} scale={[1, 1, 0.9]}>
          <Toon color={C.fur} ramp={ramp} />
          <Outlines thickness={OUTLINE} color={C.line} />
        </mesh>
        {/* chest fluff */}
        <mesh position={[0, 0.42, 0.3]} scale={[0.25, 0.27, 0.13]}>
          <sphereGeometry args={[1, 32, 24]} />
          <Toon color={C.cream} ramp={ramp} />
        </mesh>
        {/* hind legs */}
        {[-1, 1].map((s) => (
          <group key={`h${s}`}>
            <mesh position={[s * 0.33, 0.15, -0.02]} scale={[0.17, 0.15, 0.27]}>
              <sphereGeometry args={[1, 24, 20]} />
              <Toon color={C.furDark} ramp={ramp} />
              <Outlines thickness={OUTLINE * 4} color={C.line} />
            </mesh>
            <mesh position={[s * 0.33, 0.05, 0.22]} scale={[0.11, 0.065, 0.13]}>
              <sphereGeometry args={[1, 20, 16]} />
              <Toon color={C.cream} ramp={ramp} />
              <Outlines thickness={OUTLINE * 6} color={C.line} />
            </mesh>
          </group>
        ))}
        {/* front legs + paws with toe lines */}
        {[-1, 1].map((s) => (
          <group key={`f${s}`} position={[s * 0.15, 0, 0.27]}>
            <mesh position={[0, 0.2, 0]}>
              <capsuleGeometry args={[0.08, 0.22, 8, 16]} />
              <Toon color={C.fur} ramp={ramp} />
              <Outlines thickness={OUTLINE} color={C.line} />
            </mesh>
            <mesh position={[0, 0.055, 0.05]} scale={[0.11, 0.07, 0.12]}>
              <sphereGeometry args={[1, 20, 16]} />
              <Toon color={C.cream} ramp={ramp} />
              <Outlines thickness={OUTLINE * 6} color={C.line} />
            </mesh>
            {[-0.035, 0.035].map((x) => (
              <mesh key={x} position={[x, 0.06, 0.165]} scale={[0.006, 0.03, 0.006]}>
                <sphereGeometry args={[1, 6, 6]} />
                <meshBasicMaterial color={C.line} />
              </mesh>
            ))}
          </group>
        ))}
        {/* collar + tag */}
        <mesh position={[0, 0.69, 0.03]} rotation={[Math.PI / 2 - 0.25, 0, 0]}>
          <torusGeometry args={[0.2, 0.035, 12, 40]} />
          <Toon color={C.collar} ramp={ramp} />
        </mesh>
        <mesh position={[0, 0.6, 0.24]} rotation={[Math.PI / 2 - 0.3, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.018, 24]} />
          <meshStandardMaterial color={C.gold} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* tail: two segments */}
        <group ref={tail} position={[0, 0.2, -0.36]} rotation={[-0.9, 0, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <capsuleGeometry args={[0.055, 0.14, 6, 12]} />
            <Toon color={C.furDark} ramp={ramp} />
            <Outlines thickness={OUTLINE} color={C.line} />
          </mesh>
          <group ref={tailTip} position={[0, 0.2, 0]} rotation={[0.5, 0, 0]}>
            <mesh position={[0, 0.07, 0]}>
              <capsuleGeometry args={[0.05, 0.1, 6, 12]} />
              <Toon color={C.cream} ramp={ramp} />
              <Outlines thickness={OUTLINE} color={C.line} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ---------- head (pivot at the neck) ---------- */}
      <group ref={head} position={[0, 0.76, 0.05]}>
        <group onPointerDown={tapHead}>
          <mesh position={[0, 0.38, 0.06]} scale={[1.06, 0.95, 0.95]}>
            <sphereGeometry args={[0.46, 48, 40]} />
            <Toon color={C.fur} ramp={ramp} />
            <Outlines thickness={OUTLINE * 2} color={C.line} />
          </mesh>
          {/* forehead tuft */}
          {[-0.07, 0, 0.07].map((x, i) => (
            <mesh key={x} position={[x, 0.82 + (i === 1 ? 0.03 : 0), 0.12]} scale={[0.07, 0.08, 0.07]}>
              <sphereGeometry args={[1, 16, 12]} />
              <Toon color={C.furDark} ramp={ramp} />
            </mesh>
          ))}
          {/* face patch around eyes */}
          <mesh position={[0, 0.4, 0.33]} scale={[0.34, 0.2, 0.17]}>
            <sphereGeometry args={[1, 32, 24]} />
            <Toon color={C.fur} ramp={ramp} />
          </mesh>
          {/* muzzle */}
          <mesh position={[0, 0.25, 0.42]} scale={[0.23, 0.155, 0.17]}>
            <sphereGeometry args={[1, 32, 24]} />
            <Toon color={C.cream} ramp={ramp} />
            <Outlines thickness={OUTLINE * 5} color={C.line} />
          </mesh>
          {/* nose */}
          <mesh position={[0, 0.315, 0.58]} scale={[0.075, 0.055, 0.05]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color={C.ink} roughness={0.25} />
          </mesh>
          <mesh position={[-0.02, 0.335, 0.62]} scale={[0.022, 0.012, 0.01]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* mouth: lower half-ellipsoid = smiling grin; opens with voice */}
          <group position={[0, 0.215, 0.55]} rotation={[0.25, 0, 0]}>
            <mesh ref={mouthMesh}>
              <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <meshBasicMaterial color={C.mouth} side={2} />
            </mesh>
            <mesh ref={tongue} position={[0, -0.03, 0.025]} scale={[0.06, 0.028, 0.035]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color={C.tongue} />
            </mesh>
          </group>
          {/* closed-mouth smile ("w") */}
          <group ref={smile} position={[0, 0.215, 0.585]}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.035, 0, 0]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.035, 0.007, 6, 16, Math.PI]} />
                <meshBasicMaterial color={C.ink} />
              </mesh>
            ))}
          </group>
          {/* cheeks */}
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.29, 0.29, 0.38]} scale={[0.085, 0.055, 0.02]} rotation={[0, s * 0.6, 0]}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color={C.blush} transparent opacity={0.85} />
            </mesh>
          ))}
          {/* cartoon eyes: ^^ and ‿‿ */}
          <group ref={eyesHappy} visible={false}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * eyeX, 0.43, 0.5]}>
                <torusGeometry args={[0.07, 0.019, 8, 24, Math.PI]} />
                <meshBasicMaterial color={C.ink} />
              </mesh>
            ))}
          </group>
          <group ref={eyesClosed} visible={false}>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * eyeX, 0.47, 0.5]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.065, 0.016, 8, 24, Math.PI]} />
                <meshBasicMaterial color={C.ink} />
              </mesh>
            ))}
          </group>
          {/* open eyes with lids */}
          <group ref={eyesOpen}>
            {[-1, 1].map((s, i) => (
              <group key={s} position={[s * eyeX, 0.45, 0.42]}>
                <mesh>
                  <sphereGeometry args={[0.1, 32, 24]} />
                  <meshStandardMaterial color={C.ink} roughness={0.15} />
                </mesh>
                <mesh position={[0.028, 0.032, 0.072]}>
                  <sphereGeometry args={[0.026, 12, 10]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <mesh position={[-0.032, -0.03, 0.082]}>
                  <sphereGeometry args={[0.011, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
                <group ref={(g) => void (lidsTop.current[i] = g as Group)}>
                  <mesh>
                    <sphereGeometry args={[0.107, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <Toon color={C.fur} ramp={ramp} />
                  </mesh>
                </group>
                <group ref={(g) => void (lidsBottom.current[i] = g as Group)}>
                  <mesh>
                    <sphereGeometry args={[0.107, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
                    <Toon color={C.fur} ramp={ramp} />
                  </mesh>
                </group>
              </group>
            ))}
          </group>
          {/* brows */}
          <group ref={browL} position={[-eyeX, 0.6, 0.47]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.016, 0.07, 4, 8]} />
              <meshBasicMaterial color={C.ear} />
            </mesh>
          </group>
          <group ref={browR} position={[eyeX, 0.6, 0.47]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.016, 0.07, 4, 8]} />
              <meshBasicMaterial color={C.ear} />
            </mesh>
          </group>
        </group>

        {/* floppy ears (outside the tap group so they don't steal taps) */}
        <group ref={earL} position={[-0.4, 0.66, 0.02]}>
          <mesh position={[-0.05, -0.22, 0]} scale={[0.14, 0.29, 0.07]} rotation={[0, 0.3, 0]}>
            <sphereGeometry args={[1, 24, 20]} />
            <Toon color={C.ear} ramp={ramp} />
            <Outlines thickness={OUTLINE * 7} color={C.line} />
          </mesh>
        </group>
        <group ref={earR} position={[0.4, 0.66, 0.02]}>
          <mesh position={[0.05, -0.22, 0]} scale={[0.14, 0.29, 0.07]} rotation={[0, -0.3, 0]}>
            <sphereGeometry args={[1, 24, 20]} />
            <Toon color={C.ear} ramp={ramp} />
            <Outlines thickness={OUTLINE * 7} color={C.line} />
          </mesh>
        </group>

        {/* accessory follows the head */}
        <group position={accessory?.slot === 'face' ? [0, 0.46, 0.56] : [0, 0.98, 0.08]}>
          <Accessory accessory={accessory} size={accessory?.slot === 'face' ? 0.55 : 0.52} />
        </group>
      </group>
    </group>
  );
}
