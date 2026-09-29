const SPECIES = {
  random:  { name: '田鼠 Vole',     bodyColor: [139, 90, 60],  headColor: [120, 75, 50],  radius: 4 },
  clumped: { name: '旅鼠 Lemming',  bodyColor: [200, 195, 185], headColor: [170, 165, 155], radius: 3 },
  uniform: { name: '囊地鼠 Gopher', bodyColor: [110, 70, 45],  headColor: [90, 55, 35],   radius: 5 }
};

class Vole {
  constructor(x, y, dist) {
    this.x = x;
    this.y = y;
    this.dist = dist || 'random';

    const cfg = BOIDS[this.dist];
    this.radius = cfg.radius;
    this.collisionRadius = cfg.radius;
    this.minCollisionRadius = 1.5;
    this.maxSpeed = cfg.maxSpeed;

    this.marked = false;
    this.trapped = false;
    this.timesTrapped = 0;
    this.loneTimer = 0;
    this.flashTimer = 0;

    this.leavingGroup = false;
    this.leaveTimer = 0;

    const a = random(TWO_PI);
    this.vx = Math.cos(a) * this.maxSpeed * 0.5;
    this.vy = Math.sin(a) * this.maxSpeed * 0.5;

    this.currentColor = SPECIES[this.dist].bodyColor.slice();
    this.targetColor  = SPECIES[this.dist].bodyColor.slice();
    this.currentHead  = SPECIES[this.dist].headColor.slice();
    this.targetHead   = SPECIES[this.dist].headColor.slice();
  }

