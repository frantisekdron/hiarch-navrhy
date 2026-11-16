import { Chess } from './assets/vendor/chess-v15.js';

export const CHESS_AI_PROFILES = Object.freeze({
  easy: Object.freeze({ maxDepth: 1, budgetMs: 65, variety: 3, quiescence: 0 }),
  medium: Object.freeze({ maxDepth: 2, budgetMs: 220, variety: 1, quiescence: 0 }),
  hard: Object.freeze({ maxDepth: 4, budgetMs: 900, variety: 1, quiescence: 2 })
});
const VALUE = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 20000 };
const MATE = 100000, TIMEOUT = Symbol('search deadline');
const keyOf = m => `${m.from}:${m.to}:${m.promotion || ''}`;
const squareOf = index => String.fromCharCode(97 + (index & 7)) + (8 - (index >> 4));
const publicMove = m => m ? { from: squareOf(m.from), to: squareOf(m.to), ...(m.promotion ? { promotion: m.promotion } : {}) } : null;

// This small search uses the pinned chess.js1.4.0 internal move representation
// to avoid SAN generation at every node. The rules still come solely from
// chess.js; session play uses its public move/undo API. Covered by pinned tests.
function evaluate(game) {
  let total = 0, bishopsW = 0, bishopsB = 0;
  for (let i = 0; i < 128; i++) {
    if (i & 0x88) { i += 7; continue; }
    const p = game._board[i]; if (!p) continue;
    const file = i & 7, rank = i >> 4, advance = p.color === 'w' ? 6 - rank : rank - 1;
    const center = 7 - Math.abs(file - 3.5) - Math.abs(rank - 3.5);
    let bonus = 0;
    if (p.type === 'p') bonus = advance * 9 + (3.5 - Math.abs(file - 3.5)) * 4;
    if (p.type === 'n') bonus = center * 13;
    if (p.type === 'b') { bonus = center * 7; p.color === 'w' ? bishopsW++ : bishopsB++; }
    if (p.type === 'r') bonus = advance === 6 ? 24 : 0;
    if (p.type === 'q') bonus = center * 3;
    if (p.type === 'k') bonus = (p.color === 'w' ? rank >= 6 : rank <= 1) && (file <= 2 || file >= 6) ? 38 : -center * 5;
    total += (VALUE[p.type] + bonus) * (p.color === 'w' ? 1 : -1);
  }
  total += (bishopsW >= 2 ? 25 : 0) - (bishopsB >= 2 ? 25 : 0);
  return total * (game.turn() === 'w' ? 1 : -1);
}
function moveOrder(m, best) {
  return (keyOf(m) === best ? 100000 : 0) + (m.captured ? 1000 + VALUE[m.captured] * 10 - VALUE[m.piece] : 0) + (m.promotion ? VALUE[m.promotion] * 10 : 0) + (m.flags & 96 ? 60 : 0);
}
function ordered(moves, best) { return moves.sort((a, b) => moveOrder(b, best) - moveOrder(a, best)); }

