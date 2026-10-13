// ============================================================
//  The w-Y sequence Tree — 10 layers
//
//  Layer i (1..10) is unlocked by resetting at its requirement:
//    layer  1 : 10 points            = 10^^1
//    layer  2 : 10,000,000,000       = 10^^2
//    layer  3 : 10^^3
//    ...
//    layer 10 : F10                  = 10^^10
//  i.e. requirement(i) = tetrate(10, i), so the layers are spaced
//  evenly in slog (super-logarithm) space, exactly like the points
//  display is spaced between w-Y "1,1" and "1,3" (see mod.js).
//
//  Each layer has 13 upgrades (11-13, 21-25, 31-35) and, once its
//  own points reach e10 (1e10), passive generation: it gains 100%
//  of its reset gain per second (x5 with upgrade 34).
// ============================================================

function wyRequirement(i) { // i is 0-based: layer 1 -> index 0
    return Decimal.tetrate(10, i + 1)
}

// Passive generation turns on when a layer's own points reach e10.
const WY_PASSIVE_THRESHOLD = new Decimal("1e10")

// Auto-buy of every upgrade in a layer turns on (milestone 1) when
// that layer's own points reach ee10 (= 10^(1e10) = 1e10000000000).
const WY_AUTOBUY_THRESHOLD = new Decimal("ee10")


// ---------- Extremely overpowered upgrades: 87 more per layer ----------
// The upgrade grid renders ids as row*10+col, so 100 upgrades are laid
// out on a 12-row x 9-column grid (rows 1-11 full = 99, plus id 121).
// The first 13 slots are the hand-written upgrades below; the other 87
// are generated here. Each generated upgrade is numbered n = 14..100
// and cycles through 5 kinds (kind = (n-14) % 5):
//   kind 0: point gain x 10^(10n)          (up to x1e1000)
//   kind 1: this layer's gain x 10^(5n)    (up to x1e500)
//   kind 2: this layer's effect raised to ^1.25 (stacks multiplicatively)
//   kind 3: point gain x (this layer's points + 1)^n
//   kind 4: point gain x 10^(10^(n/10))    (up to x10^(10^10))
const WY_EXISTING_UPGRADE_IDS = [11,12,13,21,22,23,24,25,31,32,33,34,35]
const WY_OP_SPEC = {}
const WY_OP_SLOTS = []
for (let r = 1; r <= 11; r++) for (let c = 1; c <= 9; c++) WY_OP_SLOTS.push(r * 10 + c)
WY_OP_SLOTS.push(121)
{
    let k = 0
    for (let id of WY_OP_SLOTS) {
        if (WY_EXISTING_UPGRADE_IDS.includes(id)) continue
        WY_OP_SPEC[id] = { n: k + 14, kind: k % 5 }
        k++
    }
}

function wyOpUpgrades(i) {
    let u = {}
    for (let id of WY_OP_SLOTS) {
        let spec = WY_OP_SPEC[id]
        if (!spec) continue
        let n = spec.n, kind = spec.kind
        let desc =
            kind === 0 ? "Point gain is multiplied by 1e" + (10 * n) + "." :
            kind === 1 ? "Gain Y" + (i + 1) + " points multiplied by 1e" + (5 * n) + "." :
            kind === 2 ? "Raise this layer's point-gain effect to the ^1.25." :
            kind === 3 ? "Point gain is multiplied by (Y" + (i + 1) + " points + 1)^" + n + "." :
                         "Point gain is multiplied by 10^(10^" + (n / 10) + ")."
        u[id] = {
            title: "Y-omega-" + n + " [" + (i + 1) + "]",
            description: desc,
            cost: new Decimal(10).pow(5 + 2 * (n - 14)),
        }
    }
    return u
}

function wyOpGainMult(layer) {
    let mult = new Decimal(1)
    for (let id in WY_OP_SPEC) {
        let spec = WY_OP_SPEC[id]
        if (spec.kind === 1 && hasUpgrade(layer, Number(id)))
            mult = mult.times(new Decimal(10).pow(5 * spec.n))
    }
    return mult
}

function wyOpEffectPow(layer, eff) {
    for (let id in WY_OP_SPEC) {
        let spec = WY_OP_SPEC[id]
        if (spec.kind === 2 && hasUpgrade(layer, Number(id)))
            eff = eff.pow(1.25)
    }
    return eff
}

