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

// ============================================================

function wyRequirement(i) { // i is 0-based: layer 1 -> index 0
    return Decimal.tetrate(10, i + 1)
}

// Passive generation turns on when a layer's own points reach e10.
const WY_PASSIVE_THRESHOLD = new Decimal("1e10")



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
            gainMult() { // Nothing multiplies anything anymore.
                return new Decimal(1)
            },
            gainExp() {
                return new Decimal(1)
            },
            // Once this layer's own points reach e10, it passively
            // generates 100% of its reset gain per second (x5 with
            // upgrade 34). Shows as "You are gaining ... per second".
            passiveGeneration() {
                if (!player[this.layer].points.gte(WY_PASSIVE_THRESHOLD)) return 0
                return 1
            },
            milestones: {
                0: {
                    requirementDescription: "Reach e10 (1e10) Y" + (i + 1) + " points",
                    effectDescription: "Passive generation: gain 100% of your Y" + (i + 1) + " reset gain per second (x5 with the Y-passive upgrade).",
                    done() { return player[this.layer].points.gte(WY_PASSIVE_THRESHOLD) },
                },
            },
            row: i, // one layer per row: a vertical chain y1 -> y2 -> ... -> y10
            hotkeys: [
                {key: String((i + 1) % 10), description: ((i + 1) % 10) + ": Reset for Y" + (i + 1) + " points", onPress() { if (canReset(this.layer)) doReset(this.layer) }},
            ],
            layerShown() { return true },
        })
    })(idx)
}


// ============================================================
//  w-Y sequence -> points (the inverse of the display in mod.js)
//
//  wyPointsFromSequence("1,2,4") finds the get_time result whose
//  num_to_lngi() sequence is the typed one (binary search, since the
//  sequence grows monotonically from 1,1 at result=2 to 1,3 at
//  result=4 in the Y_Sequence order), then inverts the display
//  formula:  slog(points) = 1 + 9 * (result - 2) / 2, i.e.
//  points = tetrate(10, that). Not every sequence lies exactly on
//  the 1,1 -> 1,3 path; in that case we land on the first sequence
//  above the typed one and say so.
// ============================================================

function wySequenceAtResult(result) { return num_to_lngi(result)[0] }

function wyPointsFromResult(result) {
    return Decimal.tetrate(10, 1 + 9 * (result - 2) / 2)
}

function goToWySequence(raw) {
    let nums = raw.toString().split(",").map(x => x.trim()).filter(x => x.length).map(Number)
    if (!nums.length || nums.some(x => !Number.isInteger(x) || x < 1))
        return "Invalid sequence: type comma-separated positive integers, e.g. 1,2,4"
    let target = nums.join(",")
    if (Y_Sequence.cmp(target, "1,1") <= 0) {
        player.points = new Decimal(10)
        return target === "1,1" ? "Went to 1,1 (points set to 10)." :
            "The display starts at 1,1, so went there instead (points set to 10); " + target + " is below the starting sequence."
    }
    if (Y_Sequence.cmp(target, "1,3") >= 0) {
        player.points = Decimal.tetrate(10, 10)
        return target === "1,3" ? "Went to 1,3 (points set to F10 = 10^^10)." :
            "The display ends at 1,3, so went there instead (points set to F10 = 10^^10); " + target + " is beyond the final sequence."
    }
    let lo = 2, hi = 4, exact = false
    for (let iter = 0; iter < 80; iter++) {
        let mid = (lo + hi) / 2
        let c = Y_Sequence.cmp(wySequenceAtResult(mid), target)
        if (c === 0) { lo = hi = mid; exact = true; break }
        if (c < 0) lo = mid; else hi = mid
    }
    let result = exact ? lo : hi
    if (!exact && Y_Sequence.cmp(wySequenceAtResult(result), target) === 0) exact = true
    player.points = wyPointsFromResult(result)
    let landed = wySequenceFromPoints(player.points)
    if (exact || landed === target)
        return "Went to " + target + " (points set to " + format(player.points) + ", get_time = " + result.toFixed(6) + ")."
    return target + " is not exactly on the 1,1 -> 1,3 path, so went to the first sequence above it: " + landed +
        " (points set to " + format(player.points) + ", get_time = " + result.toFixed(6) + ")."
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
        seqInput: "1,2",
        seqStatus: "",
    }},
    color: "#44aaff",
    resource: "notations",
    row: "side",
    type: "none",
    tooltip: "Notations: your points in every notation from conv.js",
    tabFormat: [
        ["display-text", "<h3>Notations</h3>Your current points, shown in the w-Y sequence and converted into the other notations from conv.js (conversions use the first 10 terms of the sequence)."],
        "blank",
        ["display-text", "<h3>Go to a w-Y sequence</h3>Type a sequence (e.g. 1,1, 1,2, 1,2,4, 1,3) and click the button: your points are set automatically to the value whose display is that sequence."],
        ["text-input", "seqInput"],
        "blank",
        "clickables",
        ["display-text", function() { return player.nt.seqStatus || "" }],
        "blank",
        ["display-text", function() { return notationsText() }],
    ],
    clickables: {
        11: {
            title: "Go to this sequence",
            display() { return "Set player.points so the w-Y display becomes the sequence typed above." },
            canClick() { return true },
            onClick() { player.nt.seqStatus = goToWySequence(player.nt.seqInput) },
        },
    },
    layerShown() { return true },
})
