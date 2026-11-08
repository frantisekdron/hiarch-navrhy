// Reused from FD Prohlidka input/touchLook.ts (local engine 4b9ad14); TypeScript types removed only.
/**
 * Dotykové rozhlížení: zrychlení podle rychlosti prstu, vyhlazení a dojezd po švihnutí.
 * Čistá logika bez DOM a bez three (testuje se přímo). Vlastník: dělník U2.
 *
 * Tok dat (spec kap. 5.1):
 *  1. TouchControls při každém pohybu prstu zavolá `push(dxIntent, dyIntent, tMs)` – záměr pohledu je záporný posun prstu
 *     (jako dnes u lookDX/lookDY). Rychlost prstu se průměruje exponenciálně (τ 50 ms) a záměr se násobí `accelFactor(v)`
 *     (1 pod 400 px/s, 1,30 při 1000 px/s, 1,60 od 1600 px/s); výsledek se přičte do `pending`.
 *  2. `sample(dt, reduced)` ze `pending` každý snímek vydá podíl α = 1 − e^(−30·dt) (63 % za 33 ms, 95 % za 100 ms; součet se
 *     zachová přesně, nezávisle na délce snímků).
 *  3. Při puštění jediného prstu rozhlížení `release(tMs, false)` odhadne rychlost metodou nejmenších čtverců ze záměrů za
 *     posledních 100 ms (aspoň 3 vzorky). Od 150 px/s a při posledním pohybu ne starším než 50 ms vznikne dojezd s počáteční
 *     rychlostí v0 = v · a(v), nejvýš 4000 px/s; útlum vodorovně λ 6 s⁻¹, svisle λ 12 s⁻¹, integrace přesná
 *     (`out += v·(1−e^(−λdt))/λ; v *= e^(−λdt)`), konec pod 20 px/s. Příklad: 1500 px/s → v0 2382 → asi +397 px za 0,8 s.
 *  4. Každý nový dotek volá `stop()` (vynuluje `pending` i dojezd, vrátí, zda dojezd běžel); puštění ťuknutí (`wasTap`)
 *     vynuluje `pending` a dojezd nezačne.
 *  5. `reduced` (Omezit pohyb): bez vyhlazení (vše hned) a bez dojezdu; zrychlení zůstává.
 *
 * 6. Dojezd ve stupních roste s nižším oknem (zisk rozhlížení je 2·tan(vfov/2)/výška), takže stejný švih otočil na šířku telefonu pohled skoro
 *    dozadu. Proto TouchControls předává výšku okna a dráha dojezdu je omezena na INERTIA_MAX_TRAVEL_H · výška px (≈ 44° při FOV 70°,
 *    v každém okně stejně; pro okno 812 px je strop 447 px). Příklad z bodu 3 (1500 px/s → +397 px) je pod stropem, takže platí; bez
 *    výšky (`release` volaný bez čtvrtého parametru, testy čisté logiky) se dráha neomezuje.
 *    Při ŠIRŠÍM zorném poli než 70° (na výšku telefonu 83,8°, po pinchi ven až 110°) je jeden px víc stupňů (zisk 2·tan(vfov/2)/výška), takže
 *    by tentýž strop v px otočil pohled víc (375×812: 56° místo 44°, švih 300 px / 150 ms dal 79° místo 62°, kritérium K22 chce 30–70°). TouchControls
 *    proto předává i `travelScale` = tan(35°) / tan(vfov/2) (nejvýš 1) a strop se jím násobí: ve stupních je tedy dojezd nejvýš ≈ 44° při jakémkoli
 *    širším poli; při užším poli (po pinchi dovnitř) zůstává strop v px beze změny.
 *
 * Výstup `sample()` je pořád táž instance {dx, dy} (bez alokace) – volající si ji nesmí ponechat.
 */
/** Rychlost vyhlazování (1/s): α = 1 − e^(−λ·dt). */
export const LOOK_LAMBDA = 30;
/** Útlum dojezdu vodorovně / svisle (1/s). */
export const INERTIA_LAMBDA_X = 6;
export const INERTIA_LAMBDA_Y = 12;
/** Časová konstanta exponenciálního průměru rychlosti prstu (s). */
export const VELOCITY_TAU_S = 0.05;
/** Zrychlení: a(v) = 1 + ACCEL_GAIN · smoothstep(ACCEL_V_LO, ACCEL_V_HI, v). */
export const ACCEL_V_LO = 400;
export const ACCEL_V_HI = 1600;
export const ACCEL_GAIN = 0.6;
/** Odhad rychlosti při puštění: okno (ms) a nejmenší počet vzorků. */
export const LSQ_WINDOW_MS = 100;
export const LSQ_MIN_SAMPLES = 3;
/** Dojezd vznikne od této rychlosti prstu (px/s) a když poslední pohyb není starší než INERTIA_MAX_AGE_MS. */
export const INERTIA_MIN_SPEED = 150;
export const INERTIA_MAX_AGE_MS = 50;
/** Strop počáteční rychlosti dojezdu (px/s) a rychlost, pod kterou dojezd končí. */
export const INERTIA_MAX_SPEED = 4000;
export const INERTIA_END_SPEED = 20;
/**
 * Strop dráhy dojezdu jako násobek výšky okna: 0,55 · výška ≈ 44° při svislém FOV 70° (zisk 2·tan(35°)/H rad/px), tedy v každém okně stejný úhel.
 * Při širším poli se strop zkrátí o `travelScale` (viz bod 6), takže je to ≈ 44° i na výšku telefonu (83,8°).
 */