// Flat/feedback point-gain multiplier from the OP upgrades of one layer.
// Used by getPointGen() in mod.js.
function wyOpPointMult(layer) {
    let gain = new Decimal(1)
    for (let id in WY_OP_SPEC) {
        let spec = WY_OP_SPEC[id]
        if (!hasUpgrade(layer, Number(id))) continue
        if (spec.kind === 0) gain = gain.times(new Decimal(10).pow(10 * spec.n))
        else if (spec.kind === 3) gain = gain.times(player[layer].points.add(1).pow(spec.n))
        else if (spec.kind === 4) gain = gain.times(new Decimal(10).pow(new Decimal(10).pow(spec.n / 10)))
    }
    return gain
}


// ---------- 9,900 tetrational upgrades: n = 101..10000 per layer ----------
// Together with the 100 upgrades above that makes 10,000 per layer.
// Upgrade n multiplies point gain by tetrate(10, h(n)) where the
// tetration height grows only logarithmically:
//     h(n) = 1 + log10(n / 100)      (h = ~1 at n=101, h = 3 at n=10000)
// so each upgrade is tetrationally stronger than the previous ones,
// while the *rate* at which the height grows slows down.
// Ids are 1000 + n (1101..11000). Costs follow the same slowing
// tetrational curve: cost = 10^(10^(2 + (n-101)/4950)), i.e. their
// log10 goes from 1e2 up to 1e4.
function wyMegaHeight(n) { return 1 + Math.log10(n / 100) }

function wyMegaUpgrades(i) {
    let u = {}
    for (let n = 101; n <= 10000; n++) {
        u[1000 + n] = {
            title: "Y-tetra-" + n + " [" + (i + 1) + "]",
            description: "Point gain is multiplied by 10^^" + wyMegaHeight(n).toFixed(4) +
                " (tetrational upgrade #" + n + "; the tetration height grows as 1 + log10(n/100), slowing as n grows).",
            cost: new Decimal(10).pow(new Decimal(10).pow(2 + (n - 101) / 4950)),
        }
    }
    return u
}

// Aggregated point-gain multiplier from a layer's tetrational upgrades.
// Incremental cache: player[layer].upgrades only ever grows by appends
// between resets, so we only multiply in newly bought upgrades.
const _wyMegaCache = {}
function wyMegaPointMult(layer) {
    let ups = player[layer].upgrades
    let c = _wyMegaCache[layer]
    if (!c || ups.length < c.len) { c = _wyMegaCache[layer] = { len: 0, mult: new Decimal(1) } }
    while (c.len < ups.length) {
        let id = Number(ups[c.len]); c.len++
        if (id >= 1101 && id <= 11000)
            c.mult = c.mult.times(Decimal.tetrate(10, wyMegaHeight(id - 1000)))
    }
    return c.mult
}

const WY_LAYER_IDS = []
for (let i = 0; i < 10; i++) WY_LAYER_IDS.push("y" + (i + 1))

