// Reused from FD Prohlidka controls/pathfinding.ts (local engine 4b9ad14); TypeScript types removed only.
export function pathLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++)
        len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    return len;
}
/** Binární halda (f, index) s líným mazáním. */
class MinHeap {
    constructor() {
        this.f = [];
        this.v = [];
    }
    get size() {
        return this.f.length;
    }
    push(f, v) {
        let i = this.f.length;
        this.f.push(f);
        this.v.push(v);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.f[p] <= f)
                break;
            this.f[i] = this.f[p];
            this.v[i] = this.v[p];
            i = p;
        }
        this.f[i] = f;
        this.v[i] = v;
    }
    pop() {
        const top = this.v[0];
        const lf = this.f.pop();
        const lv = this.v.pop();
        const n = this.f.length;
        if (n > 0) {
            let i = 0;
            for (;;) {
                let c = i * 2 + 1;
                if (c >= n)
                    break;
                if (c + 1 < n && this.f[c + 1] < this.f[c])
                    c++;
                if (this.f[c] >= lf)
                    break;
                this.f[i] = this.f[c];
                this.v[i] = this.v[c];
                i = c;
            }
            this.f[i] = lf;
            this.v[i] = lv;
        }
        return top;
    }
}
const NEIGHBOURS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
];
/**
 * Hledání cesty. Nejdřív v okně kolem obdélníku start–cíl (rychlé). Když cesta v okně nevede (typicky objížďka přes
 * chodbu, která leží mimo obdélník: terasa → ložnice za zdí s oknem), zopakuje se hledání přes celé `bounds`
 * (bez `bounds` s oknem o 30 m širším) a vyhraje úplná cesta. Rozpočet `maxChecks` je společný pro oba pokusy.
 * Zadané `margin` se respektuje (volající okno výslovně omezil).
 */
