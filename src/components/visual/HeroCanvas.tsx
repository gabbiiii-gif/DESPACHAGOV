import { useEffect, useRef } from "react";
import * as THREE from "three";

// Globo 3D sutil para a tela de login (wireframe azul + pontos laranja).
// Lazy-loaded e leve: poucos polígonos, pausa quando a aba oculta, e não
// renderiza se o usuário pediu reduced-motion. Decorativo.
export default function HeroCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 4;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const geo = new THREE.IcosahedronGeometry(1.6, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2456a6, wireframe: true, transparent: true, opacity: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const n = 120;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 8;
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(ptsGeo, new THREE.PointsMaterial({ color: 0xf97316, size: 0.03, transparent: true, opacity: 0.5 }));
    scene.add(pts);

    function resize() {
      const w = el!.clientWidth || 1;
      const h = el!.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    let rodando = true;
    function tick() {
      if (!rodando) return;
      mesh.rotation.x += 0.0015;
      mesh.rotation.y += 0.002;
      pts.rotation.y -= 0.0006;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();

    const onVis = () => {
      rodando = !document.hidden;
      if (rodando) tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      rodando = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      geo.dispose();
      mat.dispose();
      ptsGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70" />;
}