export function chooseChessMove(fen, level = 'medium', options = {}) {
  level = Object.hasOwn(CHESS_AI_PROFILES, level) ? level : 'medium';
  const profile = CHESS_AI_PROFILES[level], game = new Chess(fen);
  const now = options.now || (() => performance.now()), start = now();
  const budgetMs = Math.max(1, Math.min(1000, Number.isFinite(options.budgetMs) ? options.budgetMs : profile.budgetMs));
  const deadline = start + budgetMs, table = new Map(), path = new Map();
  let nodes = 0, cutoffs = 0, completedDepth = 0, timedOut = false, bestScore = 0;
  const rootMoves = ordered(game._moves());
  if (!rootMoves.length || game.isDrawByFiftyMoves() || game.isInsufficientMaterial()) {
    return { move: null, depth: 0, nodes: 0, score: !rootMoves.length && game.isCheck() ? -MATE : 0, level, targetDepth: profile.maxDepth, elapsedMs: now() - start, timedOut: false };
  }
  let chosen = rootMoves[0], candidates = [];
  function checkTime(force = false) { if ((force || (nodes & 31) === 0) && now() >= deadline) throw TIMEOUT; }
  function push(move) { game._makeMove(move); const key = game._hash; path.set(key, (path.get(key) || 0) + 1); }
  function pop() { const key = game._hash, count = path.get(key); if (count > 1) path.set(key, count - 1); else path.delete(key); game._undoMove(); }
  function drawn() { return game._halfMoves >= 100 || (path.get(game._hash) || 0) >= 3; }
  function quiet(alpha, beta, ply, remaining) {
    nodes++; checkTime();
    if (drawn()) return 0;
    const inCheck = game.isCheck(), moves = game._moves();
    if (!moves.length) return inCheck ? -MATE + ply : 0;
    const stand = evaluate(game);
    if (!inCheck) { if (stand >= beta) return stand; alpha = Math.max(alpha, stand); }
    if (remaining <= 0) return inCheck ? stand - 35 : alpha;
    for (const m of ordered(inCheck ? moves : moves.filter(m => m.captured || m.promotion))) {
      push(m); let value; try { value = -quiet(-beta, -alpha, ply + 1, remaining - 1); } finally { pop(); }
      if (value >= beta) { cutoffs++; return value; } alpha = Math.max(alpha, value);
    }
    return alpha;
  }
  function search(depth, alpha, beta, ply) {
    nodes++; checkTime();
    if (drawn()) return 0;
    if (depth === 0) {
      if (profile.quiescence) return quiet(alpha, beta, ply, profile.quiescence);
      const replies = game._moves();
      return !replies.length ? (game.isCheck() ? -MATE + ply : 0) : evaluate(game);
    }
    const ttKey = `${game._hash}:${game._halfMoves}`, cached = table.get(ttKey), alphaOriginal = alpha;
    if (cached?.depth >= depth) {
      if (cached.flag === 'exact') return cached.score;
      if (cached.flag === 'lower') alpha = Math.max(alpha, cached.score); else beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }
    const moves = ordered(game._moves(), cached?.best);
    if (!moves.length) return game.isCheck() ? -MATE + ply : 0;
    let value = -Infinity, best;
    for (const m of moves) {
      push(m); let score; try { score = -search(depth - 1, -beta, -alpha, ply + 1); } finally { pop(); }
      if (score > value) { value = score; best = keyOf(m); } alpha = Math.max(alpha, score);
      if (alpha >= beta) { cutoffs++; break; }
    }
    if (table.size < 16000) table.set(ttKey, { depth, score: value, best, flag: value <= alphaOriginal ? 'upper' : value >= beta ? 'lower' : 'exact' });
    return value;
  }
  path.set(game._hash, 1);
  for (let depth = 1; depth <= profile.maxDepth; depth++) {
    const scores = [], previousBest = keyOf(chosen); let alpha = -Infinity;
    try {
      for (const m of ordered(rootMoves, previousBest)) {
        checkTime(true); push(m); let score;
        // Easy scores every candidate exactly so its mild variety never chooses
        // a move merely sharing a fail-low alpha-beta bound.
        try { score = -search(depth - 1, -Infinity, profile.variety > 1 ? Infinity : -alpha, 1); } finally { pop(); }
        scores.push({ m, score }); alpha = Math.max(alpha, score);
      }
      scores.sort((a, b) => b.score - a.score); candidates = scores;
      chosen = scores[0].m; bestScore = scores[0].score; completedDepth = depth;
    } catch (error) { if (error !== TIMEOUT) throw error; timedOut = true; break; }
  }
  if (profile.variety > 1 && completedDepth > 0) {
    const close = candidates.filter(c => c.score >= bestScore - 55).slice(0, profile.variety);
    const random = options.random || Math.random;
    const index = Math.max(0, Math.min(close.length - 1, Math.floor(random() * close.length)));
    chosen = close[index].m; bestScore = close[index].score;
  }
  return { move: publicMove(chosen), depth: completedDepth, nodes, score: bestScore, level, targetDepth: profile.maxDepth, elapsedMs: now() - start, timedOut, cutoffs, candidates: candidates.length };
}

// Never run a search during main-thread module import.
if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
  globalThis.onmessage = event => {
    const { id, fen, level } = event.data || {};
    try { globalThis.postMessage({ id, ...chooseChessMove(fen, level) }); }
    catch (error) { globalThis.postMessage({ id, error: error?.message || 'Chess search failed' }); }
  };
}