for (let idx = 0; idx < 10; idx++) {
    (function (i) {
        const id = "y" + (i + 1)
        addLayer(id, {
            name: "w-Y Layer " + (i + 1),
            symbol: "Y" + (i + 1),
            position: 0,
            startData() { return {
                unlocked: false,
                points: new Decimal(0),
                total: new Decimal(0),
            }},
            color: "hsl(" + (140 + i * 22) + ", 70%, 55%)",
            requires: wyRequirement(i),
            resource: "Y" + (i + 1) + " points",
            baseResource: "points",
            baseAmount() { return player.points },
            type: "normal",
            exponent: 0.5,
            branches: i < 9 ? ["y" + (i + 2)] : [],
            gainMult() {
                let mult = new Decimal(1)
                if (hasUpgrade(this.layer, 12)) mult = mult.times(5)
                if (hasUpgrade(this.layer, 21)) mult = mult.times(10)
                if (hasUpgrade(this.layer, 24)) mult = mult.times(25)
                if (hasUpgrade(this.layer, 32)) mult = mult.times(player[this.layer].points.add(1).pow(0.1))
                if (hasUpgrade(this.layer, 35)) mult = mult.times(100)
                return mult.times(wyOpGainMult(this.layer))
            },
            gainExp() {
                return new Decimal(1)
            },
            // Once this layer's own points reach e10, it passively
            // generates 100% of its reset gain per second (x5 with
            // upgrade 34). Shows as "You are gaining ... per second".
            passiveGeneration() {
                if (!player[this.layer].points.gte(WY_PASSIVE_THRESHOLD)) return 0
                return hasUpgrade(this.layer, 34) ? 5 : 1
            },
            // Auto-buy every upgrade in this layer, once milestone 1
            // (this layer's points reaching ee10) has been earned.
            autoUpgrade() {
                return hasMilestone(this.layer, 1)
            },
            milestones: {
                0: {
                    requirementDescription: "Reach e10 (1e10) Y" + (i + 1) + " points",
                    effectDescription: "Passive generation: gain 100% of your Y" + (i + 1) + " reset gain per second (x5 with the Y-passive upgrade).",
                    done() { return player[this.layer].points.gte(WY_PASSIVE_THRESHOLD) },
                },
                1: {
                    requirementDescription: "Reach ee10 (1e10000000000) Y" + (i + 1) + " points",
                    effectDescription: "Auto-buy: automatically buy every upgrade in the Y" + (i + 1) + " layer whenever you can afford it.",
                    done() { return player[this.layer].points.gte(WY_AUTOBUY_THRESHOLD) },
                },
            },
            // This layer multiplies point gain by (currency + 1) ^ 3^i,
            // so every new layer is tetrationally stronger than the last.
            effect() {
                let p = player[this.layer].points
                if (!p || p.lte(0)) return new Decimal(1)
                let eff = p.add(1).pow(Math.pow(3, i))
                if (hasUpgrade(this.layer, 11)) eff = eff.pow(2)
                if (hasUpgrade(this.layer, 23)) eff = eff.pow(1.5)
                if (hasUpgrade(this.layer, 31)) eff = eff.pow(2)
                return wyOpEffectPow(this.layer, eff)
            },
            effectDescription() {
                return "multiplying point gain by " + format(tmp[this.layer].effect)
            },
            upgrades: (() => { const u = {
                11: {
                    title: "Y-expansion [" + (i + 1) + "]",
                    description: "Square this layer's point-gain effect.",
                    cost: new Decimal(1),
                },
                12: {
                    title: "Y-recursion [" + (i + 1) + "]",
                    description: "Gain 5x more Y" + (i + 1) + " points.",
                    cost: new Decimal(5),
                },
                13: {
                    title: "Y-limit [" + (i + 1) + "]",
                    description: "Point gain is multiplied by 100.",
                    cost: new Decimal(25),
                },
                21: {
                    title: "Y-growth [" + (i + 1) + "]",
                    description: "Gain 10x more Y" + (i + 1) + " points.",
                    cost: new Decimal(50),
                },
                22: {
                    title: "Y-surge [" + (i + 1) + "]",
                    description: "Point gain is multiplied by 1,000.",
                    cost: new Decimal(100),
                },
                23: {
                    title: "Y-amplification [" + (i + 1) + "]",
                    description: "Raise this layer's point-gain effect to the ^1.5.",
                    cost: new Decimal(250),
                },
                24: {
                    title: "Y-overgrowth [" + (i + 1) + "]",
                    description: "Gain 25x more Y" + (i + 1) + " points.",
                    cost: new Decimal(500),
                },
                25: {
                    title: "Y-hypersurge [" + (i + 1) + "]",
                    description: "Point gain is multiplied by 100,000.",
                    cost: new Decimal(1000),
                },
                31: {
                    title: "Y-exponentiation [" + (i + 1) + "]",
                    description: "Square this layer's point-gain effect again.",
                    cost: new Decimal(2500),
                },
                32: {
                    title: "Y-selfgrowth [" + (i + 1) + "]",
                    description: "Gain Y" + (i + 1) + " points multiplied by (Y" + (i + 1) + " points + 1)^0.1.",
                    cost: new Decimal(5000),
                },
                33: {
                    title: "Y-feedback [" + (i + 1) + "]",
                    description: "Point gain is multiplied by your Y" + (i + 1) + " points + 1 on top of this layer's effect.",
                    cost: new Decimal(10000),
                },
                34: {
                    title: "Y-passive [" + (i + 1) + "]",
                    description: "Passive generation (once Y" + (i + 1) + " points reach e10) is 5x stronger.",
                    cost: new Decimal(25000),
                },
                35: {
                    title: "Y-climax [" + (i + 1) + "]",
                    description: "Point gain is multiplied by 1e10, and gain 100x more Y" + (i + 1) + " points.",
                    cost: new Decimal(50000),
                },
            }; Object.assign(u, wyOpUpgrades(i)); Object.assign(u, wyMegaUpgrades(i)); u.rows = 12; u.cols = 9; return u })(),
            row: i, // one layer per row: a vertical chain y1 -> y2 -> ... -> y10
            hotkeys: [
                {key: String((i + 1) % 10), description: ((i + 1) % 10) + ": Reset for Y" + (i + 1) + " points", onPress() { if (canReset(this.layer)) doReset(this.layer) }},
            ],
            layerShown() { return true },
        })
    })(idx)
}

