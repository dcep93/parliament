// player.state {cheater: bool, party: bool, isHitler: bool, vote: ?bool, dead: bool}
// deck []bool
// discard []bool
// president int
// chancellor ?int
// policies ?[]bool
// voteTracker int
// boards {bool: int}
// lastTicket []int
// lastPresident ?int
// presidentAction ?Action
// finished bool
// enum Action VETO, VETO_DECLINE, EXAMINE, INVESTIGATE, KILL, APPOINT_PRESIDENT

var NUM_LIBERAL_POLICIES = 6;
var NUM_FASCIST_POLICIES = 11;

var LIBERAL_POLICIES_NEEDED = 5;
var FASCIST_POLICIES_NEEDED = 6;

var HITLER_CHANCELLOR_REQUIREMENT = 3;
var PRESIDENT_ELIGIBLE_TO_BE_NEXT_CHANCELLOR_PLAYERS = 5;

var MAX_VOTE_TRACKER = 3;
var MIN_CARDS_IN_DECK = 4;
var POLICY_OPTIONS = 3;
var POLICIES_TO_EXAMINE = 3;

var INVESTIGATE = "investigate";
var KILL = "kill";
var APPOINT_PRESIDENT = "appoint_president";
var EXAMINE = "examine";
var VETO = "veto";
var VETO_DECLINE = "veto_decline";

var seenAffiliation = false;

function boolToString(bool) {
	return bool ? "liberal" : "fascist";
}

function requestVeto() {
	state.presidentAction = VETO;
	sendState("requests a veto");
}

function discardPolicy() {
	var index = $(this).attr("data-index");
	var discardedPolicy = state.policies.splice(index, 1);
	state.discard.unshift(discardedPolicy);
	var message;
	if (state.policies.length === 1) {
		var policy = state.policies[0];
		state.policies = null;
		state.boards[policy]++;
		message = `enacted a ${boolToString(policy)} policy`;
		var victory = checkForVictory();
		state.presidentAction = getPresidentAction(policy);
		if (state.presidentAction === null) advancePresident();
		if (victory !== null) {
			state.finished = true;
			message += ` - ${boolToString(victory)}s win!`;
		}
		state.players.forEach((player) => {
			player.state.vote = null;
		});
		state.chancellor = null;
	} else {
		message = "discarded a policy";
	}
	sendState(message);
}

function isMyTurn() {
	if (state.finished) return false;
	// president appointing chancellor
	if (state.chancellor === null) {
		return myIndex === state.president;
		// need to vote
	} else if (me().state.vote === null) {
		return true;
		// chancellor enacting
	} else if (
		state.policies !== null &&
		state.policies.length == POLICY_OPTIONS - 1
	) {
		return myIndex === state.chancellor;
		// otherwise, must be president
	} else {
		return myIndex === state.president;
	}
}

function pickPlayer() {
	var index = $(this).attr("data-index");
	var player = state.players[index];
	var presidentAction = state.presidentAction;
	state.presidentAction = null;
	switch (presidentAction) {
		case INVESTIGATE:
			var affiliation = boolToString(player.state.party);
			alert(`${player.name} is a ${affiliation}`);
			return sendState(`investigated ${player.name}`);
		case KILL:
			player.state.dead = true;
			var message = `killed ${player.name}`;
			if (player.state.isHitler) {
				message += ` ${boolToString(true)}s win!`;
				state.finished = true;
			}
			return sendState(message);
		case APPOINT_PRESIDENT:
			state.president = index;
			state.lastPresident = myIndex;
			return sendState(`appointed ${player.name} as next president`);
		default:
			if (state.lastTicket.indexOf(index) !== false)
				return alert("that player was on the previous ticket");
			state.chancellor = index;
			return sendState(`appointed ${player.name} as chancellor`);
	}
}

function vote() {
	var raw = $(this).attr("data-bool");
	var bool = JSON.parse(raw);
	me().state.vote = bool;
	var outcome = getOutcome();
	var message = "voted";
	if (outcome !== null) {
		var action;
		if (outcome) {
			action = "elected";
			if (hitlerWinsChancellor()) {
				state.finished = true;
				action += ` hitler - ${boolToString(false)}s win`;
			}
			state.voteTracker = 0;
			state.policies = state.deck.splice(POLICY_OPTIONS);
			if (fewPlayersLeft()) {
				state.lastTicket = [state.state.chancellor];
			} else {
				state.lastTicket = [state.president, state.chancellor];
			}
		} else {
			action = "not elected";
			var incrementMessage = incrementVoteTracker();
			if (incrementMessage !== null) action += ` - ${incrementMessage}`;
			advancePresident();
		}
		message += ` - ${action}`;
	}
	sendState(message);
}

function fewPlayersLeft() {
	return (
		state.players.filter((player) => !player.state.dead).length <=
		PRESIDENT_ELIGIBLE_TO_BE_NEXT_CHANCELLOR_PLAYERS
	);
}

function incrementVoteTracker() {
	state.voteTracker++;
	if (state.voteTracker === MAX_VOTE_TRACKER) {
		var policy = state.deck.pop();
		state.boards[policy]++;
		state.voteTracker = 0;
		var message = `${boolToString(policy)} auto passed`;
		var victory = checkForVictory();
		if (victory !== null) {
			state.finished = true;
			message += ` - ${boolToString(victory)}s win!`;
		}
		return message;
	}
	return null;
}

