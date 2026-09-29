function lincolnPetersen(M, C, R) {
  if (R <= 0) return null;
  const n = (M * C) / R;
  const se = Math.sqrt((M * C * (M - R) * (C - R)) / (R * R * R));
  return { n, ciLow: Math.max(M, C, n - 1.96 * se), ciHigh: n + 1.96 * se };
}

function chapman(M, C, R) {
  if (R <= 0) return null;
  const n = ((M + 1) * (C + 1)) / (R + 1) - 1;
  const varN = ((M + 1) * (C + 1) * (M - R) * (C - R)) /
               ((R + 1) * (R + 1) * (R + 2));
  const se = Math.sqrt(varN);
  return { n, ciLow: Math.max(M, C, n - 1.96 * se), ciHigh: n + 1.96 * se };
}

// 严格 Schnabel：Σ(M_i * C_i) / Σ R_i
// M_i 是第 i 轮之前累计标记数
function schnabel(history) {
  let sumMC = 0, sumR = 0;
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    // M_i = 之前所有轮的标记累计
    let Mi = 0;
    for (let j = 0; j < i; j++) Mi += history[j].R;   // 每轮新标记的 = R_i
    sumMC += Mi * h.C;
    sumR  += h.R;
  }
  if (sumR === 0) return null;
  const n = sumMC / sumR;
  return { n, ciLow: null, ciHigh: null };
}

function estimate(M, C, R, history) {
  if (method === 'lp')       return lincolnPetersen(M, C, R);
  if (method === 'chapman')  return chapman(M, C, R);
  if (method === 'schnabel') return schnabel(history);
  return null;
}