// ============================================================
//  Side layer: Dev
//  Type a value for player.points (e.g. 10, 1e100, ee100, 10^^10,
//  or even F10 written as 10^^10), click "Set player.points", and
//  watch the w-Y sequence, the get_time value and how long (at your
//  current point gain) each landmark sequence is away.
// ============================================================

function wyNextTarget(points) {
    for (let k = 1; k <= 10; k++) {
        let target = Decimal.tetrate(10, k)
        if (points.lt(target)) return { k: k, target: target }
    }
    return null
}

function devInfoText() {
    let gen = getPointGen()
    let next = wyNextTarget(player.points)
    let lines = "Current points: " + format(player.points) + " (" + player.points.toString() + ")<br>" +
        "Current w-Y sequence: <b>" + wySequenceFromPoints(player.points) + "</b><br>" +
        "get_time(points) = " + get_time(wyTimeFromPoints(player.points)).toFixed(6) + " / 4<br>" +
        "Point gain: " + format(gen) + "/sec<br><br>"
    if (next) {
        let needed = next.target.sub(player.points)
        let eta = gen.gt(0) ? needed.div(gen) : new Decimal(Infinity)
        lines += "Next landmark: 10^^" + next.k + " = " + format(next.target) + " points<br>" +
            "Points still needed: " + format(needed) + "<br>" +
            "Estimated time at current gain: " + (eta.isFinite() ? format(eta) + " seconds" : "never (no point gain)")
    } else {
        lines += "You are at or beyond F10 (10^^10): the w-Y display is at its end, 1,3."
    }
    return lines
}

let _landmarkSeqCache = {}
function devLandmarksText() {
    let lines = "<b>Landmark sequences</b> (points needed for each tetration height):<br>"
    for (let k = 1; k <= 10; k++) {
        let value = 2 + 2 * (k - 1) / 9
        if (!_landmarkSeqCache[k]) { try { _landmarkSeqCache[k] = num_to_lngi(value)[0] } catch (e) { _landmarkSeqCache[k] = "?" } }
        let target = Decimal.tetrate(10, k)
        let reached = player.points.gte(target)
        lines += (reached ? "[REACHED] " : "[       ] ") + "10^^" + k + " (" + format(target) + " points, get_time = " +
            value.toFixed(4) + ") -&gt; w-Y <b>" + _landmarkSeqCache[k] + "</b><br>"
    }
    return lines
}

addLayer("dev", {
    name: "Dev",
    symbol: "DEV",
    position: 0,
    startData() { return {
        unlocked: true,
        points: new Decimal(0),
        devInput: "10",
    }},
    color: "#ff4444",
    resource: "dev tools",
    row: "side",
    type: "none",
    tooltip: "Dev layer: set player.points and preview w-Y sequences",
    tabFormat: [
        ["display-text", "<h3>Dev Layer</h3>Type a value for player.points below.<br>Examples: 10, 1e100, 1e1000, ee100, 10^^5, 10^^10 (= F10)."],
        "blank",
        ["text-input", "devInput"],
        "blank",
        "clickables",
        "blank",
        ["display-text", function() { return devInfoText() }],
        "blank",
        ["display-text", function() { return devLandmarksText() }],
    ],
    clickables: {
        11: {
            title: "Set player.points",
            display() { return "Set your main points to the value typed above." },
            canClick() { return true },
            onClick() {
                try { player.points = new Decimal(player.dev.devInput.toString()) } catch (e) { /* invalid input: ignore */ }
            },
        },
        12: {
            title: "Jump to next landmark",
            display() { return "Set points to the next 10^^k landmark." },
            canClick() { return true },
            onClick() {
                let next = wyNextTarget(player.points)
                if (next) player.points = next.target
            },
        },
        13: {
            title: "Set to F10",
            display() { return "Set points to F10 = 10^^10 (w-Y 1,3, Layer 10 requirement)." },
            canClick() { return true },
            onClick() { player.points = Decimal.tetrate(10, 10) },
        },
        14: {
            title: "Reset points to 10",
            display() { return "Set points back to the starting value." },
            canClick() { return true },
            onClick() { player.points = new Decimal(10) },
        },
    },
    layerShown() { return true },
})

