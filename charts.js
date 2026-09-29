let lineChart, barChart, histChart, ratioChart;

function setupCharts() {
  lineChart = createGraphics(300, 120);
  lineChart.parent('chart-line');
  barChart = createGraphics(300, 120);
  barChart.parent('chart-bar');
  histChart = createGraphics(300, 120);
  histChart.parent('chart-hist');
  ratioChart = createGraphics(300, 120);
  ratioChart.parent('chart-ratio');

  lineChart.elt.style.display = 'block';
  barChart.elt.style.display = 'block';
  histChart.elt.style.display = 'block';
  ratioChart.elt.style.display = 'block';

  resizeCharts();
  window.addEventListener('resize', resizeCharts);
}

function resizeCharts() {
  if (!lineChart || !barChart || !histChart || !ratioChart) return;
  const ids = ['chart-line', 'chart-bar', 'chart-hist', 'chart-ratio'];
  const charts = [lineChart, barChart, histChart, ratioChart];
  for (let i = 0; i < ids.length; i++) {
    const el = document.getElementById(ids[i]);
    const w = (el && el.clientWidth) || 300;
    charts[i].resizeCanvas(w, 120);
  }
  drawCharts();
}

function drawCharts() {
  if (!lineChart || !barChart || !histChart || !ratioChart) return;
  drawLineChart();
  drawBarChart();
  drawHistChart();
  drawRatioChart();
}

function drawLineChart() {
  const g = lineChart;
  g.background(247, 249, 250);
  const W = g.width, H = g.height, pad = 24;
  const innerW = W - pad * 2, innerH = H - pad * 2;

  g.stroke(220); g.strokeWeight(1); g.noFill();
  g.rect(pad, pad, innerW, innerH);
  for (let i = 1; i < 4; i++) {
    const y = pad + (innerH / 4) * i;
    g.line(pad, y, pad + innerW, y);
  }
  for (let i = 1; i < 5; i++) {
    const x = pad + (innerW / 5) * i;
    g.line(x, pad, x, pad + innerH);
  }

  if (records.length === 0) {
    g.fill(160); g.noStroke(); g.textSize(11); g.textAlign(CENTER, CENTER);
    g.text('No data yet', W / 2, H / 2);
    g.fill(200, 80, 80); g.textSize(10); g.textAlign(LEFT, TOP);
    g.text('Actual N', pad + 2, 4);
    g.fill(27, 107, 74);
    g.text('Estimate', pad + 70, 4);
    return;
  }

  const ests = records.map(r => r.est).filter(v => v != null);
  const actual = voles.length;
  const maxV = Math.max(...ests, actual) * 1.1;
  const minV = 0;

  const xAt = i => pad + (records.length <= 1 ? innerW / 2 : (i / (records.length - 1)) * innerW);
  const yAt = v => pad + innerH - ((v - minV) / (maxV - minV)) * innerH;

  g.stroke(200, 80, 80); g.strokeWeight(1); g.drawingContext.setLineDash([4, 3]);
  g.line(pad, yAt(actual), W - pad, yAt(actual));
  g.drawingContext.setLineDash([]);

  g.stroke(27, 107, 74); g.strokeWeight(2); g.noFill();
  g.beginShape();
  records.forEach((r, i) => { if (r.est != null) g.vertex(xAt(i), yAt(r.est)); });
  g.endShape();

  g.noStroke(); g.fill(27, 107, 74);
  records.forEach((r, i) => { if (r.est != null) g.circle(xAt(i), yAt(r.est), 5); });

  g.fill(200, 80, 80); g.textSize(10); g.textAlign(LEFT, TOP);
  g.text('Actual N', pad + 2, 4);
  g.fill(27, 107, 74);
  g.text('Estimate', pad + 70, 4);
}

function drawBarChart() {
  const g = barChart;
  g.background(247, 249, 250);
  const W = g.width, H = g.height, pad = 24;
  const innerW = W - pad * 2, innerH = H - pad * 2;

  g.stroke(220); g.strokeWeight(1); g.noFill();
  g.rect(pad, pad, innerW, innerH);

  if (records.length === 0) {
    g.fill(160); g.noStroke(); g.textSize(11); g.textAlign(CENTER, CENTER);
    g.text('No data', W / 2, H / 2);
    g.fill(120); g.textSize(10); g.textAlign(LEFT, TOP);
    g.text('Error %', pad + 2, 4);
    return;
  }

  const errs = records.map(r => r.err == null ? 0 : Math.abs(r.err));
  const maxE = Math.max(...errs, 10);
  const bw = innerW / records.length;

  for (let i = 0; i < records.length; i++) {
    const e = errs[i];
    const h = (e / maxE) * innerH;
    const x = pad + i * bw;
    const y = pad + innerH - h;
    g.noStroke();
    g.fill(e > 30 ? [192, 57, 43] : e > 15 ? [230, 145, 56] : [27, 107, 74]);
    g.rect(x + bw * 0.15, y, bw * 0.7, h, 2, 2, 0, 0);
  }
  g.fill(120); g.textSize(10); g.textAlign(LEFT, TOP);
  g.text('Error %', pad + 2, 4);
}

