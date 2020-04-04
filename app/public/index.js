// player.state {cheater: bool, party: bool, isHitler: bool, vote: ?bool, dead: bool}
// deck []bool
// discard []bool
// president int
// chancellor ?int
// policies ?[]bool
// voteTracker int
// boards {bool: int}
// lastTicket []int
// nextPresident ?int
// presidentAction ?Action
// enum Action INVESTIGATE, KILL, APPOINT

var NUM_LIBERAL_POLICIES = 6;
var NUM_FASCIST_POLICIES = 13;

function isMyTurn() {
	if (state.chancellor === null) {
		return myIndex === president;
	} else if (me().state.vote === null) {
		return true;
	} else {
		return myIndex === state.president || myIndex === state.chancellor;
	}
}

// todo
function getConfig() {
	switch (state.players.length) {
		case 5:
			return {
				liberalPlayers: 3,
				fascistPlayers: 2,
				liberalPolicies: 5,
				fascistPolicies: 6,
			};
		default:
			return alert("invalid number of players");
	}
}

$(document).ready(function () {
	$("#start_over").click(prepare);
	$("#show_log").click(showLog);
});

function prepare() {
	var config = getConfig();
	if (!config) return;
	state.discard = buildArray(NUM_LIBERAL_POLICIES, NUM_FASCIST_POLICIES);
	shuffle();
	state.president = myIndex;
	state.chancellor = null;
	state.policies = null;
	state.voteTracker = 0;
	state.boards = {
		[true]: config.liberalPolicies,
		[false]: config.fascistPolicies,
	};
	state.lastTicket = [];
	state.nextPresident = null;
	state.presidentAction = null;
	for (var i = 0; i < state.players.length; i++) {
		state.players[i].state = newState();
	}
	var roles = buildArray(config.liberalPlayers, fascistPlayers);
	roles[0] = null;
	shuffleArray(roles);
	for (var i = 0; i < state.players.length; i++) {
		var playerState = state.players[i].state;
		var role = roles[i];
		playerState.isHitler = role === null;
		playerState.party = Boolean(role);
	}
	sendState("prepare");
}

function buildArray(numTrues, numFalses) {
	var trues = Array(numTrues).fill(true);
	var falses = Array(config.numFascistPolicies).fill(false);
	return trues.concat(falses);
}

function newState() {
	var playerState = {
		vote: null,
		dead: false,
		cheater: false,
	};
	return playerState;
}

var originalSendState = sendState;
sendState = function () {
	originalSendState(...arguments);
	// in case it was opened earlier
	$("#log_container").hide();
};

function update() {}

function showLog() {
	if (
		!confirm(
			"Are you sure you want to see the log? You'll be branded a cheater if you do."
		)
	)
		return;
	me().state.cheater = true;
	sendState("opened the log");
	$("#log_container").show();
}
