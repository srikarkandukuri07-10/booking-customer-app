import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill FileReader for headless Node.js GLTFExporter
class MockFileReader {
  constructor() {
    this.onload = null;
    this.onloadend = null;
    this.onerror = null;
    this.result = null;
  }

  readAsArrayBuffer(blob) {
    if (typeof blob.arrayBuffer === 'function') {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        setTimeout(() => {
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        }, 0);
      }).catch((err) => {
        if (this.onerror) this.onerror(err);
      });
    } else {
      const arrayBuffer = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
      this.result = arrayBuffer;
      setTimeout(() => {
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      }, 0);
    }
  }

  readAsDataURL(blob) {
    const buffer = Buffer.from(blob);
    this.result = `data:${blob.type || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
    setTimeout(() => {
      if (this.onload) this.onload({ target: this });
      if (this.onloadend) this.onloadend({ target: this });
    }, 0);
  }
}

global.FileReader = MockFileReader;

// Configuration
const OUTPUT_DIR = path.resolve('./public/models');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Keep event loop alive for async operations
const keepAlive = setInterval(() => {}, 50);

// Exporter helper function
function exportModel(scene, filename) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        try {
          const filepath = path.join(OUTPUT_DIR, filename);
          fs.writeFileSync(filepath, Buffer.from(gltf));
          console.log(`✅ Generated: ${filename} (${(gltf.byteLength / 1024).toFixed(1)} KB)`);
          resolve();
        } catch (writeErr) {
          console.error(`❌ Write failed for ${filename}:`, writeErr);
          reject(writeErr);
        }
      },
      (err) => {
        console.error(`❌ Error exporting ${filename}:`, err);
        reject(err);
      },
      { binary: true }
    );
  });
}

// -------------------------------------------------------------
// Model Generators
// -------------------------------------------------------------

// 1. Paneer Tikka
function generatePaneerTikka() {
  const scene = new THREE.Scene();
  
  // Dark slate plate
  const plateGeo = new THREE.CylinderGeometry(1.2, 1.1, 0.05, 32);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.y = -0.025;
  scene.add(plate);

  // Skewer Stick
  const skewerGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.8, 8);
  const skewerMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
  const skewer = new THREE.Mesh(skewerGeo, skewerMat);
  skewer.rotation.z = Math.PI / 2; // Horizontal
  skewer.position.y = 0.2;
  scene.add(skewer);

  // Add skewered items
  const items = [
    { type: 'bell', color: 0x008000 }, // Green Pepper
    { type: 'paneer' },
    { type: 'onion', color: 0x800080 }, // Red Onion
    { type: 'paneer' },
    { type: 'bell', color: 0xff0000 }, // Red Pepper
    { type: 'paneer' },
    { type: 'onion', color: 0x800080 }
  ];

  items.forEach((item, idx) => {
    const xPos = -0.6 + idx * 0.2;
    let mesh;
    
    if (item.type === 'paneer') {
      // White-yellowish grilled paneer cube
      const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const mat = new THREE.MeshStandardMaterial({ color: 0xfffdd0, roughness: 0.8 }); // Cream color
      mesh = new THREE.Mesh(geo, mat);
      
      // Add grill marks
      const markGeo = new THREE.BoxGeometry(0.01, 0.19, 0.19);
      const markMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
      const mark = new THREE.Mesh(markGeo, markMat);
      mesh.add(mark);
    } else if (item.type === 'bell') {
      // Pepper cube
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const mat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.5 });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      // Onion wedge (capsule/sphere shape)
      const geo = new THREE.SphereGeometry(0.09, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.5 });
      mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(0.7, 1.2, 1.2);
    }

    mesh.position.set(xPos, 0.2, 0);
    mesh.rotation.x = Math.random() * 0.2;
    mesh.rotation.y = Math.random() * 0.2;
    scene.add(mesh);
  });

  return scene;
}

// 2. Chicken 65
function generateChicken65() {
  const scene = new THREE.Scene();

  // White bowl
  const bowlGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.25, 32);
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.y = 0.125;
  scene.add(bowl);

  // Red-orange chicken chunks
  const chunkMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.9 });
  for (let i = 0; i < 9; i++) {
    const chunkGeo = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.04);
    const chunk = new THREE.Mesh(chunkGeo, chunkMat);
    
    // Spread in a bowl pile
    const angle = (i / 8) * Math.PI * 2;
    const r = 0.25 + Math.random() * 0.15;
    const x = i === 8 ? 0 : Math.cos(angle) * r;
    const z = i === 8 ? 0 : Math.sin(angle) * r;
    const y = i === 8 ? 0.28 : 0.22;
    
    chunk.position.set(x, y, z);
    chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(chunk);
  }

  // Curry leaves (small green panels)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x196f3d, roughness: 0.6 });
  for (let i = 0; i < 6; i++) {
    const leafGeo = new THREE.BoxGeometry(0.08, 0.01, 0.04);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(-0.3 + Math.random() * 0.6, 0.25 + Math.random() * 0.08, -0.3 + Math.random() * 0.6);
    leaf.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    scene.add(leaf);
  }

  return scene;
}

// 3. Crispy Corn
function generateCrispyCorn() {
  const scene = new THREE.Scene();

  // Black plate bowl
  const bowlGeo = new THREE.CylinderGeometry(0.95, 0.75, 0.2, 32);
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.y = 0.1;
  scene.add(bowl);

  // Corn grains (many small yellow spheres)
  const cornMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.4 });
  for (let i = 0; i < 45; i++) {
    const cornGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const corn = new THREE.Mesh(cornGeo, cornMat);
    corn.scale.set(1.4, 1, 1); // oval grain
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.55;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = 0.14 + (0.55 - r) * 0.2 + Math.random() * 0.03; // pile height

    corn.position.set(x, y, z);
    corn.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(corn);
  }

  // Green capsicum flecks
  const capMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.6 });
  for (let i = 0; i < 15; i++) {
    const geo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    const mesh = new THREE.Mesh(geo, capMat);
    mesh.position.set(-0.4 + Math.random() * 0.8, 0.18, -0.4 + Math.random() * 0.8);
    scene.add(mesh);
  }

  return scene;
}

// 4. Butter Chicken
function generateButterChicken() {
  const scene = new THREE.Scene();

  // Copper metal handi bowl
  const bowlGeo = new THREE.CylinderGeometry(0.8, 0.65, 0.4, 32);
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.8, roughness: 0.2 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.y = 0.2;
  scene.add(bowl);

  // Orange-red gravy top
  const gravyGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.02, 32);
  const gravyMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.8 });
  const gravy = new THREE.Mesh(gravyGeo, gravyMat);
  gravy.position.y = 0.39;
  scene.add(gravy);

  // Floating chicken pieces
  const meatMat = new THREE.MeshStandardMaterial({ color: 0xba4a00, roughness: 0.7 });
  for (let i = 0; i < 5; i++) {
    const meatGeo = new THREE.DodecahedronGeometry(0.1);
    const meat = new THREE.Mesh(meatGeo, meatMat);
    const angle = (i / 4) * Math.PI * 2;
    const r = 0.25 + Math.random() * 0.15;
    const x = i === 4 ? 0 : Math.cos(angle) * r;
    const z = i === 4 ? 0 : Math.sin(angle) * r;
    
    meat.position.set(x, 0.42, z);
    meat.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(meat);
  }

  // White cream swirl (procedural ring)
  const creamGeo = new THREE.TorusGeometry(0.3, 0.02, 8, 32);
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const cream = new THREE.Mesh(creamGeo, creamMat);
  cream.rotation.x = Math.PI / 2;
  cream.position.y = 0.41;
  scene.add(cream);

  return scene;
}

// 5. Kadai Paneer
function generateKadaiPaneer() {
  const scene = new THREE.Scene();

  // Black iron Kadai wok
  const wokGeo = new THREE.CylinderGeometry(0.85, 0.6, 0.35, 32);
  const wokMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
  const wok = new THREE.Mesh(wokGeo, wokMat);
  wok.position.y = 0.175;
  scene.add(wok);

  // Wok Handles
  const handleGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
  const handleL = new THREE.Mesh(handleGeo, wokMat);
  handleL.position.set(-0.85, 0.28, 0);
  handleL.rotation.y = Math.PI / 2;
  scene.add(handleL);

  const handleR = new THREE.Mesh(handleGeo, wokMat);
  handleR.position.set(0.85, 0.28, 0);
  handleR.rotation.y = Math.PI / 2;
  scene.add(handleR);

  // Red-orange masala gravy top
  const gravyGeo = new THREE.CylinderGeometry(0.81, 0.81, 0.02, 32);
  const gravyMat = new THREE.MeshStandardMaterial({ color: 0xb03a2e, roughness: 0.8 });
  const gravy = new THREE.Mesh(gravyGeo, gravyMat);
  gravy.position.y = 0.33;
  scene.add(gravy);

  // Paneer cubes (cubes)
  const paneerMat = new THREE.MeshStandardMaterial({ color: 0xfffdd0, roughness: 0.8 });
  for (let i = 0; i < 6; i++) {
    const paneerGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const paneer = new THREE.Mesh(paneerGeo, paneerMat);
    const angle = (i / 5) * Math.PI * 2;
    const r = 0.28 + Math.random() * 0.12;
    const x = i === 5 ? 0 : Math.cos(angle) * r;
    const z = i === 5 ? 0 : Math.sin(angle) * r;

    paneer.position.set(x, 0.37, z);
    paneer.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(paneer);
  }

  // Bell Pepper segments (green/red boxes)
  const pepColors = [0x228b22, 0xcc0000];
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
    const mat = new THREE.MeshStandardMaterial({ color: pepColors[i % 2], roughness: 0.5 });
    const pep = new THREE.Mesh(geo, mat);
    
    const angle = Math.random() * Math.PI * 2;
    const r = 0.15 + Math.random() * 0.3;
    pep.position.set(Math.cos(angle) * r, 0.36, Math.sin(angle) * r);
    pep.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, 0);
    scene.add(pep);
  }

  return scene;
}

// 6. Dal Makhani
function generateDalMakhani() {
  const scene = new THREE.Scene();

  // Ceramic dark bowl
  const bowlGeo = new THREE.CylinderGeometry(0.8, 0.65, 0.35, 32);
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0x1c2833, roughness: 0.3 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.y = 0.175;
  scene.add(bowl);

  // Dark brown creamy gravy top
  const gravyGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.02, 32);
  const gravyMat = new THREE.MeshStandardMaterial({ color: 0x4e2725, roughness: 0.9 }); // Dark maroon-brown
  const gravy = new THREE.Mesh(gravyGeo, gravyMat);
  gravy.position.y = 0.33;
  scene.add(gravy);

  // Butter dollop in center (yellow cube)
  const butterGeo = new THREE.BoxGeometry(0.12, 0.04, 0.12);
  const butterMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.2 });
  const butter = new THREE.Mesh(butterGeo, butterMat);
  butter.position.set(0, 0.35, 0);
  scene.add(butter);

  // Cream garnish swirl
  const creamGeo = new THREE.TorusGeometry(0.25, 0.015, 8, 32);
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const cream = new THREE.Mesh(creamGeo, creamMat);
  cream.rotation.x = Math.PI / 2;
  cream.position.set(0, 0.342, 0);
  scene.add(cream);

  return scene;
}

// 7. Chicken Biryani
function generateChickenBiryani() {
  const scene = new THREE.Scene();

  // Terracotta Clay Pot (Handi)
  const handiGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.5, 32);
  const handiMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.8 }); // Clay color
  const handi = new THREE.Mesh(handiGeo, handiMat);
  handi.position.y = 0.25;
  scene.add(handi);

  // Top Pot rim
  const rimGeo = new THREE.TorusGeometry(0.85, 0.06, 8, 32);
  const rim = new THREE.Mesh(rimGeo, handiMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.5;
  scene.add(rim);

  // Biryani Rice heap (multi-colored grains)
  const riceColors = [0xffffff, 0xf4d03f, 0xe67e22]; // White, Yellow, Saffron Orange
  const pileGroup = new THREE.Group();
  
  for (let i = 0; i < 60; i++) {
    const grainGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const grainMat = new THREE.MeshStandardMaterial({ color: riceColors[i % 3], roughness: 0.7 });
    const grain = new THREE.Mesh(grainGeo, grainMat);
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.78;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = 0.48 + (0.78 - r) * 0.15 + Math.random() * 0.02; // Dome shape

    grain.position.set(x, y, z);
    grain.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    pileGroup.add(grain);
  }
  scene.add(pileGroup);

  // Large Chicken drumstick on top
  const meatGroup = new THREE.Group();
  const fleshGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.35, 16);
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 }); // Golden roasted brown
  const flesh = new THREE.Mesh(fleshGeo, fleshMat);
  flesh.position.y = 0.175;
  meatGroup.add(flesh);

  const boneGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const bone = new THREE.Mesh(boneGeo, boneMat);
  bone.position.y = 0.35;
  meatGroup.add(bone);

  meatGroup.position.set(0.1, 0.52, -0.1);
  meatGroup.rotation.set(Math.PI / 3, 0, -Math.PI / 4);
  scene.add(meatGroup);

  return scene;
}

// 8. Paneer Biryani
function generatePaneerBiryani() {
  const scene = new THREE.Scene();

  // Clay Pot
  const handiGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.5, 32);
  const handiMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.8 });
  const handi = new THREE.Mesh(handiGeo, handiMat);
  handi.position.y = 0.25;
  scene.add(handi);

  const rimGeo = new THREE.TorusGeometry(0.85, 0.06, 8, 32);
  const rim = new THREE.Mesh(rimGeo, handiMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.5;
  scene.add(rim);

  // Rice heap
  const riceColors = [0xffffff, 0xf4d03f, 0xe67e22];
  for (let i = 0; i < 60; i++) {
    const grainGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const grainMat = new THREE.MeshStandardMaterial({ color: riceColors[i % 3], roughness: 0.7 });
    const grain = new THREE.Mesh(grainGeo, grainMat);
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.78;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = 0.48 + (0.78 - r) * 0.15 + Math.random() * 0.02;

    grain.position.set(x, y, z);
    grain.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(grain);
  }

  // Paneer Cubes scattered on top
  const paneerMat = new THREE.MeshStandardMaterial({ color: 0xfffdd0, roughness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const paneerGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const paneer = new THREE.Mesh(paneerGeo, paneerMat);
    
    const angle = (i / 4) * Math.PI * 2;
    const r = 0.25 + Math.random() * 0.15;
    const x = i === 4 ? -0.1 : Math.cos(angle) * r;
    const z = i === 4 ? 0.1 : Math.sin(angle) * r;

    paneer.position.set(x, 0.57, z);
    paneer.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    
    // Add grill marks
    const markGeo = new THREE.BoxGeometry(0.01, 0.16, 0.16);
    const markMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const mark = new THREE.Mesh(markGeo, markMat);
    paneer.add(mark);

    scene.add(paneer);
  }

  return scene;
}

// 9. Gulab Jamun
function generateGulabJamun() {
  const scene = new THREE.Scene();

  // Silver metal bowl
  const bowlGeo = new THREE.CylinderGeometry(0.85, 0.65, 0.3, 32);
  const bowlMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 });
  const bowl = new THREE.Mesh(bowlGeo, bowlMat);
  bowl.position.y = 0.15;
  scene.add(bowl);

  // Translucent sugar syrup liquid top
  const syrupGeo = new THREE.CylinderGeometry(0.81, 0.81, 0.02, 32);
  const syrupMat = new THREE.MeshStandardMaterial({ color: 0xd4ac0d, transparent: true, opacity: 0.6, roughness: 0.1 });
  const syrup = new THREE.Mesh(syrupGeo, syrupMat);
  syrup.position.y = 0.25;
  scene.add(syrup);

  // 3 Jamuns (spheres)
  const jamunGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const jamunMat = new THREE.MeshStandardMaterial({ color: 0x422315, roughness: 0.4 }); // Deep golden brown
  
  const positions = [
    { x: -0.18, y: 0.28, z: 0.08 },
    { x: 0.18, y: 0.28, z: 0.08 },
    { x: 0, y: 0.38, z: -0.1 }
  ];

  positions.forEach((pos) => {
    const jamun = new THREE.Mesh(jamunGeo, jamunMat);
    jamun.position.set(pos.x, pos.y, pos.z);
    scene.add(jamun);
  });

  return scene;
}

// 10. Sizzling Brownie
function generateSizzlingBrownie() {
  const scene = new THREE.Scene();

  // Wooden sizzler base (brown plate)
  const woodGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.08, 32);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
  const wood = new THREE.Mesh(woodGeo, woodMat);
  wood.scale.set(1.2, 1, 0.9); // Oval
  wood.position.y = 0.04;
  scene.add(wood);

  // Cast Iron pan on top
  const panGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32);
  const panMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.6 });
  const pan = new THREE.Mesh(panGeo, panMat);
  pan.scale.set(1.2, 1, 0.9);
  pan.position.y = 0.1;
  scene.add(pan);

  // Square Brownie block
  const brownieGeo = new THREE.BoxGeometry(0.45, 0.25, 0.45);
  const brownieMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
  const brownie = new THREE.Mesh(brownieGeo, brownieMat);
  brownie.position.set(0, 0.225, 0);
  scene.add(brownie);

  // Vanilla Ice Cream Scoop (Sphere)
  const iceGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.5 });
  const scoop = new THREE.Mesh(iceGeo, iceMat);
  scoop.position.set(0, 0.43, 0);
  scene.add(scoop);

  // Chocolate sauce drizzle (procedural capsules dripping)
  const sauceMat = new THREE.MeshStandardMaterial({ color: 0x1d0f08, roughness: 0.2 });
  const drippings = [
    { scale: [0.03, 0.12, 0.03], pos: [0.12, 0.38, 0.12] },
    { scale: [0.03, 0.18, 0.03], pos: [-0.15, 0.32, 0.1] },
    { scale: [0.03, 0.14, 0.03], pos: [0, 0.34, -0.16] }
  ];

  drippings.forEach((d) => {
    const dripGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
    const drip = new THREE.Mesh(dripGeo, sauceMat);
    drip.scale.set(d.scale[0], d.scale[1], d.scale[2]);
    drip.position.set(d.pos[0], d.pos[1], d.pos[2]);
    scene.add(drip);
  });

  return scene;
}

// 11. Masala Shikanji
function generateMasalaShikanji() {
  const scene = new THREE.Scene();

  // Glass Container (translucent cylinder)
  const glassGeo = new THREE.CylinderGeometry(0.45, 0.38, 1.2, 32, 1, true); // Hollow open cylinder
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = 0.6;
  scene.add(glass);

  // Glass Bottom Base
  const baseGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 32);
  const base = new THREE.Mesh(baseGeo, glassMat);
  base.position.y = 0.04;
  scene.add(base);

  // Liquid (yellowish lemonade)
  const liqGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.95, 32);
  const liqMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.65, roughness: 0.1 });
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.position.y = 0.535;
  scene.add(liquid);

  // Lemon slice on the rim
  const sliceGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16);
  const sliceMat = new THREE.MeshStandardMaterial({ color: 0xf4d03f, roughness: 0.5 });
  const slice = new THREE.Mesh(sliceGeo, sliceMat);
  slice.rotation.z = Math.PI / 2;
  slice.rotation.y = Math.PI / 6;
  slice.position.set(0.42, 1.15, 0);
  scene.add(slice);

  // Mint leaves floating inside
  const mintMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const mintGeo = new THREE.BoxGeometry(0.08, 0.01, 0.05);
    const leaf = new THREE.Mesh(mintGeo, mintMat);
    leaf.position.set(-0.2 + Math.random() * 0.4, 0.4 + i * 0.15, -0.2 + Math.random() * 0.4);
    leaf.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, 0);
    scene.add(leaf);
  }

  return scene;
}

// 12. Virgin Mojito
function generateVirginMojito() {
  const scene = new THREE.Scene();

  // Glass Container
  const glassGeo = new THREE.CylinderGeometry(0.45, 0.38, 1.2, 32, 1, true);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = 0.6;
  scene.add(glass);

  const baseGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 32);
  const base = new THREE.Mesh(baseGeo, glassMat);
  base.position.y = 0.04;
  scene.add(base);

  // Liquid (Clear with light turquoise tint)
  const liqGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.95, 32);
  const liqMat = new THREE.MeshStandardMaterial({ color: 0xe0f7fa, transparent: true, opacity: 0.45, roughness: 0.1 });
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.position.y = 0.535;
  scene.add(liquid);

  // Lime chunks inside
  const limeMat = new THREE.MeshStandardMaterial({ color: 0x2ecc71, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const limeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8);
    const chunk = new THREE.Mesh(limeGeo, limeMat);
    chunk.position.set(-0.18 + Math.random() * 0.36, 0.25 + i * 0.2, -0.18 + Math.random() * 0.36);
    chunk.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(chunk);
  }

  // Straw (Thin red cylinder)
  const strawGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8);
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.2 });
  const straw = new THREE.Mesh(strawGeo, strawMat);
  straw.position.set(-0.15, 0.8, -0.1);
  straw.rotation.z = Math.PI / 15;
  scene.add(straw);

  return scene;
}

// 13. Mango Lassi
function generateMangoLassi() {
  const scene = new THREE.Scene();

  // Clay Kulhad Cup (terracotta tapered cylinder)
  const cupGeo = new THREE.CylinderGeometry(0.46, 0.32, 1.0, 32);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.9 });
  const cup = new THREE.Mesh(cupGeo, cupMat);
  cup.position.y = 0.5;
  scene.add(cup);

  // Thick Mango Lassi Liquid top
  const liqGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.02, 32);
  const liqMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.7 }); // Deep orange-yellow
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.position.y = 0.98;
  scene.add(liquid);

  // Pistachio fleck garnishes (tiny green and cream flakes)
  const flakeColors = [0x27ae60, 0xfce4d6];
  for (let i = 0; i < 15; i++) {
    const flakeGeo = new THREE.BoxGeometry(0.025, 0.01, 0.025);
    const flakeMat = new THREE.MeshStandardMaterial({ color: flakeColors[i % 2], roughness: 0.9 });
    const flake = new THREE.Mesh(flakeGeo, flakeMat);
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.32;
    flake.position.set(Math.cos(angle) * r, 0.99, Math.sin(angle) * r);
    flake.rotation.set(0, Math.random() * Math.PI, 0);
    scene.add(flake);
  }

  return scene;
}

// -------------------------------------------------------------
// Execution Runner
// -------------------------------------------------------------

async function generateAll() {
  console.log("🚀 Initializing procedural food 3D models generation...");

  try {
    const list = [
      { gen: generatePaneerTikka, name: 'paneer-tikka.glb' },
      { gen: generateChicken65, name: 'chicken-65.glb' },
      { gen: generateCrispyCorn, name: 'crispy-corn.glb' },
      { gen: generateButterChicken, name: 'butter-chicken.glb' },
      { gen: generateKadaiPaneer, name: 'kadai-paneer.glb' },
      { gen: generateDalMakhani, name: 'dal-makhani.glb' },
      { gen: generateChickenBiryani, name: 'chicken-biryani.glb' },
      { gen: generatePaneerBiryani, name: 'paneer-biryani.glb' },
      { gen: generateGulabJamun, name: 'gulab-jamun.glb' },
      { gen: generateSizzlingBrownie, name: 'sizzling-brownie.glb' },
      { gen: generateMasalaShikanji, name: 'masala-shikanji.glb' },
      { gen: generateVirginMojito, name: 'virgin-mojito.glb' },
      { gen: generateMangoLassi, name: 'mango-lassi.glb' }
    ];

    for (const item of list) {
      const scene = item.gen();
      // Add standard lighting so the model can be viewed directly
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);
      
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 12, 5);
      scene.add(dirLight);

      await exportModel(scene, item.name);
    }

    console.log("🎉 All 13 models exported successfully to public/models/!");
    clearInterval(keepAlive);
  } catch (err) {
    console.error("❌ Generation failed:", err);
    clearInterval(keepAlive);
  }
}

generateAll();