function drawHistChart() {
  const g = histChart;
  g.background(247, 249, 250);
  const W = g.width, H = g.height, pad = 24;
  const innerW = W - pad * 2, innerH = H - pad * 2;

  g.stroke(220); g.strokeWeight(1); g.noFill();
  g.rect(pad, pad, innerW, innerH);

  if (batchResults.length === 0) {
    g.fill(160); g.noStroke(); g.textSize(11); g.textAlign(CENTER, CENTER);
    g.text('点 Batch 跑 100 次', W / 2, H / 2);
    return;
  }

  const actual = voles.length;
  const all = batchResults.map(b => b.est).filter(v => v != null);
  if (all.length === 0) return;

  const minV = Math.min(...all, actual * 0.5);
  const maxV = Math.max(...all, actual * 1.5);
  const bins = 20;
  const binW = (maxV - minV) / bins;
  const hist = new Array(bins).fill(0);
  for (const v of all) {
    const idx = Math.min(bins - 1, Math.floor((v - minV) / binW));
    if (idx >= 0) hist[idx]++;
  }
  const maxCount = Math.max(...hist);
  const bw = innerW / bins;

  g.noStroke();
  for (let i = 0; i < bins; i++) {
    const h = (hist[i] / maxCount) * innerH;
    const x = pad + i * bw;
    const y = pad + innerH - h;
    g.fill(27, 107, 74, 180);
    g.rect(x, y, bw * 0.9, h);
  }

  const actualX = pad + ((actual - minV) / (maxV - minV)) * innerW;
  g.stroke(200, 80, 80); g.strokeWeight(1.5);
  g.line(actualX, pad, actualX, H - pad);

  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  const meanX = pad + ((mean - minV) / (maxV - minV)) * innerW;
  g.stroke(27, 107, 74); g.strokeWeight(1.5);
  g.line(meanX, pad, meanX, H - pad);

  g.noStroke();
  g.fill(200, 80, 80); g.textSize(10); g.textAlign(LEFT, TOP);
  g.text('Actual', pad + 2, 4);
  g.fill(27, 107, 74);
  g.text('Mean=' + mean.toFixed(1), pad + 60, 4);
}

function drawRatioChart() {
  const g = ratioChart;
  g.background(247, 249, 250);
  const W = g.width, H = g.height, pad = 24;
  const innerW = W - pad * 2, innerH = H - pad * 2;

  g.stroke(220); g.strokeWeight(1); g.noFill();
  g.rect(pad, pad, innerW, innerH);
  for (let i = 1; i < 4; i++) {
    const y = pad + (innerH / 4) * i;
    g.line(pad, y, pad + innerW, y);
  }

  const N = voles.length || 50;
  const M = Math.floor(N * 0.5);
  const C = Math.max(1, Math.floor(N * 0.3));

  if (M === 0 || C === 0) {
    g.fill(160); g.noStroke(); g.textSize(11); g.textAlign(CENTER, CENTER);
    g.text('No data', W / 2, H / 2);
    return;
  }

  const ratios = [];
  for (let rc = 0.1; rc <= 0.9001; rc += 0.05) {
    const R = Math.max(1, Math.round(C * rc));
    const est = (M * C) / R;
    const err = ((est - N) / N) * 100;
    ratios.push({ rc, est, err });
  }

  const maxErr = Math.min(200, Math.max(...ratios.map(r => r.err)) * 1.1);
  const yAt = e => pad + innerH - (Math.min(e, maxErr) / maxErr) * innerH;
  const xAt = rc => pad + ((rc - 0.1) / 0.8) * innerW;

  if (maxErr > 0) {
    g.stroke(180); g.strokeWeight(1);
    g.drawingContext.setLineDash([3, 3]);
    g.line(pad, yAt(0), pad + innerW, yAt(0));
    g.drawingContext.setLineDash([]);
  }

  g.stroke(200, 80, 80); g.strokeWeight(2); g.noFill();
  g.beginShape();
  for (const p of ratios) g.vertex(xAt(p.rc), yAt(p.err));
  g.endShape();

  for (const p of ratios) {
    g.noStroke();
    if (p.err > 50) g.fill(192, 57, 43);
    else if (p.err > 20) g.fill(230, 145, 56);
    else g.fill(27, 107, 74);
    g.circle(xAt(p.rc), yAt(p.err), 4);
  }

  g.fill(120); g.textSize(9); g.textAlign(LEFT, TOP);
  g.text('偏差%', pad + 2, 4);
  g.textAlign(RIGHT, BOTTOM);
  g.text('R/C = 0.9', pad + innerW, H - 2);
  g.textAlign(LEFT, BOTTOM);
  g.text('0.1', pad, H - 2);
}