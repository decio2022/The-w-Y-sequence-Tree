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
                return mult
            },
            gainExp() {
                return new Decimal(1)
            },
            // This layer multiplies point gain by (currency + 1) ^ 3^i,
            // so every new layer is tetrationally stronger than the last.
            effect() {
                let p = player[this.layer].points
                if (!p || p.lte(0)) return new Decimal(1)
                let eff = p.add(1).pow(Math.pow(3, i))
                if (hasUpgrade(this.layer, 11)) eff = eff.pow(2)
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
            },
            row: i, // one layer per row: a vertical chain y1 -> y2 -> ... -> y10
            hotkeys: [
                {key: String((i + 1) % 10), description: ((i + 1) % 10) + ": Reset for Y" + (i + 1) + " points", onPress() { if (canReset(this.layer)) doReset(this.layer) }},
            ],
            layerShown() { return true },
        })
    })(idx)
}