export function findPath(q, start, goal, opts = {}) {
    const first = findPathWindow(q, start, goal, opts);
    if (first.complete || opts.margin !== undefined)
        return first;
    const maxChecks = opts.maxChecks ?? 40000;
    const used = first.checks ?? 0;
    if (used >= maxChecks)
        return first;
    const direct = Math.hypot(goal[0] - start[0], goal[1] - start[1]);
    const wide = opts.bounds ? Infinity : Math.max(30, direct * 3);
    // buňka zůstává 0,2 m (větší by mohla přeskočit tenkou zeď mezi dvěma volnými středy), proto víc buněk než u prvního pokusu
    const second = findPathWindow(q, start, goal, { ...opts, margin: wide, maxChecks: maxChecks - used, maxCells: Math.max(opts.maxCells ?? 9000, 150000) });
    const total = used + (second.checks ?? 0);
    // širší okno vždy ukáže aspoň tolik jako užší; při shodě zůstane výsledek z užšího okna (stabilní, rychlejší)
    const endGap = (r) => {
        const e = r.points[r.points.length - 1];
        return Math.hypot(goal[0] - e[0], goal[1] - e[1]);
    };
    const better = second.complete || endGap(second) < endGap(first) - 1e-6;
    return { ...(better ? second : first), checks: total };
}
function findPathWindow(q, start, goal, opts) {
    const [sx, sz] = start;
    const [gx, gz] = goal;
    const direct = Math.hypot(gx - sx, gz - sz);
    if (direct < 1e-6 || q.reach(sx, sz, gx, gz)) {
        return { points: [[sx, sz], [gx, gz]], complete: true, length: direct, expanded: 0, checks: 0 };
    }
    let checks = 0;
    const maxChecks = opts.maxChecks ?? 40000;
    const reach = (ax, az, bx, bz) => {
        checks++;
        return q.reach(ax, az, bx, bz);
    };
    // --- okno mřížky ---
    const margin = opts.margin ?? Math.max(3, direct * 0.6);
    let x0 = Math.min(sx, gx) - margin;
    let z0 = Math.min(sz, gz) - margin;
    let x1 = Math.max(sx, gx) + margin;
    let z1 = Math.max(sz, gz) + margin;
    const b = opts.bounds;
    if (b) {
        x0 = Math.max(x0, Math.min(b[0] - 0.3, sx, gx));
        z0 = Math.max(z0, Math.min(b[1] - 0.3, sz, gz));
        x1 = Math.min(x1, Math.max(b[2] + 0.3, sx, gx));
        z1 = Math.min(z1, Math.max(b[3] + 0.3, sz, gz));
    }
    let cell = opts.cell ?? 0.2;
    const maxCells = opts.maxCells ?? 9000;
    const cellsFor = (c) => (Math.floor((x1 - x0) / c) + 1) * (Math.floor((z1 - z0) / c) + 1);
    if (cellsFor(cell) > maxCells)
        cell *= Math.sqrt(cellsFor(cell) / maxCells);
    const nx = Math.floor((x1 - x0) / cell) + 1;
    const nz = Math.floor((z1 - z0) / cell) + 1;
    const total = nx * nz;
    const free = new Uint8Array(total); // 0 neznámé, 1 volné, 2 blokované
    const g = new Float32Array(total).fill(Infinity);
    const parent = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const cx = (i) => x0 + (i % nx) * cell;
    const cz = (i) => z0 + Math.floor(i / nx) * cell;
    const isFree = (i) => {
        let s = free[i];
        if (s === 0) {
            s = checks < maxChecks && reach(cx(i), cz(i), cx(i), cz(i)) ? 1 : 2;
            free[i] = s;
        }
        return s === 1;
    };
    const heap = new MinHeap();
    // --- zdroje: volné buňky v okolí startu, které start „vidí“ ---
    const seedR = Math.max(cell * 2.2, 0.45);
    const six = Math.round((sx - x0) / cell);
    const siz = Math.round((sz - z0) / cell);
    const seedSpan = Math.ceil(seedR / cell);
    for (let dz = -seedSpan; dz <= seedSpan; dz++) {
        for (let dx = -seedSpan; dx <= seedSpan; dx++) {
            const ix = six + dx;
            const iz = siz + dz;
            if (ix < 0 || iz < 0 || ix >= nx || iz >= nz)
                continue;
            const i = iz * nx + ix;
            const d = Math.hypot(cx(i) - sx, cz(i) - sz);
            if (d > seedR || !isFree(i) || !reach(sx, sz, cx(i), cz(i)))
                continue;
            if (d < g[i]) {
                g[i] = d;
                parent[i] = -2; // začátek cesty
                heap.push(d + Math.hypot(gx - cx(i), gz - cz(i)), i);
            }
        }
    }
    const goalRange = 3;
    let finish = -1;
    let best = -1;
    let bestD = Infinity;
    let expanded = 0;
    while (heap.size > 0) {
        const i = heap.pop();
        if (closed[i])
            continue;
        closed[i] = 1;
        expanded++;
        const px = cx(i);
        const pz = cz(i);
        const dGoal = Math.hypot(gx - px, gz - pz);
        if (dGoal < bestD - 1e-6) {
            bestD = dGoal;
            best = i;
        }
        if (dGoal <= goalRange && checks < maxChecks && reach(px, pz, gx, gz)) {
            finish = i;
            break;
        }
        const ix = i % nx;
        const iz = (i - ix) / nx;
        for (const [ox, oz] of NEIGHBOURS) {
            const jx = ix + ox;
            const jz = iz + oz;
            if (jx < 0 || jz < 0 || jx >= nx || jz >= nz)
                continue;
            const j = jz * nx + jx;
            if (closed[j])
                continue;
            if (ox !== 0 && oz !== 0) {
                // diagonála jen když jsou volné i obě ortogonální buňky (bez řezání rohů)
                if (!isFree(iz * nx + jx) || !isFree(jz * nx + ix))
                    continue;
            }
            if (!isFree(j))
                continue;
            const step = ox !== 0 && oz !== 0 ? cell * Math.SQRT2 : cell;
            const ng = g[i] + step;
            if (ng < g[j]) {
                g[j] = ng;
                parent[j] = i;
                heap.push(ng + Math.hypot(gx - cx(j), gz - cz(j)), j);
            }
        }
    }
    // --- výsledná lomená čára ---
    let endIdx = finish;
    let complete = finish >= 0;
    let exactGoal = complete;
    if (endIdx < 0) {
        endIdx = best;
        if (best < 0) {
            // start je uvězněn – zůstat na místě
            return { points: [[sx, sz]], complete: false, length: 0, expanded, checks };
        }
        complete = bestD <= (opts.snap ?? 0.6);
        exactGoal = false;
    }
    const cells = [];
    for (let i = endIdx; i >= 0; i = parent[i])
        cells.push([cx(i), cz(i)]);
    cells.reverse();
    const raw = [[sx, sz], ...cells];
    if (exactGoal)
        raw.push([gx, gz]);
    // string pulling: z každého bodu k nejvzdálenějšímu viditelnému
    const out = [raw[0]];
    let a = 0;
    const last = raw.length - 1;
    while (a < last) {
        let j = last;
        while (j > a + 1 && (checks >= maxChecks || !reach(raw[a][0], raw[a][1], raw[j][0], raw[j][1])))
            j--;
        out.push(raw[j]);
        a = j;
    }
    return { points: out, complete, length: pathLength(out), expanded, checks };
}
