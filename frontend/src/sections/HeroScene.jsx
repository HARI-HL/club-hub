import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A lattice core with one orbiting node per club. Wireframe only, drawn in the accent colour,
// so it reads as an instrument rather than a toy. Pointer tilts it, page scroll turns it.

const ACCENT = new THREE.Color("#E2FF32");

function Core() {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.15, 1)), []);
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={ACCENT} transparent opacity={0.9} />
    </lineSegments>
  );
}

function Ring({ radius, tilt, opacity }) {
  const geometry = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  return (
    <line geometry={geometry} rotation={tilt}>
      <lineBasicMaterial color="#ffffff" transparent opacity={opacity} />
    </line>
  );
}

function Nodes({ count }) {
  const group = useRef();
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        radius: 1.9 + (i % 3) * 0.45,
        speed: 0.12 + (i % 4) * 0.04,
        phase: (i / count) * Math.PI * 2,
        tilt: ((i % 3) - 1) * 0.38,
        size: 0.07 + (i % 2) * 0.03,
      })),
    [count]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.children.forEach((mesh, i) => {
      const it = items[i];
      const a = it.phase + t * it.speed;
      mesh.position.set(Math.cos(a) * it.radius, Math.sin(a * 1.3) * it.tilt * it.radius, Math.sin(a) * it.radius);
    });
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[it.size, 0]} />
          <meshBasicMaterial color="#F3F4F6" />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ count, pointer, scroll }) {
  const group = useRef();
  useFrame((_, delta) => {
    const g = group.current;
    const k = 1 - Math.pow(0.001, delta); // frame rate independent smoothing
    const targetY = pointer.current.x * 0.5 + scroll.current * Math.PI * 1.2;
    const targetX = pointer.current.y * 0.3 + scroll.current * 0.6;
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    g.rotation.y += delta * 0.05; // slow idle drift
    const s = 1 - scroll.current * 0.25;
    g.scale.setScalar(s);
  });
  return (
    <group ref={group}>
      <Core />
      <Ring radius={1.9} tilt={[0.38, 0, 0.12]} opacity={0.14} />
      <Ring radius={2.35} tilt={[-0.3, 0, -0.2]} opacity={0.1} />
      <Ring radius={2.8} tilt={[0.05, 0, 0.45]} opacity={0.07} />
      <Nodes count={count} />
    </group>
  );
}

export default function HeroScene({ clubCount, pointer, scroll, active }) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Rig count={Math.min(Math.max(clubCount, 5), 12)} pointer={pointer} scroll={scroll} />
    </Canvas>
  );
}
