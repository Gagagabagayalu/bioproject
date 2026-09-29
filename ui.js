function bindUI() {
  const popInput = select('#pop-size');
  popInput.input(() => {
    const v = int(popInput.value());
    if (v >= 50 && v <= 500) popSize = v;
  });
  popInput.changed(() => {
    const v = int(popInput.value());
    if (v >= 50 && v <= 500) {
      popSize = v;
      resetSimulation();
    }
  });

  select('#distribution').changed(() => {
    const newDist = select('#distribution').value();
    if (newDist === distribution) return;
    distribution = newDist;
    for (const v of voles) {
      v.dist = newDist;
      v.targetRadius = BOIDS[newDist].radius;
      v.maxSpeed = BOIDS[newDist].maxSpeed;
      v.targetColor = SPECIES[newDist].bodyColor.slice();
      v.targetHead  = SPECIES[newDist].headColor.slice();
    }
  });

  select('#trap-exp').changed(() => { trapExperience = select('#trap-exp').value(); });

  select('#trap-size').changed(() => {
    trapSize = select('#trap-size').value();
    rebuildTraps();
  });

  select('#method').changed(() => {
    method = select('#method').value();
    updateReporters();
    drawCharts();
  });

  select('#see-all').changed(() => { seeAll = select('#see-all').elt.checked; });
  select('#show-ci').changed(() => {
    showCI = select('#show-ci').elt.checked;
    updateReporters();
  });
  select('#show-heat').changed(() => { showHeat = select('#show-heat').elt.checked; });

  select('#btn-start').mousePressed(toggleRunning);
  select('#btn-go').mousePressed(toggleTraps);
  select('#btn-mark').mousePressed(markTrappedVoles);
  select('#btn-release').mousePressed(releaseAllVoles);
  select('#btn-unmark').mousePressed(unmarkAllVoles);
  select('#btn-reset').mousePressed(resetSimulation);
  select('#btn-record').mousePressed(recordExperiment);
  select('#btn-export').mousePressed(exportCSV);
  select('#btn-clear').mousePressed(clearRecords);
  select('#btn-batch').mousePressed(runBatch);
}

function spawnObstacles() {
  obstacles = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    obstacles.push({
      x: random(width * 0.08, width * 0.92),
      y: random(height * 0.08, height * 0.92),
      r: random(25, 55)
    });
  }
}

function toggleRunning() {
  running = !running;
  select('#btn-start').html(running ? 'Pause' : 'Start');
}

function resetSimulation() {
  voles = [];
  obstacles = [];
  spawnObstacles();

  const positions = generatePositions(popSize, distribution);
  for (const p of positions) voles.push(new Vole(p.x, p.y, distribution));
  rebuildTraps();
  trapOpen = false;
  running = false;
  select('#btn-start').html('Start');
  updateReporters();
  drawCharts();
}

function generatePositions(n, mode) {
  const res = [];

  const avoidObstacles = (x, y, margin) => {
    for (const ob of obstacles) {
      const dx = x - ob.x, dy = y - ob.y;
      const m = ob.r + margin;
      if (dx * dx + dy * dy < m * m) return false;
    }
    return true;
  };

  if (mode === 'random') {
    for (let i = 0; i < n; i++) {
      let x, y, ok = false, tries = 0;
      while (!ok && tries < 50) {
        x = random(40, width - 40);
        y = random(40, height - 40);
        ok = avoidObstacles(x, y, 20);
        tries++;
      }
      res.push({ x, y });
    }
  } else if (mode === 'clumped') {
    const seeds = 3;
    const centers = [];
    for (let s = 0; s < seeds; s++) {
      centers.push({
        x: random(width * 0.2, width * 0.8),
        y: random(height * 0.2, height * 0.8)
      });
    }
    for (let i = 0; i < n; i++) {
      const c = centers[i % seeds];
      let x, y, ok = false, tries = 0;
      while (!ok && tries < 50) {
        x = constrain(c.x + randomGaussian() * 40, 40, width - 40);
        y = constrain(c.y + randomGaussian() * 40, 40, height - 40);
        ok = avoidObstacles(x, y, 20);
        tries++;
      }
      res.push({ x, y });
    }
  } else {
    const cols = Math.ceil(Math.sqrt(n * width / height));
    const rows = Math.ceil(n / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      let x = (c + 0.5) * cellW + random(-cellW * 0.1, cellW * 0.1);
      let y = (r + 0.5) * cellH + random(-cellH * 0.1, cellH * 0.1);
      for (const ob of obstacles) {
        const dx = x - ob.x, dy = y - ob.y;
        const m = ob.r + 20;
        if (dx * dx + dy * dy < m * m) {
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          x = ob.x + (dx / d) * m;
          y = ob.y + (dy / d) * m;
        }
      }
      res.push({ x, y });
    }
  }
  return res;
}

function rebuildTraps() {
  traps = [];
  const cfg = TRAP_SIZES[trapSize];
  traps.push(new Trap(width / 2 - cfg.size / 2, height / 2 - cfg.size / 2, cfg.size, cfg.capacity));
  select('#r-trap-cap').html(cfg.capacity);
}

