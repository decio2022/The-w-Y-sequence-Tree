let modInfo = {
	name: "The w-Y sequence Tree",
	author: "decio",
	pointsName: "points",
	modFiles: ["layers.js", "tree.js"],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal (10), // Used for hard resets and new players
	offlineLimit: 0,  // In hours
}

// Set your version in num and name
let VERSION = {
	num: "1.5",
	name: "w-Y sequence",
}

let changelog = `<h1>Changelog:</h1><br>
	<h3>v1.0</h3><br>
		- Added 10 w-Y layers: Layer 1 unlocks at 10 points, Layer 10 at F10 (10^^10) points.<br>
		- The points display now shows the w-Y sequence: it starts at 1,1 and reaches 1,3 at F10 points.<br>
		- Each layer has 3 upgrades and multiplies point gain tetrationally more than the previous one.<br>
	<h3>v1.1</h3><br>
		- Added 10 more upgrades per layer (13 total per layer, 130 in all).<br>
		- Added passive generation: a layer passively gains 100% of its reset gain per second once its own points reach e10 (1e10), or 500% per second with its Y-passive upgrade.<br>
	<h3>v1.2</h3><br>
		- Added 87 extremely overpowered upgrades per layer: now 100 upgrades per layer (1,000 in all).<br>
		- Added a Dev side layer: type a value for player.points, jump to landmarks, and see the w-Y sequence, get_time and estimated time to each sequence.<br>
		- Added a Notations side layer showing your points in the other notations from conv.js (BMS, DBMS, PMS, AMS, 0Y, Vulcaniz, cOCF, EcOCF).<br>
	<h3>v1.3</h3><br>
		- Added a milestone to every layer: at ee10 of that layer's points it auto-buys every upgrade in its own layer.<br>
	<h3>v1.4</h3><br>
		- Added 9,900 tetrational upgrades per layer: now 10,000 upgrades per layer (100,000 in all). Each multiplies point gain by 10^^(1 + log10(n/100)), so they get tetrationally stronger while the tetration height's growth slows.<br>
		- Revamped the upgrades display: upgrades are now shown 100 per page, with page navigation.<br>
	<h3>v1.5</h3><br>
		- Bought upgrades are now hidden from the screen (and pagination only counts unbought upgrades), to reduce lag.`

let winText = `Congratulations! You reached F10 (10^^10) points, reset for Y10, and your points display reached w-Y 1,3. You have beaten this game, but for now...`

// If you add new functions anywhere inside of a layer, and those functions have an effect when called, add them here.
// (The ones here are examples, all official functions are already taken care of)
var doNotCallTheseFunctionsEveryTick = ["blowUpEverything"]

function getStartPoints(){
    return new Decimal(modInfo.initialStartPoints)
}

// Determines if it should show points/sec
function canGenPoints(){
	return true
}

// Calculate points/sec!
function getPointGen() {
	if(!canGenPoints())
		return new Decimal(0)

	let gain = new Decimal(1)
	// Every unlocked w-Y layer multiplies point gain by its effect,
	// plus the flat / feedback point-gain upgrades of that layer:
	//   13: x100   22: x1,000   25: x100,000   35: x1e10
	//   33: x (that layer's points + 1)
	if (typeof WY_LAYER_IDS !== "undefined") {
		for (let id of WY_LAYER_IDS) {
			if (player[id] && player[id].unlocked && tmp[id] && tmp[id].effect)
				gain = gain.times(tmp[id].effect)
			// Extremely overpowered generated upgrades (kinds 0, 3, 4)
			if (player[id] && typeof wyOpPointMult !== "undefined")
				gain = gain.times(wyOpPointMult(id))
			// Tetrational upgrades n=101..10000 (aggregated, cached)
			if (player[id] && player[id].upgrades && typeof wyMegaPointMult !== "undefined")
				gain = gain.times(wyMegaPointMult(id))
			if (typeof hasUpgrade !== "undefined" && player[id]) {
				if (hasUpgrade(id, 13)) gain = gain.times(100)
				if (hasUpgrade(id, 22)) gain = gain.times(1000)
				if (hasUpgrade(id, 25)) gain = gain.times(100000)
				if (hasUpgrade(id, 33)) gain = gain.times(player[id].points.add(1))
				if (hasUpgrade(id, 35)) gain = gain.times("1e10")
			}
		}
	}
	return gain
}

function get_time(t) {
    var R = (Math.log10(1 + t / 864000) / 2 + 2)
    return R
}

function get_time_inv(n) {
    var S = (10 ** ((n - 2) * 2) - 1) * 864000
    return S
}

function num_to_lngi(m) {
    var m = m - m % 1 + 0.5 + 0.5 * (m % 1)
    return ntl(m)
}

function ntl(m) {
    super_list = []
    var ord = `1,${Math.max(1, Math.floor(m))}`
    var steps = 0
    var m = 1 - (m % 1)
    while (ord.length < 100 && ord.split(",").at(-1) < 1e8 && steps < 53) {
        super_list = super_list.concat([[ord, steps, m]])
        if (m <= 1e-14) {
            break
        }
        var exp = 0
        while (m <= 1) {
            steps = steps + 1
            m = m * 2
            exp = exp + 1
        }
        var base = Y_Sequence.fs(ord, exp).split(",")
        var ordl = ord.split(",").length
        ord = base.slice(0, ordl + exp - 1).join(",")
        m = m - 1
        if (ord.split(",").at(-1) == 1) {
            ord = ord.split(",");
            ord.pop();
            ord = ord.join(",");

            super_list.push([ord, steps, m]);

            steps = 69
            break;
        }
    }
    if (steps == 53) {
        ord = ord.split(",");
        ord.pop();
        ord = ord.join(",");
    }
    return [ord, m, exp]
}