  move() {
    if (this.dist === 'clumped') {
      const n = voles.length;
      const scale = Math.max(0.4, 50 / n);
      this.collisionRadius = Math.max(
        this.minCollisionRadius,
        BOIDS.clumped.radius * scale
      );
    } else {
      this.collisionRadius = this.radius;
    }

    for (let i = 0; i < 3; i++) {
      this.currentColor[i] += (this.targetColor[i] - this.currentColor[i]) * 0.05;
      this.currentHead[i]  += (this.targetHead[i]  - this.currentHead[i])  * 0.05;
    }

    if (this.flashTimer > 0) this.flashTimer--;

    if (this.trapped) return;

    const cfg = BOIDS[this.dist];

    let sepX = 0, sepY = 0, sepN = 0;
    let aliX = 0, aliY = 0, aliN = 0;
    let cohX = 0, cohY = 0, cohN = 0;
    let nearestDist = Infinity;

    const perc2 = PERCEPTION * PERCEPTION;

    for (const o of voles) {
      if (o === this || o.trapped) continue;
      const dx = o.x - this.x;
      const dy = o.y - this.y;
      const d2 = dx * dx + dy * dy;

      if (d2 > 0 && d2 < perc2) {
        const d = Math.sqrt(d2);
        if (d < nearestDist) nearestDist = d;

        const minD = this.collisionRadius + o.collisionRadius;
        if (d < minD * 2.5) {
          sepX -= dx / d / Math.max(d, 1);
          sepY -= dy / d / Math.max(d, 1);
          sepN++;
        }

        aliX += o.vx; aliY += o.vy; aliN++;
        cohX += o.x;  cohY += o.y;  cohN++;
      }
    }

    let ax = 0, ay = 0;

    if (sepN > 0) {
      const m = Math.sqrt(sepX * sepX + sepY * sepY);
      if (m > 0) {
        ax += (sepX / m) * cfg.sepWeight;
        ay += (sepY / m) * cfg.sepWeight;
      }
    }

    if (aliN > 0) {
      aliX /= aliN; aliY /= aliN;
      const m = Math.sqrt(aliX * aliX + aliY * aliY);
      if (m > 0) {
        ax += (aliX / m - this.vx / this.maxSpeed) * cfg.aliWeight;
        ay += (aliY / m - this.vy / this.maxSpeed) * cfg.aliWeight;
      }
    }

    if (cohN > 0) {
      cohX /= cohN; cohY /= cohN;
      const dx = cohX - this.x;
      const dy = cohY - this.y;
      const m = Math.sqrt(dx * dx + dy * dy);
      if (m > 0) {
        let cohScale = 1;
        if (this.dist === 'clumped') {
          cohScale = 1 + (m / PERCEPTION) * 0.8;
          if (nearestDist < 20) cohScale = 0;
        } else if (this.dist === 'uniform') {
          cohScale = nearestDist > DESIRED_DIST ? 0.6 : 0;
        }
        ax += (dx / m) * cfg.cohWeight * 0.3 * cohScale;
        ay += (dy / m) * cfg.cohWeight * 0.3 * cohScale;
      }
    }

    if (this.dist === 'clumped' && cohN > 0) {
      const crowd = Math.min(1, cohN / 8);
      const splitProb = CLUMPED_SPLIT_BASE + CLUMPED_SPLIT_CROWD * crowd;
      if (random() < splitProb) {
        const a = random(TWO_PI);
        this.vx += Math.cos(a) * 1.4;
        this.vy += Math.sin(a) * 1.4;
        this.loneTimer = 0;
      }

      if (!this.leavingGroup && random() < 1 / 500) {
        this.leavingGroup = true;
        this.leaveTimer = 300;
        const a = random(TWO_PI);
        this.vx += Math.cos(a) * 1.5;
        this.vy += Math.sin(a) * 1.5;

        let pulled = 0;
        for (const o of voles) {
          if (o === this || o.trapped) continue;
          if (pulled >= 8) break;
          const dx = o.x - this.x;
          const dy = o.y - this.y;
          if (dx * dx + dy * dy < 80 * 80) {
            o.leavingGroup = true;
            o.leaveTimer = 300;
            o.vx += Math.cos(a) * 1.0;
            o.vy += Math.sin(a) * 1.0;
            pulled++;
          }
        }
      }
    }

    if (this.dist === 'clumped' && this.leavingGroup) {
      this.leaveTimer--;
      ax *= 0.3;
      ay *= 0.3;
      if (this.leaveTimer > 0) {
        ax += random(-0.1, 0.1);
        ay += random(-0.1, 0.1);
      }
      if (this.leaveTimer <= 0) this.leavingGroup = false;
    }

    if (this.dist === 'clumped' && !this.leavingGroup) {
      if (cohN === 0) this.loneTimer++;
      else this.loneTimer = 0;

      if (cohN === 0) {
        ax += random(-0.15, 0.15);
        ay += random(-0.15, 0.15);
      }

      if (cohN === 0 && this.loneTimer > 180) {
        let gx = 0, gy = 0, gn = 0;
        for (const o of voles) {
          if (o === this || o.trapped) continue;
          const dx = o.x - this.x;
          const dy = o.y - this.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 300 * 300) { gx += o.x; gy += o.y; gn++; }
        }
        if (gn > 0) {
          gx /= gn; gy /= gn;
          const dx = gx - this.x;
          const dy = gy - this.y;
          const m = Math.sqrt(dx * dx + dy * dy);
          if (m > 0) {
            ax += (dx / m) * 0.18;
            ay += (dy / m) * 0.18;
          }
        }
      }
    }

    ax += random(-1, 1) * cfg.wanderStrength;
    ay += random(-1, 1) * cfg.wanderStrength;

    if (this.dist === 'uniform' && nearestDist < Infinity) {
      if (nearestDist < DESIRED_DIST) {
        ax += random(-0.05, 0.05);
        ay += random(-0.05, 0.05);
      }
    }

    this.vx += ax;
    this.vy += ay;

    if (this.dist === 'uniform') {
      const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const minSpeed = this.maxSpeed * 0.45;
      if (s < minSpeed) {
        const a = s > 0 ? Math.atan2(this.vy, this.vx) : random(TWO_PI);
        this.vx = Math.cos(a) * minSpeed;
        this.vy = Math.sin(a) * minSpeed;
      }
    }

    this.limitSpeed(this.maxSpeed);
    this.x += this.vx;
    this.y += this.vy;

