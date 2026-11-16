import { Chess } from './assets/vendor/chess-v15.js';

const LEVELS = new Set(['easy', 'medium', 'hard']);
const normalizeLevel = level => LEVELS.has(level) ? level : 'medium';
const moveInfo = move => move ? { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) } : null;

export function createChessSession({ onChange = () => {}, workerFactory, initialFen } = {}) {
  const game = initialFen ? new Chess(initialFen) : new Chess();
  const makeWorker = workerFactory || (() => new Worker(new URL('./museum-chess-ai-v15.js', import.meta.url), { type: 'module' }));
  let level = 'medium', worker = null, sequence = 0, thinking = false, disposed = false, aiError = '';
  function state() {
    const mate = game.isCheckmate(), stale = game.isStalemate(), check = game.isCheck(), gameOver = game.isGameOver();
    const history = game.history();
    let status;
    if (mate) status = game.turn() === 'b' ? 'Mat. Vyhráli jste.' : 'Mat. Vyhrál počítač.';
    else if (stale) status = 'Pat. Partie skončila remízou.';
    else if (game.isThreefoldRepetition()) status = 'Remíza opakováním pozice.';
    else if (game.isInsufficientMaterial()) status = 'Remíza: nedostatek materiálu.';
    else if (game.isDrawByFiftyMoves()) status = 'Remíza podle pravidla 50 tahů.';
    else if (aiError) status = aiError;
    else if (thinking) status = 'Počítač přemýšlí…';
    else status = game.turn() === 'w' ? (check ? 'Šach. Jste na tahu.' : 'Jste na tahu. Hrajete bílými.') : (check ? 'Počítač je v šachu.' : 'Na tahu je počítač.');
    const last = game.history({ verbose: true }).at(-1);
    return { fen: game.fen(), board: game.board().flat().filter(Boolean).map(p => ({ square: p.square, type: p.type, color: p.color })), turn: game.turn(), thinking, history, status, gameOver, check, lastMove: moveInfo(last), level };
  }
  function emit() { if (!disposed) onChange(state()); }
  function stopWorker() {
    sequence++; thinking = false;
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); worker = null; }
  }
  function failAI() {
    stopWorker();
    aiError = 'Počítač nemohl dokončit tah. Vraťte tah, změňte obtížnost nebo začněte novou hru.';
    emit();
  }
  function beginAI() {
    if (disposed || thinking || game.turn() !== 'b' || game.isGameOver()) return;
    aiError = ''; const fen = game.fen(), id = ++sequence;
    try {
      const current = makeWorker(); worker = current; thinking = true;
      current.onmessage = event => {
        if (disposed || worker !== current || id !== sequence || event.data?.id !== id || game.fen() !== fen || !thinking) return;
        if (event.data?.error || !event.data?.move) { failAI(); return; }
        let result;
        try { result = game.move(event.data.move); } catch { failAI(); return; }
        if (!result) { failAI(); return; }
        stopWorker(); aiError = ''; emit();
      };
      current.onerror = event => { event?.preventDefault?.(); if (!disposed && worker === current && id === sequence) failAI(); };
      current.onmessageerror = () => { if (!disposed && worker === current && id === sequence) failAI(); };
      emit();
      // An onChange callback can reset/dispose the session synchronously.
      if (!disposed && worker === current && sequence === id && thinking) current.postMessage({ id, fen, level });
    } catch { if (!disposed && sequence === id) failAI(); }
  }
  function legalMoves(square) {
    if (disposed || thinking || game.turn() !== 'w' || game.isGameOver() || !/^[a-h][1-8]$/.test(square || '')) return [];
    return game.moves({ square, verbose: true }).map(m => ({ ...moveInfo(m), flags: m.flags, san: m.san }));
  }
  function move(from, to, promotion = 'q') {
    if (disposed || thinking || game.turn() !== 'w' || game.isGameOver() || !['q','r','b','n'].includes(promotion)) return false;
    let result; try { result = game.move({ from, to, promotion }); } catch { return false; }
    if (!result) return false;
    aiError = ''; const fen = game.fen(), epoch = sequence; emit();
    if (!disposed && game.fen() === fen && sequence === epoch) beginAI();
    return true;
  }
  function reset(nextLevel = 'medium') {
    if (disposed) return false; stopWorker(); game.reset(); level = normalizeLevel(nextLevel); aiError = ''; emit(); return true;
  }
  function setDifficulty(nextLevel) {
    if (disposed || !LEVELS.has(nextLevel)) return false;
    stopWorker(); level = nextLevel; aiError = ''; emit(); beginAI(); return true;
  }
  function undoTurn() {
    if (disposed || !game.history().length) return false;
    stopWorker(); aiError = '';
    game.undo();
    if (game.turn() === 'b' && game.history().length) game.undo();
    emit(); return true;
  }
  function dispose() { if (disposed) return; stopWorker(); disposed = true; }
  return { state, legalMoves, move, reset, setDifficulty, undoTurn, dispose };
}