function num_time(t) {
    var t_elapsed = Math.max(0, t - st)
    if (t_elapsed == 0) {
        return `Not started yet. Wait for the clock to hit.<br>Time left: <span style="font-size: 150%">${((st - t) / 1000).toFixed(3)}s</span>`
    } else {
        var u = get_time(t_elapsed)
        var j = num_to_lngi(u)
        return [`${((1 - j[1]) * 100).toFixed(3)}%`, formatSeconds(lt), j[0]]
    }
}


// ============================================================
//  Points -> w-Y sequence display
//
//  The display starts at "1,1" and ends at "1,3" (the limit of BMS
//  in the w-Y sequence, Lim_BMS_in_Yseq in conv.js) when the points
//  reach F10 = 10^^10, which is also the Layer 10 requirement.
//
//  Formula (built on get_time / get_time_inv above):
//    1. Measure the points on a tetration scale with the
//       super-logarithm:  slog(10) = 1,  slog(F10) = slog(10^^10) = 10.
//    2. Stretch that evenly onto the range get_time can output:
//           value = 2 + 2 * (slog(points) - 1) / 9        (2 ... 4)
//       so value = 2 at <= 10 points and value = 4 at F10.
//    3. Turn the value into a "time" with the inverse function,
//       then read it back with get_time (the round-trip is exact):
//           t      = get_time_inv(value)   // = get_time_inv(4) at F10
//           result = get_time(t)           // reaches 4 at F10
//    4. Feed the result into the supplied num_to_lngi / ntl, which
//       interpolate in the w-Y sequence via Y_Sequence.fs:
//           num_to_lngi(2) = "1,1"   and   num_to_lngi(4) = "1,3"
// ============================================================

function wyTimeFromPoints(points) {
    // Tetration height of the points: 1 at 10 points, 10 at F10.
    let s = new Decimal(1)
    if (points.gt(10)) s = points.slog(10)
    let frac = s.sub(1).div(9) // 0 at 10 points, 1 at F10
    if (frac.lt(0)) frac = new Decimal(0)
    if (frac.gt(1)) frac = new Decimal(1)
    let value = 2 + 2 * frac.toNumber() // 2 ... 4
    return get_time_inv(value)
}

let _wyCacheKey = null
let _wyCacheSeq = "1,1"

function wySequenceFromPoints(points) {
    let t = wyTimeFromPoints(points)
    let result = get_time(t) // 2 ... 4, and exactly 4 at F10 points
    // num_to_lngi (via ntl + Y_Sequence.fs) is comparatively expensive
    // and the displayed sequence only changes slowly, so cache it on
    // the (quantised) result of get_time.
    let key = result.toFixed(4)
    if (key !== _wyCacheKey) {
        _wyCacheKey = key
        try { _wyCacheSeq = num_to_lngi(result)[0] } catch (e) { /* keep last sequence */ }
    }
    return _wyCacheSeq
}

// Used by the points header (overlay-head in systemComponents.js)
function formatWyPoints(points) {
    return wySequenceFromPoints(points)
}

function wyProgressText() {
    let result = get_time(wyTimeFromPoints(player.points))
    let pct = Math.max(0, Math.min(100, (result - 2) / 2 * 100))
    return "w-Y progress: get_time = " + result.toFixed(4) + " / 4 (" + pct.toFixed(2) +
        "%) &mdash; reach 4 (w-Y 1,3) at F10 = 10^^10 points"
}

function wyNextLayerText() {
    if (typeof WY_LAYER_IDS === "undefined") return ""
    for (let i = 0; i < WY_LAYER_IDS.length; i++) {
        let id = WY_LAYER_IDS[i]
        if (!player[id] || !player[id].unlocked)
            return "Next layer: Y" + (i + 1) + " unlocks at " + format(wyRequirement(i)) + " points (10^^" + (i + 1) + ")"
    }
    return "All 10 w-Y layers unlocked!"
}

// You can add non-layer related variables that should to into "player" and be saved here, along with default values
function addedPlayerData() { return {
}}

// Display extra things at the top of the page
var displayThings = [
    function() { return "(" + format(player.points) + " points in ordinary notation)" },
    wyProgressText,
    wyNextLayerText,
]

// Determines when the game "ends": reset at F10 (10^^10) points to
// unlock the last (10th) layer, i.e. have any Y10 points.
function isEndgame() {
	return !!(player.y10 && player.y10.points && player.y10.points.gt(0))
}



// Less important things beyond this point!

// Style for the background, can be a function
var backgroundStyle = {

}

// You can change this if you have things that can be messed up by long tick lengths
function maxTickLength() {
	return(3600) // Default is 1 hour which is just arbitrarily large
}

// Use this if you need to undo inflation from an older version. If the version is older than the version that fixed the issue,
// you can cap their current resources with this.
function fixOldSave(oldVersion){
}