function toggleTraps() {
  trapOpen = !trapOpen;
  for (const t of traps) {
    t.open = trapOpen;
    if (!trapOpen) {
      for (const v of voles) if (t.contains(v)) v.trapped = false;
    }
  }
}

function markTrappedVoles() {
  for (const v of voles) {
    if (v.trapped) {
      v.marked = true;
      v.flashTimer = 30;
    }
  }
  updateReporters();
}

function releaseAllVoles() {
  for (const v of voles) v.trapped = false;
  for (const t of traps) t.open = false;
  trapOpen = false;
  updateReporters();
}

function unmarkAllVoles() {
  for (const v of voles) v.marked = false;
  updateReporters();
}

function updateReporters() {
  const totalMarked = voles.filter(v => v.marked).length;
  const trapped = voles.filter(v => v.trapped);
  const markedInTraps = trapped.filter(v => v.marked).length;
  const totalInTraps = trapped.length;
  const actualN = voles.length;

  select('#r-total-marked').html(totalMarked);
  select('#r-total-traps').html(totalInTraps);
  select('#r-marked-traps').html(markedInTraps);
  select('#r-actual').html(actualN);

  const est = estimate(totalMarked, totalInTraps, markedInTraps, records);
  lastEstimate = est;

  if (est) {
    select('#r-est').html(est.n.toFixed(1));
    if (showCI && est.ciLow != null && est.ciHigh != null)
      select('#r-ci').html(`[${est.ciLow.toFixed(0)}, ${est.ciHigh.toFixed(0)}]`);
    else
      select('#r-ci').html('—');
    const err = ((est.n - actualN) / actualN) * 100;
    select('#r-error').html(err.toFixed(1) + '%');
  } else {
    select('#r-est').html('—');
    select('#r-ci').html('—');
    select('#r-error').html('—');
  }

  if (ciTotal > 0) {
    select('#r-cover').html((ciHits / ciTotal * 100).toFixed(1) + '% (' + ciHits + '/' + ciTotal + ')');
  } else {
    select('#r-cover').html('—');
  }
}

function recordExperiment() {
  const M = voles.filter(v => v.marked).length;
  const trapped = voles.filter(v => v.trapped);
  const R = trapped.filter(v => v.marked).length;
  const C = trapped.length;
  const actualN = voles.length;
  const est = estimate(M, C, R, records);
  const err = est ? ((est.n - actualN) / actualN) * 100 : null;

  for (const v of trapped) v.flashTimer = 60;

  if (est && est.ciLow != null && est.ciHigh != null) {
    ciTotal++;
    if (actualN >= est.ciLow && actualN <= est.ciHigh) ciHits++;
  }

  records.push({
    round: records.length + 1,
    method, popSize, distribution, trapExperience, trapSize,
    M, C, R,
    est: est ? est.n : null,
    ciLow: est ? est.ciLow : null,
    ciHigh: est ? est.ciHigh : null,
    actualN, err
  });

  select('#record-count').html('Recorded: ' + records.length);
  renderHistory();
  drawCharts();
}

function renderHistory() {
  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';
  for (const r of records) {
    const tr = document.createElement('tr');
    const cls = r.err != null && Math.abs(r.err) > 30 ? 'err-high' : '';
    tr.innerHTML = `
      <td>${r.round}</td>
      <td>${r.M}</td>
      <td>${r.C}</td>
      <td>${r.R}</td>
      <td>${r.est != null ? r.est.toFixed(1) : '—'}</td>
      <td class="${cls}">${r.err != null ? r.err.toFixed(1) + '%' : '—'}</td>
    `;
    tbody.appendChild(tr);
  }
}

function clearRecords() {
  records = [];
  ciHits = 0;
  ciTotal = 0;
  select('#record-count').html('Recorded: 0');
  renderHistory();
  updateReporters();
  drawCharts();
}

function runBatch() {
  const results = [];
  const originalVoles = voles;

  for (let run = 0; run < 100; run++) {
    const tmp = [];
    const positions = generatePositions(popSize, distribution);
    for (const p of positions) tmp.push(new Vole(p.x, p.y, distribution));
    voles = tmp;

    const half = Math.floor(popSize / 2);
    for (let i = 0; i < half; i++) voles[i].marked = true;

    const C = Math.max(1, Math.floor(popSize * 0.3));
    const shuffled = voles.slice().sort(() => Math.random() - 0.5);
    const caught = shuffled.slice(0, C);
    const M = half;
    const R = caught.filter(v => v.marked).length;

    const lp = lincolnPetersen(M, C, R);
    const ch = chapman(M, C, R);

    results.push({
      est: lp ? lp.n : null,
      chapman: ch ? ch.n : null,
      actual: popSize
    });
  }

  voles = originalVoles;
  batchResults = results;
  drawCharts();
}

function exportCSV() {
  if (records.length === 0) { alert('No records yet'); return; }
  const headers = Object.keys(records[0]);
  const rows = records.map(r => headers.map(h => r[h]).join(','));
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mark-recapture-data.csv';
  a.click();
  URL.revokeObjectURL(url);
}