// ============================================================
//  Side layer: Notations
//  Shows your current points / w-Y sequence converted into the
//  other notations provided by conv.js (BMS, DBMS, PMS, AMS, 0Y,
//  Vulcaniz, cOCF, EcOCF), plus ordinary number notations.
// ============================================================

let _notationCacheKey = null
let _notationCacheText = ""

function notationsText() {
    let seq = wySequenceFromPoints(player.points)
    let key = seq + "|" + player.points.toString()
    if (key === _notationCacheKey) return _notationCacheText

    let lines = []
    lines.push("<b>w-Y sequence</b>: " + seq)
    lines.push("<b>Ordinary (TMT format)</b>: " + format(player.points))
    lines.push("<b>Ordinary (whole)</b>: " + formatWhole(player.points))
    lines.push("<b>break_eternity raw</b>: " + player.points.toString())
    lines.push("<b>log10(points)</b>: " + (player.points.gt(0) ? format(player.points.log10()) : "-Infinity"))
    lines.push("<b>slog10(points)</b>: " + format(player.points.max(1).slog(10)) + " &nbsp;(1 at 10 points, 10 at F10)")
    lines.push("<b>get_time(points)</b>: " + get_time(wyTimeFromPoints(player.points)).toFixed(6) + " / 4")

    // Conversions from conv.js act on the w-Y sequence (first 10 terms).
    let terms = seq.split(",").map(Number)
    let seqTrim = terms.slice(0, 10).join(",")
    let convertible = terms.slice(0, 10).every(x => x <= 512) && typeof Y_Sequence !== "undefined" &&
        Y_Sequence.cmp(seqTrim, "1,2,4,8,16,32,64,128,256,512") < 0
    if (seq === "1,3") {
        lines.push("<b>BMS / PMS / AMS / 0Y / Vulcaniz</b>: Lim(BMS) — 1,3 is the limit of BMS in w-Y")
    } else if (!convertible) {
        lines.push("<b>BMS family (BMS, DBMS, PMS, AMS, 0Y, Vulcaniz, cOCF, EcOCF)</b>: sequence terms too large for the converters in conv.js (they need the first 10 terms &le; 512)")
    } else {
        let conv = (label, fn) => { try { lines.push("<b>" + label + "</b>: " + fn()) } catch (e) { lines.push("<b>" + label + "</b>: (conversion failed: " + e.message + ")") } }
        let bmsMatrix = null
        conv("BMS", () => { bmsMatrix = Conv_Y_sequence_BMS(seqTrim); return bmsMatrix.map(p => "(" + p.join(",") + ")").join("") })
        conv("DBMS", () => Y_to_DBMS(seqTrim.split(",")).map(p => "(" + p.join(",") + ")").join(""))
        let needsBMS = (label, fn) => { if (!bmsMatrix) lines.push("<b>" + label + "</b>: (needs the BMS conversion above)"); else conv(label, fn) }
        needsBMS("PMS", () => BMStoPMS(bmsMatrix).map(p => "(" + p.join(",") + ")").join(""))
        needsBMS("AMS", () => PMStoAMS(BMStoPMS(bmsMatrix)).map(p => "(" + p.join(",") + ")").join(""))
        needsBMS("0Y", () => AMSto0Y(PMStoAMS(BMStoPMS(bmsMatrix))).join(","))
        needsBMS("Vulcaniz", () => PMStoVZ(BMStoPMS(bmsMatrix)))
        if (bmsMatrix && Y_Sequence.cmp(seqTrim, "1,2,4,8,16,26") < 0)
            conv("cOCF", () => cOCF.convert(Conv_BMS_cOCF(bmsMatrix.slice(0, 10))))
        if (bmsMatrix && Y_Sequence.cmp(seqTrim, "1,2,4,8,16,31") < 0)
            conv("EcOCF", () => EcOCF.convert(Conv_BMS_EcOCF(bmsMatrix.slice(0, 10))))
    }

    let text = lines.join("<br>")
    _notationCacheKey = key
    _notationCacheText = text
    return text
}

addLayer("nt", {
    name: "Notations",
    symbol: "N",
    position: 1,
    startData() { return {
        unlocked: true,
        points: new Decimal(0),
    }},
    color: "#44aaff",
    resource: "notations",
    row: "side",
    type: "none",
    tooltip: "Notations: your points in every notation from conv.js",
    tabFormat: [
        ["display-text", "<h3>Notations</h3>Your current points, shown in the w-Y sequence and converted into the other notations from conv.js (conversions use the first 10 terms of the sequence)."],
        "blank",
        ["display-text", function() { return notationsText() }],
    ],
    layerShown() { return true },
})