    if (obstacles.length > 0) {
      for (const ob of obstacles) {
        const dx = this.x - ob.x;
        const dy = this.y - ob.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const minD = ob.r + this.collisionRadius;
        if (d > 0 && d < minD) {
          const nx = dx / d, ny = dy / d;
          this.x = ob.x + nx * minD;
          this.y = ob.y + ny * minD;
          const dot = this.vx * nx + this.vy * ny;
          if (dot < 0) {
            this.vx -= 2 * dot * nx;
            this.vy -= 2 * dot * ny;
            this.vx *= 0.7;
            this.vy *= 0.7;
          }
        }
      }
    }

    const r = this.radius;
    if (this.x < r)          { this.x = r;          this.vx = Math.abs(this.vx) * 0.7; }
    if (this.x > width - r)  { this.x = width - r;  this.vx = -Math.abs(this.vx) * 0.7; }
    if (this.y < r)          { this.y = r;          this.vy = Math.abs(this.vy) * 0.7; }
    if (this.y > height - r) { this.y = height - r; this.vy = -Math.abs(this.vy) * 0.7; }
  }

  limitSpeed(max) {
    const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (s > max) {
      this.vx = (this.vx / s) * max;
      this.vy = (this.vy / s) * max;
    }
  }

  draw(seeAll) {
    if (!seeAll && !this.trapped && !this.marked) return;

    push();
    translate(this.x, this.y);
    rotate(Math.atan2(this.vy, this.vx));

    const sz = this.radius * 2.2;

    if (this.flashTimer > 0) {
      noFill();
      stroke(255, 230, 0, 200);
      strokeWeight(3);
      circle(0, 0, sz * 2.2);
    }

    noStroke();
    fill(this.currentColor);
    ellipse(0, 0, sz * 1.4, sz);

    fill(this.currentHead);
    ellipse(sz * 0.6, 0, sz * 0.65, sz * 0.7);

    fill(0);
    circle(sz * 0.75, -2, 1.4);

    if (this.dist === 'clumped') {
      fill(255, 255, 255, 120);
      circle(-sz * 0.3, 0, 2.5);
    }

    if (this.marked) {
      fill(220, 30, 30);
      circle(0, -sz * 0.6, 4);
    }

    if (this.trapped) {
      noFill();
      stroke(255, 220, 0);
      strokeWeight(1.5);
      circle(0, 0, sz * 2);
    }

    pop();
  }
}

function buildSpatialGrid(cellSize) {
  const cols = Math.ceil(width  / cellSize);
  const rows = Math.ceil(height / cellSize);
  const grid = new Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = [];

  for (let i = 0; i < voles.length; i++) {
    const v = voles[i];
    if (v.trapped) continue;
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(v.x / cellSize)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(v.y / cellSize)));
    grid[cy * cols + cx].push(v);
  }
  return { grid, cols, rows, cellSize };
}

function resolveCollisions() {
  const cellSize = 30;
  const { grid, cols, rows } = buildSpatialGrid(cellSize);

  for (let iter = 0; iter < collisionIter; iter++) {
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const bucket = grid[cy * cols + cx];
        for (let i = 0; i < bucket.length; i++) {
          const a = bucket[i];
          if (a.trapped) continue;

          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx < 0) continue;
              const nx = cx + dx, ny = cy + dy;
              if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;

              const targetBucket = grid[ny * cols + nx];
              for (let j = 0; j < targetBucket.length; j++) {
                const b = targetBucket[j];
                if (b === a || b.trapped) continue;
                if (nx === cx && ny === cy && j <= i) continue;

                const ddx = b.x - a.x;
                const ddy = b.y - a.y;
                const d = Math.sqrt(ddx * ddx + ddy * ddy);
                const minD = a.collisionRadius + b.collisionRadius;
                if (d > 0 && d < minD) {
                  const overlap = (minD - d) / 2;
                  const ux = ddx / d, uy = ddy / d;
                  a.x -= ux * overlap; a.y -= uy * overlap;
                  b.x += ux * overlap; b.y += uy * overlap;
                } else if (d === 0) {
                  a.x += random(-1, 1);
                  a.y += random(-1, 1);
                }
              }
            }
          }
        }
      }
    }
  }
}