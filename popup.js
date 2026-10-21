function bucket(v) {
  if (v < 1.5) return 0;
  if (v < 2) return 1;
  if (v < 5) return 2;
  return 3;
}
const CLS = ['low', 'mid', 'mid', 'high'];
const NAMES = ['<1.5x', '1.5-2x', '2-5x', '5x+'];
const MID = [1.2, 1.72, 3.0, 7.5];

function fmt(v) { return (+v).toFixed(2) + 'x'; }

// --- MATH MODELS ---
function markov(hist) {
  if (hist.length < 5) return null;
  const t = Array.from({ length: 4 }, () => [1, 1, 1, 1]);
  const chrono = hist.slice().reverse();
  for (let i = 0; i < chrono.length - 1; i++) t[bucket(chrono[i])][bucket(chrono[i + 1])]++;
  const row = t[bucket(hist[0])];
  const tot = row.reduce((a, b) => a + b, 0);
  const probs = row.map(c => c / tot);
  let best = 0;
  for (let i = 1; i < 4; i++) if (probs[i] > probs[best]) best = i;
  return { bucket: best, value: MID[best], probs };
}

function ngram(hist, K = 8) {
  if (hist.length < K + 2) return null;
  const chrono = hist.slice().reverse().map(bucket);
  const target = chrono.slice(-K);
  const counts = [1, 1, 1, 1];
  for (let i = 0; i <= chrono.length - K - 1; i++) {
    let ok = true;
    for (let j = 0; j < K; j++) if (chrono[i + j] !== target[j]) { ok = false; break; }
    if (ok) counts[chrono[i + K]]++;
  }
  const tot = counts.reduce((a, b) => a + b, 0);
  const probs = counts.map(c => c / tot);
  let best = 0;
  for (let i = 1; i < 4; i++) if (probs[i] > probs[best]) best = i;
  return { bucket: best, value: MID[best], probs };
}

function freq(hist) {
  if (hist.length < 5) return null;
  const counts = [1, 1, 1, 1];
  hist.forEach(v => counts[bucket(v)]++);
  const tot = counts.reduce((a, b) => a + b, 0);
  const probs = counts.map(c => c / tot);
  let best = 0;
  for (let i = 1; i < 4; i++) if (probs[i] > probs[best]) best = i;
  return { bucket: best, value: MID[best], probs };
}

function solve(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-10) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const pv = M[c][c];
    for (let k = c; k <= n; k++) M[c][k] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map(r => r[n]);
}

function linreg(hist, W = 8) {
  if (hist.length < W + 5) return null;
  const chrono = hist.slice().reverse();
  const X = [], Y = [];
  for (let i = 0; i <= chrono.length - W - 1; i++) {
    X.push(chrono.slice(i, i + W));
    Y.push(chrono[i + W]);
  }
  const means = new Array(W).fill(0);
  X.forEach(r => r.forEach((v, j) => means[j] += v));
  means.forEach((_, j) => means[j] /= X.length);
  const A = Array.from({ length: W + 1 }, () => new Array(W + 1).fill(0));
  const b = new Array(W + 1).fill(0);
  X.forEach((row, k) => {
    const r = [1, ...row.map((v, j) => v - means[j])];
    for (let i = 0; i <= W; i++) {
      b[i] += r[i] * Y[k];
      for (let j = 0; j <= W; j++) A[i][j] += r[i] * r[j];
    }
  });
  for (let i = 1; i <= W; i++) A[i][i] += 0.1;
  const w = solve(A, b);
  if (!w) return null;
  const recent = chrono.slice(-W).map((v, j) => v - means[j]);
  let pred = w[0];
  for (let i = 0; i < W; i++) pred += w[i + 1] * recent[i];
  pred = Math.max(1, Math.min(1000, pred));
  const probs = [0, 0, 0, 0];
  probs[bucket(pred)] = 1;
  return { bucket: bucket(pred), value: pred, probs };
}

function predict(method, hist) {
  if (!hist.length) return null;
  if (method === 'markov') return markov(hist);
  if (method === 'ngram') return ngram(hist);
  if (method === 'linreg') return linreg(hist);
  return freq(hist);
}

// --- RENDER ---
function render(hist) {
  const bubbles = document.getElementById('bubbles');
  bubbles.innerHTML = hist.map(v =>
    `<span class="b ${CLS[bucket(v)]}">${fmt(v)}</span>`
  ).join('') || '<span style="color:#8b90a3;font-size:11px">No data scraped. Make sure you are on the Aviator tab.</span>';

  document.getElementById('rounds').textContent = hist.length;
  if (hist.length) {
    document.getElementById('mean').textContent = (hist.reduce((a, b) => a + b, 0) / hist.length).toFixed(2) + 'x';
    document.getElementById('max').textContent = fmt(Math.max(...hist));
  } else {
    document.getElementById('mean').textContent = '—';
    document.getElementById('max').textContent = '—';
  }

  const method = document.getElementById('method').value;
  const p = predict(method, hist);
  const predEl = document.getElementById('pred');
  const probsEl = document.getElementById('probs');

  if (!p) {
    predEl.querySelector('.big').textContent = '—';
    predEl.querySelector('.sub').textContent = 'Need more rounds';
    probsEl.innerHTML = '';
    return;
  }

  predEl.querySelector('.big').textContent = fmt(p.value);
  predEl.querySelector('.sub').textContent = `Bucket ${NAMES[p.bucket]} · top pick`;
  probsEl.innerHTML = NAMES.map((n, i) => {
    const top = i === p.bucket ? 'top' : '';
    return `<div class="prob ${top}"><div class="p">${(p.probs[i] * 100).toFixed(0)}%</div><div>${n}</div></div>`;
  }).join('');
}

// --- FETCH DATA ---
function fetchAndRender() {
  // Ask the active tab for its data directly
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    
    // Send message to the content script
    chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_HISTORY' }, (response) => {
      if (chrome.runtime.lastError) {
        // If it fails, it means the content script isn't running on this page yet
        render([]); // Show empty state
        document.getElementById('bubbles').innerHTML = '<span style="color:#ff5c5c;font-size:11px">Refresh the SportyBet page and try again.</span>';
        return;
      }
      if (response && response.history) {
        render(response.history);
      } else {
        render([]);
      }
    });
  });
}

// Run on load
document.addEventListener('DOMContentLoaded', fetchAndRender);
document.getElementById('method').addEventListener('change', fetchAndRender);
document.getElementById('refresh').addEventListener('click', fetchAndRender);
