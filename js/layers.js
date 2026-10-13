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
                return mult
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
            milestones: {
                0: {
                    requirementDescription: "Reach e10 (1e10) Y" + (i + 1) + " points",
                    effectDescription: "Passive generation: gain 100% of your Y" + (i + 1) + " reset gain per second (x5 with the Y-passive upgrade).",
                    done() { return player[this.layer].points.gte(WY_PASSIVE_THRESHOLD) },
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
                return eff
            },
            effectDescription() {
                return "multiplying point gain by " + format(tmp[this.layer].effect)
            },
            upgrades: {
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
            },
            row: i, // one layer per row: a vertical chain y1 -> y2 -> ... -> y10
            hotkeys: [
                {key: String((i + 1) % 10), description: ((i + 1) % 10) + ": Reset for Y" + (i + 1) + " points", onPress() { if (canReset(this.layer)) doReset(this.layer) }},
            ],
            layerShown() { return true },
        })
    })(idx)
}