export const INERTIA_MAX_TRAVEL_H = 0.55;
/** Nejmenší `travelScale` (nejširší pole 110° dává tan(35°)/tan(55°) = 0,49); chrání před nesmyslnou hodnotou. */
export const INERTIA_MIN_TRAVEL_SCALE = 0.25;
/** Nejdelší krok vyhlazení (s): po pauze (karta na pozadí) se zbytek nevyhodí jedním skokem. */
export const MAX_SAMPLE_DT = 0.1;
const SAMPLE_CAPACITY = 32;
const PENDING_EPS = 0.005;
function smoothstep(lo, hi, v) {
    const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
}
/** Zrychlení podle rychlosti prstu v px/s: 1 pod 400, 1,30 při 1000, 1,60 od 1600. */
export function accelFactor(v) {
    return 1 + ACCEL_GAIN * smoothstep(ACCEL_V_LO, ACCEL_V_HI, Math.abs(v));
}
/**
 * Rychlost (px/s, po osách) metodou nejmenších čtverců ze vzorků (čas ms, kumulativní px) za posledních `windowMs` před
 * posledním vzorkem. Méně než 3 vzorky (nebo nulový časový rozptyl) → null. Vzorky musí být řazené podle času.
 */
export function lsqVelocity(samples, windowMs = LSQ_WINDOW_MS, out = { x: 0, y: 0 }) {
    const n = samples.length;
    if (n < LSQ_MIN_SAMPLES)
        return null;
    const tEnd = samples[n - 1].t;
    let first = n - 1;
    while (first > 0 && tEnd - samples[first - 1].t <= windowMs)
        first--;
    const count = n - first;
    if (count < LSQ_MIN_SAMPLES)
        return null;
    let mt = 0;
    let mx = 0;
    let my = 0;
    for (let i = first; i < n; i++) {
        const s = samples[i];
        mt += s.t - tEnd;
        mx += s.x;
        my += s.y;
    }
    mt /= count;
    mx /= count;
    my /= count;
    let stt = 0;
    let stx = 0;
    let sty = 0;
    for (let i = first; i < n; i++) {
        const s = samples[i];
        const dt = s.t - tEnd - mt;
        stt += dt * dt;
        stx += dt * (s.x - mx);
        sty += dt * (s.y - my);
    }
    if (stt < 1e-9)
        return null;
    out.x = (stx / stt) * 1000;
    out.y = (sty / stt) * 1000;
    return out;
}
export class LookSmoother {
    constructor() {
        this.pendX = 0;
        this.pendY = 0;
        /** Exponenciální průměr rychlosti prstu (px/s, záměr). */
        this.emaX = 0;
        this.emaY = 0;
        this.lastT = Number.NaN;
        this.cumX = 0;
        this.cumY = 0;
        this.samples = [];
        this.inX = 0;
        this.inY = 0;
        this.vel = { x: 0, y: 0 };
        this.result = { dx: 0, dy: 0 };
    }
    /** Přidá záměr pohledu (px; + = doprava / dolů) z jedné události pohybu prstu v čase `tMs`. */
    push(dxIntent, dyIntent, tMs) {
        if (Number.isFinite(this.lastT)) {
            const dt = (tMs - this.lastT) / 1000;
            if (dt < 0) {
                // čas se vrátil (jiný zdroj časových značek): průměr rychlosti začíná znovu
                this.emaX = 0;
                this.emaY = 0;
            }
            else if (dt >= 0.001) {
                const a = 1 - Math.exp(-dt / VELOCITY_TAU_S);
                this.emaX += (dxIntent / dt - this.emaX) * a;
                this.emaY += (dyIntent / dt - this.emaY) * a;
            }
        }
        this.lastT = tMs;
        const k = accelFactor(Math.hypot(this.emaX, this.emaY));
        this.pendX += dxIntent * k;
        this.pendY += dyIntent * k;
        this.cumX += dxIntent;
        this.cumY += dyIntent;
        let s;
        if (this.samples.length >= SAMPLE_CAPACITY) {
            s = this.samples.shift();
        }
        else {
            s = { t: 0, x: 0, y: 0 };
        }
        s.t = tMs;
        s.x = this.cumX;
        s.y = this.cumY;
        this.samples.push(s);
    }
    /**
     * Puštění prstu. `wasTap` = z prstu vznikne ťuknutí (nebo ho systém zrušil): `pending` se vynuluje a dojezd nezačne.
     * `reduced` (Omezit pohyb) dojezd také nezačne. `heightPx` = výška okna: dráha dojezdu je nejvýš INERTIA_MAX_TRAVEL_H · heightPx · travelScale px.
     * `travelScale` (0,25–1, výchozí 1) zkracuje strop při zorném poli širším než 70°, ať stejný švih neotočí pohled víc než při 70°.
     */
    release(tMs, wasTap, reduced = false, heightPx = Infinity, travelScale = 1) {
        if (wasTap) {
            this.pendX = 0;
            this.pendY = 0;
            this.inX = 0;
            this.inY = 0;
        }
        else if (!reduced && Number.isFinite(this.lastT) && tMs - this.lastT <= INERTIA_MAX_AGE_MS) {
            const v = lsqVelocity(this.samples, LSQ_WINDOW_MS, this.vel);
            if (v) {
                const speed = Math.hypot(v.x, v.y);
                if (speed >= INERTIA_MIN_SPEED) {
                    const v0 = Math.min(speed * accelFactor(speed), INERTIA_MAX_SPEED);
                    this.inX = (v.x / speed) * v0;
                    this.inY = (v.y / speed) * v0;
                    // dráha dojezdu nejvýš INERTIA_MAX_TRAVEL_H · výška okna (v nízkém okně by stejný švih otočil pohled skoro dozadu)
                    const travel = Math.max(Math.abs(this.inX) / INERTIA_LAMBDA_X, Math.abs(this.inY) / INERTIA_LAMBDA_Y);
                    const scale = Number.isFinite(travelScale) ? Math.min(1, Math.max(INERTIA_MIN_TRAVEL_SCALE, travelScale)) : 1;
                    const cap = INERTIA_MAX_TRAVEL_H * Math.max(1, heightPx) * scale;
                    if (travel > cap) {
                        this.inX *= cap / travel;
                        this.inY *= cap / travel;
                    }
                }
            }
        }
        this.resetGesture();
    }
    /** Nový dotek / reset: vynuluje `pending` i dojezd. Vrací, zda dojezd běžel (≥ 20 px/s). */
    stop() {
        const was = Math.hypot(this.inX, this.inY) >= INERTIA_END_SPEED;
        this.pendX = 0;
        this.pendY = 0;
        this.inX = 0;
        this.inY = 0;
        this.resetGesture();
        return was;
    }
    /** Běží vyhlazování nebo dojezd (zbývá něco vydat). */
    get active() {
        return Math.abs(this.pendX) > PENDING_EPS || Math.abs(this.pendY) > PENDING_EPS || this.inX !== 0 || this.inY !== 0;
    }
    /** Běží dojezd? */
    get coasting() {
        return this.inX !== 0 || this.inY !== 0;
    }
    /** Rychlost dojezdu (px/s, velikost) – 0, když dojezd neběží. */
    get inertiaSpeed() {
        return Math.hypot(this.inX, this.inY);
    }
    /** Zbývá vyhladit (px) – jen pro testy a ladění. */
    get pending() {
        return { x: this.pendX, y: this.pendY };
    }
    /** Kolik px pohledu se má v tomto snímku přičíst. Vrací vždy tutéž instanci. */
    sample(dt, reduced) {
        const out = this.result;
        const step = Math.min(Math.max(dt, 0), MAX_SAMPLE_DT);
        if (reduced) {
            out.dx = this.pendX;
            out.dy = this.pendY;
            this.pendX = 0;
            this.pendY = 0;
            this.inX = 0;
            this.inY = 0;
            return out;
        }
        let ox = 0;
        let oy = 0;
        if (this.pendX !== 0 || this.pendY !== 0) {
            const a = 1 - Math.exp(-LOOK_LAMBDA * step);
            const tx = this.pendX * a;
            const ty = this.pendY * a;
            this.pendX -= tx;
            this.pendY -= ty;
            ox = tx;
            oy = ty;
            if (Math.abs(this.pendX) < PENDING_EPS && Math.abs(this.pendY) < PENDING_EPS) {
                ox += this.pendX;
                oy += this.pendY;
                this.pendX = 0;
                this.pendY = 0;
            }
        }
        if (this.inX !== 0 || this.inY !== 0) {
            const ex = Math.exp(-INERTIA_LAMBDA_X * step);
            const ey = Math.exp(-INERTIA_LAMBDA_Y * step);
            ox += (this.inX * (1 - ex)) / INERTIA_LAMBDA_X;
            oy += (this.inY * (1 - ey)) / INERTIA_LAMBDA_Y;
            this.inX *= ex;
            this.inY *= ey;
            if (Math.hypot(this.inX, this.inY) < INERTIA_END_SPEED) {
                this.inX = 0;
                this.inY = 0;
            }
        }
        out.dx = ox;
        out.dy = oy;
        return out;
    }
    resetGesture() {
        this.emaX = 0;
        this.emaY = 0;
        this.lastT = Number.NaN;
        this.cumX = 0;
        this.cumY = 0;
        this.samples.length = 0;
    }
}
