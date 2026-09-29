function setup() {
  const c = document.getElementById('canvas-container');
  const canvas = createCanvas(c.clientWidth, c.clientHeight);
  canvas.parent('canvas-container');
  setupCharts();
  resetSimulation();
  bindUI();
}

function windowResized() {
  const c = document.getElementById('canvas-container');
  resizeCanvas(c.clientWidth, c.clientHeight);
  rebuildTraps();
  for (const v of voles) {
    v.x = constrain(v.x, v.radius, width - v.radius);
    v.y = constrain(v.y, v.radius, height - v.radius);
  }
  resizeCharts();
}

function draw() {
  background(74, 124, 58);

  // 方格表
  stroke(255, 255, 255, 30);
  strokeWeight(1);
  const gridSize = 40;
  for (let x = 0; x <= width; x += gridSize) line(x, 0, x, height);
  for (let y = 0; y <= height; y += gridSize) line(0, y, width, y);
  noStroke();

  if (running) {
    checkTraps();
    for (const v of voles) v.move();
    resolveCollisions();
  }

  if (showHeat) drawHeatmap();

  // 石头
  for (const ob of obstacles) {
    push();
    noStroke();
    fill(120, 120, 120);
    circle(ob.x, ob.y, ob.r * 2);
    fill(90, 90, 90);
    circle(ob.x - ob.r * 0.2, ob.y - ob.r * 0.2, ob.r * 1.2);
    pop();
  }

  for (const v of voles) v.draw(seeAll);
  for (const t of traps) t.draw();

  if (running) updateReporters();
}

function checkTraps() {
  if (!trapOpen) return;
  const t = traps[0];
  if (!t) return;

  let caughtCount = voles.filter(v => v.trapped).length;
  if (caughtCount >= t.capacity) return;

  for (const v of voles) {
    if (v.trapped) continue;
    if (caughtCount >= t.capacity) break;

    if (t.contains(v)) {
      let prob = 1.0;
      if (trapExperience === 'negative' && v.timesTrapped > 0) prob = 0.3;
      if (trapExperience === 'positive' && v.timesTrapped > 0) prob = 1.0;

      if (random() < constrain(prob, 0, 1)) {
        v.trapped = true;
        v.timesTrapped++;
        caughtCount++;
      }
    }
  }
}

function drawHeatmap() {
  const cellSize = 30;
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const counts = new Array(cols * rows).fill(0);

  for (const v of voles) {
    if (v.trapped) continue;
    const cx = Math.min(cols - 1, Math.floor(v.x / cellSize));
    const cy = Math.min(rows - 1, Math.floor(v.y / cellSize));
    counts[cy * cols + cx]++;
  }

  let maxC = 1;
  for (const c of counts) if (c > maxC) maxC = c;

  noStroke();
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const c = counts[cy * cols + cx];
      if (c === 0) continue;
      const t = c / maxC;
      const r = lerp(0, 255, t);
      const g = lerp(255, 0, t);
      fill(r, g, 0, 100);
      rect(cx * cellSize, cy * cellSize, cellSize, cellSize);
    }
  }
}

function mousePressed() {
  const t = traps[0];
  if (!t) return;
  if (mouseX > t.x && mouseX < t.x + t.w &&
      mouseY > t.y && mouseY < t.y + t.h) {
    t.dragging = true;
    t.dragOffsetX = mouseX - t.x;
    t.dragOffsetY = mouseY - t.y;
  }
}

function mouseDragged() {
  const t = traps[0];
  if (t && t.dragging) {
    t.x = mouseX - t.dragOffsetX;
    t.y = mouseY - t.dragOffsetY;
  }
}

function mouseReleased() {
  const t = traps[0];
  if (t) t.dragging = false;
}

function keyPressed() {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;

  if (key === ' ') {
    spaceAction();
    return false;
  }
}

function spaceAction() {
  const t = traps[0];
  if (!t) return;

  const trappedCount = voles.filter(v => v.trapped).length;
  const unmarkedInTrap = voles.filter(v => v.trapped && !v.marked).length;

  if (!trapOpen && trappedCount === 0) {
    toggleTraps();
    return;
  }
  if (trappedCount > 0 && unmarkedInTrap > 0) {
    markTrappedVoles();
    return;
  }
  if (trappedCount > 0 && unmarkedInTrap === 0) {
    releaseAllVoles();
    return;
  }
  toggleTraps();
}