function advancePresident() {
	if (state.lastPresident !== null) {
		state.president = state.lastPresident;
		state.lastPresident = null;
	}
	for (var i = 0; i < state.players.length; i++) {
		state.president = playerByIndex(state.president + 1);
		if (!state.players[state.president].state.dead) return;
	}
	alert("something went wrong - everyone is dead");
	throw DeveloperException("context");
}

function getPresidentAction(policy) {
	var rank = state.boards[policy];
	if (!policy) {
		switch (rank) {
			case 1:
				switch (state.players.length) {
					case 9:
					case 10:
						return INVESTIGATE;
				}
			case 2:
				switch (state.players.length) {
					case 7:
					case 8:
					case 9:
					case 10:
						return INVESTIGATE;
				}
			case 3:
				switch (state.players.length) {
					case 5:
					case 6:
						return EXAMINE;
					case 7:
					case 8:
					case 9:
					case 10:
						return APPOINT_PRESIDENT;
				}
			case 4:
			case 5:
				return KILL;
		}
	}
	return null;
}

function hitlerWinsChancellor() {
	var chancellor = state.players[state.chancellor];
	if (chancellor.state.isHitler) {
		if (state.boards[false] >= HITLER_CHANCELLOR_REQUIREMENT) return true;
	}
	return false;
}

function checkForVictory() {
	if (state.boards[true] === LIBERAL_POLICIES_NEEDED) return true;
	if (state.boards[false] === FASCIST_POLICIES_NEEDED) return false;
	if (state.deck.length < MIN_CARDS_IN_DECK) shuffle();
	return null;
}

function shuffle() {
	state.deck = state.discard.concat(state.deck);
	state.discard = [];
	shuffleArray(state.deck);
}

function getOutcome() {
	var vote = 0;
	for (var i = 0; i < state.players.length; i++) {
		var playerState = state.players[i].state;
		if (playerState.dead) continue;
		if (playerState.vote === null) return null;
		vote += playerState.vote ? 1 : -1;
	}
	return vote > 0;
}

function getNumFascistPlayers() {
	switch (state.players.length) {
		case 5:
		case 6:
			return 2;
		case 7:
		case 8:
			return 3;
		case 9:
		case 10:
			return 4;
		default:
			return alert("invalid number of players");
	}
}

$(document).ready(function () {
	$("#start_over").click(prepare);
	$("#show_log").click(showLog);
});

function prepare() {
	var numFascistPlayers = getNumFascistPlayers();
	if (!numFascistPlayers) return;
	var numLiberalPlayers = state.players.length - numFascistPlayers;
	var roles = buildArray(numLiberalPlayers, numFascistPlayers);
	roles[0] = null;
	shuffleArray(roles);
	state.deck = buildArray(NUM_LIBERAL_POLICIES, NUM_FASCIST_POLICIES);
	state.discard = [];
	shuffle();
	state.president = myIndex;
	state.chancellor = null;
	state.policies = null;
	state.voteTracker = 0;
	state.boards = {
		[true]: 0,
		[false]: 0,
	};
	state.lastTicket = [];
	state.lastPresident = null;
	state.presidentAction = null;
	for (var i = 0; i < state.players.length; i++) {
		state.players[i].state = newState();
	}
	for (var i = 0; i < state.players.length; i++) {
		var playerState = state.players[i].state;
		var role = roles[i];
		playerState.isHitler = role === null;
		playerState.party = Boolean(role);
	}
	state.finished = false;
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

function update() {
	if (handleVeto()) return;
	ensureAffiliationSeen();
	handleExamine();
}

function handleVeto() {
	if (state.presidentAction === VETO) {
		if (myIndex === state.president) {
			var response = confirm("Do you agree to a veto?");
			if (response) {
				var message = "agrees to a veto";
				var incrementMessage = incrementVoteTracker();
				if (incrementMessage !== null)
					message += ` - ${incrementMessage}`;
				sendState(message);
			} else {
				state.presidentAction = VETO_DECLINE;
				sendState("declines a veto");
			}
		}
		return true;
	} else {
		return false;
	}
}

function handleExamine() {
	if (state.presidentAction === EXAMINE) {
		state.presidentAction = null;
		if (myIndex === state.president) {
			var topPolicies = state.deck
				.slice(POLICIES_TO_EXAMINE)
				.map(boolToString)
				.reverse()
				.join(" ");
			alert(`top 3 cards are: ${topPolicies}`);
		}
	}
}

function ensureAffiliationSeen() {
	if (!seenAffiliation) {
		seenAffiliation = true;
		var myState = me().state;
		var message;
		if (myState.isHitler) {
			message = "you are literally Hitler";
		} else {
			message = `you are ${boolToString(myState.party)}`;
		}
		if (!myState.party) {
			if (
				myState.isHitler &&
				state.players.length >=
					MIN_PLAYERS_FOR_HITLER_TO_NOT_KNOW_WHO_FASCISTS_ARE
			) {
				message += `\nyou dont know who the other ${boolToString(
					false
				)}s are`;
			} else {
				var fellowsString = state.players
					.filter((player) => !player.state.party)
					.map((player) => player.name)
					.join("\n");
				message += `\nyour fellow ${boolToString(
					false
				)}s:\n${fellowsString}`;
			}
		}
		alert(message);
	}
}

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
