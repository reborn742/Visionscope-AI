import { PERSON_DOG_BASE64 } from './personDogPreset';

export interface SamplePreset {
  id: string;
  title: string;
  description: string;
  expectedObjects: string[];
  getDataUrl: () => string;
}

// Generate realistic synthetic scenes with realistic shapes, gradients, and textures
function createDeskWorkspace(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Wooden desk surface
  const deskGrad = ctx.createLinearGradient(0, 0, 0, 600);
  deskGrad.addColorStop(0, '#3a2e2b');
  deskGrad.addColorStop(1, '#231b19');
  ctx.fillStyle = deskGrad;
  ctx.fillRect(0, 0, 800, 600);

  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 600; i += 18) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.bezierCurveTo(200, i + 8, 500, i - 8, 800, i + 4);
    ctx.stroke();
  }

  // 1. Laptop (Center)
  // Laptop base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(180, 200, 440, 290, [12, 12, 6, 6]);
  ctx.fill();

  // Screen bezel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(200, 215, 400, 230);

  // Screen display (coding editor)
  const screenGrad = ctx.createLinearGradient(210, 225, 590, 435);
  screenGrad.addColorStop(0, '#090d16');
  screenGrad.addColorStop(1, '#111827');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(210, 225, 380, 210);

  // Simulated code lines on screen
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(230, 245, 80, 8);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(320, 245, 120, 8);
  ctx.fillStyle = '#a78bfa';
  ctx.fillRect(245, 265, 100, 8);
  ctx.fillStyle = '#34d399';
  ctx.fillRect(355, 265, 90, 8);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(245, 285, 160, 8);
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(260, 305, 80, 8);

  // Keyboard lower deck
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.roundRect(170, 440, 460, 40, [0, 0, 8, 8]);
  ctx.fill();
  // Trackpad
  ctx.fillStyle = '#475569';
  ctx.fillRect(360, 450, 80, 24);

  // 2. Coffee Cup (Right side)
  // Saucer shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(690, 440, 65, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cup body
  const cupGrad = ctx.createLinearGradient(640, 360, 740, 430);
  cupGrad.addColorStop(0, '#f8fafc');
  cupGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = cupGrad;
  ctx.beginPath();
  ctx.ellipse(690, 420, 45, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(645, 420);
  ctx.lineTo(655, 360);
  ctx.lineTo(725, 360);
  ctx.lineTo(735, 420);
  ctx.closePath();
  ctx.fill();

  // Cup inside (Coffee liquid)
  ctx.fillStyle = '#3f2113';
  ctx.beginPath();
  ctx.ellipse(690, 360, 35, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cup handle
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(740, 390, 20, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // 3. Cell Phone (Left side)
  // Phone shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(65, 345, 85, 160, 16);
  ctx.fill();

  // Phone body
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(60, 340, 80, 150, 14);
  ctx.fill();
  // Phone screen
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.roundRect(64, 345, 72, 140, 10);
  ctx.fill();
  // Screen notification bar
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(85, 352, 30, 3);

  // 4. Potted Plant / Vase (Top left)
  // Pot
  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(70, 190);
  ctx.lineTo(130, 190);
  ctx.lineTo(120, 250);
  ctx.lineTo(80, 250);
  ctx.closePath();
  ctx.fill();
  // Leaves
  ctx.fillStyle = '#15803d';
  for (let a = 0; a < 6; a++) {
    ctx.beginPath();
    const angle = (a * Math.PI) / 3 - Math.PI / 2;
    ctx.ellipse(100 + Math.cos(angle) * 35, 160 + Math.sin(angle) * 30, 28, 14, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createStreetScene(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 340);
  skyGrad.addColorStop(0, '#38bdf8');
  skyGrad.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 800, 340);

  // Buildings in background
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(40, 120, 160, 220);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(230, 80, 200, 260);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(460, 140, 180, 200);

  // Road asphalt
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 340, 800, 260);

  // Road lane markings
  ctx.fillStyle = '#fbbf24';
  for (let x = 30; x < 800; x += 110) {
    ctx.fillRect(x, 470, 60, 8);
  }

  // 1. Red Car (Center-left)
  // Car Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(310, 485, 170, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Car chassis
  const carGrad = ctx.createLinearGradient(160, 360, 460, 460);
  carGrad.addColorStop(0, '#dc2626');
  carGrad.addColorStop(1, '#991b1b');
  ctx.fillStyle = carGrad;

  // Bottom body
  ctx.beginPath();
  ctx.roundRect(160, 400, 300, 65, [14, 22, 4, 4]);
  ctx.fill();
  // Cabin roof
  ctx.beginPath();
  ctx.moveTo(210, 400);
  ctx.lineTo(260, 340);
  ctx.lineTo(390, 340);
  ctx.lineTo(430, 400);
  ctx.closePath();
  ctx.fill();

  // Windows
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.moveTo(225, 395);
  ctx.lineTo(265, 348);
  ctx.lineTo(320, 348);
  ctx.lineTo(320, 395);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(330, 395);
  ctx.lineTo(330, 348);
  ctx.lineTo(385, 348);
  ctx.lineTo(418, 395);
  ctx.closePath();
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(220, 465, 30, 0, Math.PI * 2);
  ctx.arc(400, 465, 30, 0, Math.PI * 2);
  ctx.fill();
  // Wheel hubs
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(220, 465, 12, 0, Math.PI * 2);
  ctx.arc(400, 465, 12, 0, Math.PI * 2);
  ctx.fill();

  // 2. Traffic Light (Right)
  // Pole
  ctx.fillStyle = '#475569';
  ctx.fillRect(710, 160, 14, 260);
  // Box
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(695, 140, 44, 110, 8);
  ctx.fill();
  // Lights
  ctx.fillStyle = '#ef4444'; // Red
  ctx.beginPath();
  ctx.arc(717, 162, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#451a03'; // Yellow off
  ctx.beginPath();
  ctx.arc(717, 195, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#022c22'; // Green off
  ctx.beginPath();
  ctx.arc(717, 228, 10, 0, Math.PI * 2);
  ctx.fill();

  // 3. Person / Pedestrian (Far left sidewalk)
  // Sidewalk
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 330, 120, 40);
  // Head
  ctx.fillStyle = '#fbcfe8';
  ctx.beginPath();
  ctx.arc(60, 260, 14, 0, Math.PI * 2);
  ctx.fill();
  // Body / jacket
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(48, 275, 24, 45);
  // Legs
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(50, 320, 9, 35);
  ctx.fillRect(61, 320, 9, 35);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createLivingRoom(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Wall
  const wallGrad = ctx.createLinearGradient(0, 0, 800, 420);
  wallGrad.addColorStop(0, '#1e293b');
  wallGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 800, 420);

  // Floor
  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, 420, 800, 180);

  // Rug
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(400, 510, 320, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Couch / Sofa (Center)
  ctx.fillStyle = '#0284c7';
  // Sofa back
  ctx.beginPath();
  ctx.roundRect(180, 270, 440, 120, [20, 20, 4, 4]);
  ctx.fill();
  // Sofa base & cushions
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.roundRect(160, 340, 480, 100, 12);
  ctx.fill();
  // Armrests
  ctx.fillStyle = '#075985';
  ctx.beginPath();
  ctx.roundRect(140, 310, 45, 130, 12);
  ctx.roundRect(615, 310, 45, 130, 12);
  ctx.fill();
  // Cushions division
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(320, 340);
  ctx.lineTo(320, 440);
  ctx.moveTo(480, 340);
  ctx.lineTo(480, 440);
  ctx.stroke();

  // 2. Wall Clock (Top right)
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(680, 120, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.stroke();
  // Clock hands
  ctx.beginPath();
  ctx.moveTo(680, 120);
  ctx.lineTo(680, 95);
  ctx.moveTo(680, 120);
  ctx.lineTo(700, 120);
  ctx.stroke();

  // 3. Books on a small coffee table
  ctx.fillStyle = '#b45309';
  ctx.fillRect(340, 480, 120, 20); // Table
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(360, 470, 80, 10); // Book 1
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(370, 460, 60, 10); // Book 2

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createPersonAndDogScene(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 350);
  skyGrad.addColorStop(0, '#60a5fa');
  skyGrad.addColorStop(1, '#dbeafe');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 800, 350);

  // Distant park trees
  ctx.fillStyle = '#15803d';
  for (let x = 0; x < 800; x += 90) {
    ctx.beginPath();
    ctx.arc(x + 40, 320, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  // Park grass ground
  const grassGrad = ctx.createLinearGradient(0, 340, 0, 600);
  grassGrad.addColorStop(0, '#22c55e');
  grassGrad.addColorStop(1, '#15803d');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, 340, 800, 260);

  // 1. Person (Left-Center)
  // Person Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(320, 520, 45, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath();
  ctx.arc(320, 230, 22, 0, Math.PI * 2);
  ctx.fill();

  // Torso / Jacket (Red Jacket)
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(298, 252, 44, 90, 8);
  ctx.fill();

  // Arms
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(284, 258, 14, 75);
  ctx.fillRect(342, 258, 14, 75);

  // Legs (Jeans)
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(302, 342, 16, 160);
  ctx.fillRect(322, 342, 16, 160);

  // Shoes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(298, 502, 22, 14);
  ctx.fillRect(320, 502, 22, 14);

  // 2. Dog (Right of Person)
  // Dog Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(490, 515, 65, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dog Body (Golden/Brown)
  const dogColor = '#b45309';
  ctx.fillStyle = dogColor;
  ctx.beginPath();
  ctx.ellipse(480, 440, 58, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dog Head & Snout
  ctx.beginPath();
  ctx.arc(430, 410, 24, 0, Math.PI * 2);
  ctx.fill();
  // Snout
  ctx.beginPath();
  ctx.ellipse(412, 420, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dog Nose
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(400, 418, 5, 0, Math.PI * 2);
  ctx.fill();

  // Dog Ears (Floppy)
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(442, 422, 10, 20, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Dog Legs
  ctx.fillStyle = dogColor;
  ctx.fillRect(440, 460, 12, 52);
  ctx.fillRect(460, 460, 12, 52);
  ctx.fillRect(500, 460, 12, 52);
  ctx.fillRect(520, 460, 12, 52);

  // Dog Tail
  ctx.strokeStyle = dogColor;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(535, 435);
  ctx.quadraticCurveTo(565, 410, 560, 385);
  ctx.stroke();

  // 3. Park Bench (Right background)
  ctx.fillStyle = '#78350f';
  ctx.fillRect(640, 360, 120, 12);
  ctx.fillRect(640, 380, 120, 10);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(655, 372, 8, 45);
  ctx.fillRect(735, 372, 8, 45);

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createFruitsScene(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Warm rustic tabletop
  const tableGrad = ctx.createLinearGradient(0, 0, 0, 600);
  tableGrad.addColorStop(0, '#2d1810');
  tableGrad.addColorStop(1, '#1a0d08');
  ctx.fillStyle = tableGrad;
  ctx.fillRect(0, 0, 800, 600);

  // Fruit bowl shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(400, 480, 260, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ceramic Fruit Bowl
  const bowlGrad = ctx.createLinearGradient(200, 320, 600, 460);
  bowlGrad.addColorStop(0, '#f8fafc');
  bowlGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = bowlGrad;
  ctx.beginPath();
  ctx.ellipse(400, 430, 240, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  // 1. Mango (Golden Yellow-Orange, Left)
  const mangoGrad = ctx.createRadialGradient(280, 310, 10, 290, 330, 70);
  mangoGrad.addColorStop(0, '#fde047');
  mangoGrad.addColorStop(0.6, '#f59e0b');
  mangoGrad.addColorStop(1, '#ea580c');
  ctx.fillStyle = mangoGrad;
  ctx.beginPath();
  ctx.ellipse(290, 340, 55, 75, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 2. Red Apple (Center)
  const appleGrad = ctx.createRadialGradient(380, 290, 8, 400, 320, 60);
  appleGrad.addColorStop(0, '#ef4444');
  appleGrad.addColorStop(0.7, '#b91c1c');
  appleGrad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = appleGrad;
  ctx.beginPath();
  ctx.arc(400, 330, 52, 0, Math.PI * 2);
  ctx.fill();
  // Apple stem
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(400, 280);
  ctx.quadraticCurveTo(405, 260, 415, 255);
  ctx.stroke();

  // 3. Banana Bunch (Right)
  ctx.fillStyle = '#eab308';
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = 2;
  // Banana 1
  ctx.beginPath();
  ctx.ellipse(500, 330, 75, 26, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Banana 2
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.ellipse(520, 310, 70, 24, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Strawberries (Front of bowl)
  for (const [sx, sy] of [[340, 410], [440, 415], [390, 425]]) {
    const sGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 22);
    sGrad.addColorStop(0, '#f87171');
    sGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 18, 24, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Green sepals
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(sx, sy - 18, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Grapes Cluster (Far Left edge)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4 - row; col++) {
      const gx = 200 + col * 18 + row * 9;
      const gy = 360 + row * 16;
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(gx, gy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createBirdsScene(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Tropical jungle rainforest background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
  bgGrad.addColorStop(0, '#064e3b');
  bgGrad.addColorStop(0.6, '#022c22');
  bgGrad.addColorStop(1, '#052e16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 600);

  // Jungle leaves
  ctx.fillStyle = '#047857';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(100 * i, 100, 70, 35, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wooden perch branch
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.moveTo(50, 420);
  ctx.lineTo(750, 360);
  ctx.lineTo(750, 400);
  ctx.lineTo(50, 460);
  ctx.closePath();
  ctx.fill();

  // 1. Scarlet Macaw (Left Perch)
  // Red plumage body
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(260, 300, 45, 95, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Yellow and Blue wing bands
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.ellipse(280, 290, 24, 55, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.ellipse(290, 320, 22, 60, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(245, 190, 30, 0, Math.PI * 2);
  ctx.fill();
  // White face patch & eye
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(235, 185, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(235, 185, 4, 0, Math.PI * 2);
  ctx.fill();
  // Curved beak
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.moveTo(225, 180);
  ctx.quadraticCurveTo(195, 200, 215, 225);
  ctx.lineTo(228, 205);
  ctx.closePath();
  ctx.fill();
  // Long Tail feathers
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(270, 390);
  ctx.lineTo(290, 560);
  ctx.stroke();

  // 2. Toucan (Right Perch)
  // Black Toucan body
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.ellipse(540, 290, 48, 90, -0.15, 0, Math.PI * 2);
  ctx.fill();
  // White throat bib
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(505, 240, 22, 38, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Toucan Head
  ctx.fillStyle = '#09090b';
  ctx.beginPath();
  ctx.arc(520, 190, 32, 0, Math.PI * 2);
  ctx.fill();
  // Eye with blue ring
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(520, 185, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(520, 185, 4, 0, Math.PI * 2);
  ctx.fill();
  // Giant colorful Toucan beak (Yellow & Orange)
  const beakGrad = ctx.createLinearGradient(480, 160, 370, 220);
  beakGrad.addColorStop(0, '#f97316');
  beakGrad.addColorStop(0.7, '#eab308');
  beakGrad.addColorStop(1, '#000000');
  ctx.fillStyle = beakGrad;
  ctx.beginPath();
  ctx.moveTo(500, 175);
  ctx.quadraticCurveTo(390, 170, 360, 220);
  ctx.quadraticCurveTo(420, 245, 500, 225);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.92);
}

function createPersonPetsScene(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Park lawn & sunny day background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 320);
  skyGrad.addColorStop(0, '#60a5fa');
  skyGrad.addColorStop(1, '#bae6fd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 800, 320);

  // Soft sun
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(700, 80, 50, 0, Math.PI * 2);
  ctx.fill();

  // Green park lawn
  const lawnGrad = ctx.createLinearGradient(0, 300, 0, 600);
  lawnGrad.addColorStop(0, '#15803d');
  lawnGrad.addColorStop(1, '#166534');
  ctx.fillStyle = lawnGrad;
  ctx.fillRect(0, 300, 800, 300);

  // Wooden park bench
  ctx.fillStyle = '#78350f';
  ctx.fillRect(200, 340, 400, 25);
  ctx.fillRect(210, 365, 380, 20);
  // Bench legs
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(220, 360, 16, 120);
  ctx.fillRect(560, 360, 16, 120);

  // 1. PERSON (Center on bench)
  // Legs / Jeans
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(360, 360, 35, 110);
  ctx.fillRect(405, 360, 35, 110);
  // Shoes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(355, 465, 45, 18, 6);
  ctx.roundRect(405, 465, 45, 18, 6);
  ctx.fill();

  // Torso / Teal Jacket
  const jacketGrad = ctx.createLinearGradient(350, 220, 450, 360);
  jacketGrad.addColorStop(0, '#0284c7');
  jacketGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = jacketGrad;
  ctx.beginPath();
  ctx.roundRect(350, 220, 100, 145, [18, 18, 8, 8]);
  ctx.fill();

  // Head / Face
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.ellipse(400, 175, 32, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.arc(400, 160, 34, Math.PI, Math.PI * 2);
  ctx.fill();

  // Person Eyes & Smile
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(388, 172, 3, 0, Math.PI * 2);
  ctx.arc(412, 172, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(400, 188, 8, 0, Math.PI);
  ctx.stroke();

  // Arms extending outward towards pets
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  // Left arm towards dog
  ctx.beginPath();
  ctx.moveTo(355, 250);
  ctx.lineTo(260, 320);
  ctx.stroke();
  // Right arm towards cat
  ctx.beginPath();
  ctx.moveTo(445, 250);
  ctx.lineTo(540, 330);
  ctx.stroke();

  // Hands
  ctx.fillStyle = '#fed7aa';
  ctx.beginPath();
  ctx.arc(255, 322, 12, 0, Math.PI * 2);
  ctx.arc(545, 332, 12, 0, Math.PI * 2);
  ctx.fill();

  // 2. DOG (Left side of person on grass)
  // Dog shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(190, 480, 85, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Golden Retriever / Dog body
  const dogGrad = ctx.createLinearGradient(120, 350, 260, 460);
  dogGrad.addColorStop(0, '#f59e0b');
  dogGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = dogGrad;
  ctx.beginPath();
  ctx.ellipse(190, 410, 65, 45, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Dog Legs
  ctx.fillStyle = '#d97706';
  ctx.fillRect(150, 430, 18, 50);
  ctx.fillRect(180, 430, 18, 50);
  ctx.fillRect(215, 430, 18, 50);

  // Dog Head
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(240, 345, 34, 40, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Dog Snout
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.ellipse(265, 355, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dog Nose
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(280, 350, 6, 0, Math.PI * 2);
  ctx.fill();

  // Dog Floppy Ears
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.ellipse(220, 340, 14, 30, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Dog Eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(248, 338, 4, 0, Math.PI * 2);
  ctx.fill();

  // Red Dog Collar
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(225, 375, 18, 0, Math.PI);
  ctx.stroke();

  // Dog Tail (wagging upward)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(130, 400);
  ctx.quadraticCurveTo(90, 360, 110, 320);
  ctx.stroke();

  // 3. CAT (Right side of person, sitting upright on bench)
  // Cat body (White & Grey Tabby)
  const catGrad = ctx.createLinearGradient(540, 320, 620, 400);
  catGrad.addColorStop(0, '#f8fafc');
  catGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = catGrad;
  ctx.beginPath();
  ctx.ellipse(575, 345, 30, 45, 0.05, 0, Math.PI * 2);
  ctx.fill();

  // Cat Head
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.arc(575, 285, 26, 0, Math.PI * 2);
  ctx.fill();

  // Cat Pointy Triangular Ears
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.moveTo(555, 275);
  ctx.lineTo(550, 245);
  ctx.lineTo(570, 265);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(580, 265);
  ctx.lineTo(600, 245);
  ctx.lineTo(595, 275);
  ctx.closePath();
  ctx.fill();

  // Cat Eyes (bright green)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.ellipse(566, 284, 5, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(584, 284, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(566, 284, 2, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(584, 284, 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cat Nose & Whiskers
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.arc(575, 294, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  // Left whiskers
  ctx.beginPath();
  ctx.moveTo(568, 294);
  ctx.lineTo(540, 290);
  ctx.moveTo(568, 296);
  ctx.lineTo(540, 300);
  // Right whiskers
  ctx.moveTo(582, 294);
  ctx.lineTo(610, 290);
  ctx.moveTo(582, 296);
  ctx.lineTo(610, 300);
  ctx.stroke();

  // Cat Curled Tail
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(600, 370);
  ctx.quadraticCurveTo(640, 370, 630, 320);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.92);
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'fruits-basket',
    title: 'Fresh Fruits (Mango, Apple, Banana, Grapes, Strawberry)',
    description: 'Rich fruit bowl featuring Mango, Red Apple, Banana bunch, Strawberries, and Grapes with specific labeling.',
    expectedObjects: ['Mango', 'Apple', 'Banana', 'Strawberry', 'Grapes'],
    getDataUrl: createFruitsScene,
  },
  {
    id: 'person-pets-scene',
    title: 'Person with Dog & Cat (Pets)',
    description: 'Scene showing a person sitting on a park bench with both a companion dog and a tabby cat.',
    expectedObjects: ['Person', 'Dog', 'Cat'],
    getDataUrl: createPersonPetsScene,
  },
  {
    id: 'person-and-dog',
    title: 'Person & Companion Dog (Photo)',
    description: 'Real photographic scene containing a standing person, companion dog, and skateboard.',
    expectedObjects: ['Person', 'German Shepherd Dog', 'Skateboard'],
    getDataUrl: () => PERSON_DOG_BASE64,
  },
  {
    id: 'tropical-birds',
    title: 'Exotic Birds (Scarlet Macaw & Toucan)',
    description: 'Rainforest scene showing a Scarlet Macaw and a Toucan with its prominent beak.',
    expectedObjects: ['Scarlet Macaw', 'Toucan'],
    getDataUrl: createBirdsScene,
  },
  {
    id: 'desk-workspace',
    title: 'Desk Workspace & Devices',
    description: 'Desk layout containing laptop, coffee cup, cell phone, and potted plant.',
    expectedObjects: ['laptop', 'cup', 'cell phone', 'potted plant'],
    getDataUrl: createDeskWorkspace,
  },
  {
    id: 'street-traffic',
    title: 'Urban Street Traffic',
    description: 'City avenue featuring passenger automobile, traffic light, and pedestrian.',
    expectedObjects: ['car', 'traffic light', 'person'],
    getDataUrl: createStreetScene,
  },
  {
    id: 'living-room',
    title: 'Living Room Interior',
    description: 'Residential scene with sofa couch, wall clock, books, and furnishings.',
    expectedObjects: ['couch', 'clock', 'book', 'chair'],
    getDataUrl: createLivingRoom,
  },
];

