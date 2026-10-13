// With 10,000 upgrades per layer, Array.includes() inside hasUpgrade
// (called constantly by effects, autobuy and the upgrade buttons)
// would be O(n) per call. Cache a Set of each layer's bought upgrades
// instead; the bought array only grows by appends between resets, so
// the cache is extended incrementally and rebuilt when it changes.
var _hasUpgradeSetCache = {}
function hasUpgrade(layer, id) {
	let ups = player[layer].upgrades
	let c = _hasUpgradeSetCache[layer]
	if (!c || c.arr !== ups || ups.length < c.len) {
		c = _hasUpgradeSetCache[layer] = { arr: ups, len: 0, set: new Set() }
	}
	while (c.len < ups.length) {
		c.set.add(toNumber(ups[c.len]))
		c.set.add(ups[c.len].toString())
		c.len++
	}
	return (c.set.has(toNumber(id)) || c.set.has(id.toString())) && !tmp[layer].deactivated
}

function hasMilestone(layer, id) {
	return ((player[layer].milestones.includes(toNumber(id)) || player[layer].milestones.includes(id.toString())) && !tmp[layer].deactivated)
}

function hasAchievement(layer, id) {
	return ((player[layer].achievements.includes(toNumber(id)) || player[layer].achievements.includes(id.toString())) && !tmp[layer].deactivated)
}

function hasChallenge(layer, id) {
	return ((player[layer].challenges[id]) && !tmp[layer].deactivated)
}

function maxedChallenge(layer, id) {
	return ((player[layer].challenges[id] >= tmp[layer].challenges[id].completionLimit) && !tmp[layer].deactivated)
}

function challengeCompletions(layer, id) {
	return (player[layer].challenges[id])
}

function canEnterChallenge(layer, id){
	return tmp[layer].challenges[id].canEnter ?? true
}

function canExitChallenge(layer, id){
	return tmp[layer].challenges[id].canExit ?? true
}

function getBuyableAmount(layer, id) {
	return (player[layer].buyables[id])
}

function setBuyableAmount(layer, id, amt) {
	player[layer].buyables[id] = amt
}

function addBuyables(layer, id, amt) {
	player[layer].buyables[id] = player[layer].buyables[id].add(amt)
}

function getClickableState(layer, id) {
	return (player[layer].clickables[id])
}

function setClickableState(layer, id, state) {
	player[layer].clickables[id] = state
}

function getGridData(layer, id) {
	return (player[layer].grid[id])
}

function setGridData(layer, id, data) {
	player[layer].grid[id] = data
}

function upgradeEffect(layer, id) {
	return (tmp[layer].upgrades[id].effect)
}

function challengeEffect(layer, id) {
	return (tmp[layer].challenges[id].rewardEffect)
}

function buyableEffect(layer, id) {
	return (tmp[layer].buyables[id].effect)
}

function clickableEffect(layer, id) {
	return (tmp[layer].clickables[id].effect)
}

function achievementEffect(layer, id) {
	return (tmp[layer].achievements[id].effect)
}

function gridEffect(layer, id) {
	return (gridRun(layer, 'getEffect', player[layer].grid[id], id))
}