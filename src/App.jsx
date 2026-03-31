import React, { useEffect, useMemo, useRef, useState } from "react";

const MOVE = {
  HIT: "hit",
  STAND: "stand",
  DOUBLE: "double",
  SPLIT: "split",
  SURRENDER: "surrender",
};

const FEEDBACK = {
  CORRECT: "correct",
  WRONG: "wrong",
  ILLEGAL: "illegal",
  FALLBACK: "fallback",
};

const ALL_ACTIONS = [MOVE.HIT, MOVE.STAND, MOVE.DOUBLE, MOVE.SPLIT, MOVE.SURRENDER];
const CARD_POOL = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const DEALER_CARDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"];

const LOGO_SRC = "/21bust_192.png";
const MASTER_LOGO = "/21bust_master.png";
const FAVICON_ICO = "/21bust_favicon.ico";
const FAVICON_PNG = "/21bust_32.png";

const SUITS = [
  { symbol: "♠", color: "text-slate-900" },
  { symbol: "♥", color: "text-red-600" },
  { symbol: "♦", color: "text-red-600" },
  { symbol: "♣", color: "text-slate-900" },
];

const SESSION_CAP = 30;
const FREE_SESSIONS_PER_DAY = 3;
const HALF_SESSION_MARK = 15;

const SETTING_DEFS = [
  { key: "showHandTotal", label: "Hand Total", description: "Shows or hides the numeric total of the player hand.", paywalled: false },
  { key: "soundEnabled", label: "Sound", description: "Fast answer tones, streak crowd build, and applause on trophy unlocks.", paywalled: false },
  { key: "vibrationEnabled", label: "Vibration", description: "Vibrates on wrong answers when supported by the device/browser.", paywalled: false },
  { key: "tenHandSummary", label: "10-Hand Summary", description: "Optional recap every 10 hands. Off by default to keep training fast.", paywalled: false },
  { key: "surrenderEnabled", label: "Surrender", description: "Enables late surrender strategy and shows the surrender action button.", paywalled: false },
  { key: "dasEnabled", label: "DAS", description: "Double after split allowed. This changes strategy for relevant pair hands.", paywalled: false },
  { key: "targetedTraining", label: "Targeted Training", description: "Repeats tougher hands more often so weak spots get extra reps.", paywalled: true },
  { key: "continueHandMode", label: "Casino Simulation", description: "Continues the hand beyond the first decision instead of ending after the training answer.", paywalled: true },
  { key: "dealerPush22", label: "Dealer Push on 22", description: "Uses a rule set where dealer 22 becomes a push instead of a bust.", paywalled: true },
  { key: "bankrollMode", label: "Casino Betting Totals", description: "Tracks bankroll and starts the session at $300.", paywalled: true },
];

const FREE_TROPHIES = [
  { id: "streak5", label: "Heat Check", icon: "🔥", description: "Reach a 5-hand correct streak.", check: (s) => s.bestStreak >= 5 },
  { id: "streak10", label: "Sharp Eye", icon: "🏅", description: "Reach a 10-hand correct streak.", check: (s) => s.bestStreak >= 10 },
  { id: "streak20", label: "Table Locked", icon: "🏆", description: "Reach a 20-hand correct streak.", check: (s) => s.bestStreak >= 20 },
  { id: "accuracy95", label: "Precision", icon: "🎯", description: "Hold 95%+ accuracy after 20 hands.", check: (s) => s.handsPlayed >= 20 && s.accuracy >= 95 },
  { id: "time10", label: "Focused Repper", icon: "⏱️", description: "Accumulate 10 minutes of active training time.", check: (s) => s.totalTrainingSeconds >= 600 },
  { id: "clean15", label: "No Leaks", icon: "🛡️", description: "Go 15 hands without a scored mistake.", check: (s) => s.cleanHandsMax >= 15 },
];

const PRO_TROPHIES = [
  { id: "accuracy98", label: "Ice Cold", icon: "❄️", description: "Hold 98%+ accuracy in a session.", paywalled: true },
  { id: "streak30", label: "Untouchable", icon: "👑", description: "Reach a 30-hand correct streak.", paywalled: true },
  { id: "time60", label: "Grinder", icon: "💎", description: "Accumulate 60 minutes of active training time.", paywalled: true },
  { id: "perfectSession", label: "Perfect Block", icon: "🌟", description: "Finish a full session with no scored mistakes.", paywalled: true },
];

const HARD_STRATEGY = {
  17: { default: MOVE.STAND },
  18: { default: MOVE.STAND },
  19: { default: MOVE.STAND },
  20: { default: MOVE.STAND },
  16: { "2": MOVE.STAND, "3": MOVE.STAND, "4": MOVE.STAND, "5": MOVE.STAND, "6": MOVE.STAND, default: MOVE.HIT },
  15: { "2": MOVE.STAND, "3": MOVE.STAND, "4": MOVE.STAND, "5": MOVE.STAND, "6": MOVE.STAND, default: MOVE.HIT },
  14: { "2": MOVE.STAND, "3": MOVE.STAND, "4": MOVE.STAND, "5": MOVE.STAND, "6": MOVE.STAND, default: MOVE.HIT },
  13: { "2": MOVE.STAND, "3": MOVE.STAND, "4": MOVE.STAND, "5": MOVE.STAND, "6": MOVE.STAND, default: MOVE.HIT },
  12: { "4": MOVE.STAND, "5": MOVE.STAND, "6": MOVE.STAND, default: MOVE.HIT },
  11: { "2": MOVE.DOUBLE, "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, "7": MOVE.DOUBLE, "8": MOVE.DOUBLE, "9": MOVE.DOUBLE, "10": MOVE.DOUBLE, default: MOVE.HIT },
  10: { "2": MOVE.DOUBLE, "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, "7": MOVE.DOUBLE, "8": MOVE.DOUBLE, "9": MOVE.DOUBLE, default: MOVE.HIT },
  9: { "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, default: MOVE.HIT },
};

const SOFT_STRATEGY = {
  20: { default: MOVE.STAND },
  19: { default: MOVE.STAND },
  18: { "2": MOVE.STAND, "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, "7": MOVE.STAND, "8": MOVE.STAND, default: MOVE.HIT },
  17: { "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, default: MOVE.HIT },
  16: { "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, default: MOVE.HIT },
  15: { "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, default: MOVE.HIT },
  14: { "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, default: MOVE.HIT },
  13: { "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, default: MOVE.HIT },
};

const PAIR_STRATEGY_DAS_ON = {
  A: { default: MOVE.SPLIT },
  "10": { default: MOVE.STAND },
  "9": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "8": MOVE.SPLIT, "9": MOVE.SPLIT, default: MOVE.STAND },
  "8": { default: MOVE.SPLIT },
  "7": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "7": MOVE.SPLIT, default: MOVE.HIT },
  "6": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, default: MOVE.HIT },
  "5": { "2": MOVE.DOUBLE, "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, "7": MOVE.DOUBLE, "8": MOVE.DOUBLE, "9": MOVE.DOUBLE, default: MOVE.HIT },
  "4": { "5": MOVE.SPLIT, "6": MOVE.SPLIT, default: MOVE.HIT },
  "3": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "7": MOVE.SPLIT, default: MOVE.HIT },
  "2": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "7": MOVE.SPLIT, default: MOVE.HIT },
};

const PAIR_STRATEGY_DAS_OFF = {
  A: { default: MOVE.SPLIT },
  "10": { default: MOVE.STAND },
  "9": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "8": MOVE.SPLIT, "9": MOVE.SPLIT, default: MOVE.STAND },
  "8": { default: MOVE.SPLIT },
  "7": { "2": MOVE.SPLIT, "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "7": MOVE.SPLIT, default: MOVE.HIT },
  "6": { "3": MOVE.SPLIT, "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, default: MOVE.HIT },
  "5": { "2": MOVE.DOUBLE, "3": MOVE.DOUBLE, "4": MOVE.DOUBLE, "5": MOVE.DOUBLE, "6": MOVE.DOUBLE, "7": MOVE.DOUBLE, "8": MOVE.DOUBLE, "9": MOVE.DOUBLE, default: MOVE.HIT },
  "4": { default: MOVE.HIT },
  "3": { "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "7": MOVE.SPLIT, default: MOVE.HIT },
  "2": { "4": MOVE.SPLIT, "5": MOVE.SPLIT, "6": MOVE.SPLIT, "7": MOVE.SPLIT, default: MOVE.HIT },
};

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cardValue(card) {
  if (["J", "Q", "K"].includes(card)) return 10;
  if (card === "A") return 11;
  return Number(card);
}

function normalizeDealerCard(card) {
  const normalized = String(card).toUpperCase();
  if (["J", "Q", "K"].includes(normalized)) return "10";
  return normalized;
}

function normalizeHandInput(hand) {
  if (Array.isArray(hand)) return hand.map((c) => String(c).toUpperCase());
  if (hand && Array.isArray(hand.cards)) return hand.cards.map((c) => String(c).toUpperCase());
  throw new Error("Hand must be an array of cards or an object with a cards array.");
}

function normalizePairRank(card) {
  const normalized = String(card).toUpperCase();
  if (["10", "J", "Q", "K"].includes(normalized)) return "10";
  return normalized;
}

function evaluateHand(cardsInput) {
  const cards = normalizeHandInput(cardsInput);
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += cardValue(card);
    if (card === "A") aces += 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return {
    total,
    isSoft: cards.includes("A") && total <= 21 && aces > 0,
    isBlackjack: cards.length === 2 && total === 21,
    isBust: total > 21,
  };
}

function isPair(cardsInput) {
  const cards = normalizeHandInput(cardsInput);
  if (cards.length !== 2) return false;
  return normalizePairRank(cards[0]) === normalizePairRank(cards[1]);
}

function lookupStrategy(table, key, dealerCard) {
  const row = table[key];
  if (!row) return MOVE.HIT;
  return row[dealerCard] || row.default;
}

function getPairStrategyTable(dasEnabled) {
  return dasEnabled ? PAIR_STRATEGY_DAS_ON : PAIR_STRATEGY_DAS_OFF;
}

function getSurrenderMove(cardsInput, total, dealerCard) {
  const cards = normalizeHandInput(cardsInput);
  if (cards.length !== 2 || isPair(cards)) return null;
  if (total === 16 && ["9", "10", "A"].includes(dealerCard)) return MOVE.SURRENDER;
  if (total === 15 && dealerCard === "10") return MOVE.SURRENDER;
  return null;
}

function getMoveLegality(handInput, action, options = {}) {
  const { surrenderEnabled = false } = options;
  const cards = normalizeHandInput(handInput);

  if (action === MOVE.SURRENDER) {
    if (!surrenderEnabled) return { legal: false, reason: "Surrender is currently turned off." };
    if (cards.length !== 2) return { legal: false, reason: "Surrender is only available on the first decision." };
    if (isPair(cards)) return { legal: false, reason: "Surrender is not available on pairs." };
    return { legal: true, reason: "" };
  }
  if (action === MOVE.SPLIT) {
    if (cards.length !== 2) return { legal: false, reason: "Split is only available on the opening two cards." };
    if (!isPair(cards)) return { legal: false, reason: "You can only split matching cards." };
    return { legal: true, reason: "" };
  }
  if (action === MOVE.DOUBLE) {
    if (cards.length !== 2) return { legal: false, reason: "Double is only available on the opening two cards." };
    return { legal: true, reason: "" };
  }
  return { legal: true, reason: "" };
}

function getCorrectMoveWithFallback(handInput, dealerCardInput, options = {}) {
  const { surrenderEnabled = false, dasEnabled = true } = options;
  const cards = normalizeHandInput(handInput);
  const dealerCard = normalizeDealerCard(dealerCardInput);
  const evaluated = evaluateHand(cards);

  if (evaluated.isBust) throw new Error("Cannot get move for a busted hand.");
  if (evaluated.isBlackjack) return { correctMove: MOVE.STAND, fallbackMove: null, surrenderIsPrimary: false };
  if (!evaluated.isSoft && evaluated.total >= 17) return { correctMove: MOVE.STAND, fallbackMove: null, surrenderIsPrimary: false };
  if (evaluated.total === 21) return { correctMove: MOVE.STAND, fallbackMove: null, surrenderIsPrimary: false };

  const pairTable = getPairStrategyTable(dasEnabled);
  let bestNonSurrenderMove;
  if (cards.length === 2 && isPair(cards)) {
    bestNonSurrenderMove = lookupStrategy(pairTable, normalizePairRank(cards[0]), dealerCard);
  } else if (evaluated.isSoft && cards.length === 2) {
    bestNonSurrenderMove = lookupStrategy(SOFT_STRATEGY, evaluated.total, dealerCard);
  } else {
    bestNonSurrenderMove = lookupStrategy(HARD_STRATEGY, evaluated.total, dealerCard);
  }

  if (surrenderEnabled) {
    const surrenderMove = getSurrenderMove(cards, evaluated.total, dealerCard);
    if (surrenderMove) {
      return { correctMove: MOVE.SURRENDER, fallbackMove: bestNonSurrenderMove, surrenderIsPrimary: true };
    }
  }
  return { correctMove: bestNonSurrenderMove, fallbackMove: null, surrenderIsPrimary: false };
}

function buildDecisionFeedback(hand, dealerCard, correctMove, fallbackMove) {
  if (correctMove === MOVE.SURRENDER && fallbackMove) {
    return `Surrender is best here, but if unavailable, the next best move is ${fallbackMove.charAt(0).toUpperCase() + fallbackMove.slice(1)}.`;
  }
  return getExplanation(hand, dealerCard, correctMove);
}

function getExplanation(hand, dealerCard, correctMove) {
  const cards = normalizeHandInput(hand);
  const dealer = normalizeDealerCard(dealerCard);
  const evaluated = evaluateHand(cards);

  if (correctMove === MOVE.SURRENDER) return "Best loss control here is surrender.";
  if (correctMove === MOVE.SPLIT) return "Splitting creates a stronger expected result than playing this pair as one hand.";
  if (correctMove === MOVE.DOUBLE) return "This is a strong double spot against the dealer upcard.";
  if (correctMove === MOVE.STAND) {
    if (evaluated.total >= 17) return "Your hand is already strong enough to stand.";
    if (evaluated.total === 12 && ["4", "5", "6"].includes(dealer)) return "Let the dealer bust with the weak upcard.";
    return "Standing is the best-value play here.";
  }
  if (correctMove === MOVE.HIT) {
    if (evaluated.total <= 11) return "Your hand is still too weak. Improve it.";
    return "Hitting loses less expectation than standing here.";
  }
  return "This is the best basic-strategy move.";
}

function getWrongMoveNote(hand, dealerCard, playerMove, correctMove) {
  const evaluated = evaluateHand(hand);
  const dealer = normalizeDealerCard(dealerCard);

  if (playerMove === correctMove) return "";
  if (playerMove === MOVE.SURRENDER) return "Surrender gives up too much value here.";
  if (playerMove === MOVE.SPLIT) return "Splitting breaks the stronger one-hand play here.";
  if (playerMove === MOVE.DOUBLE) return "Doubling adds money in a spot that is not strong enough.";
  if (playerMove === MOVE.STAND) {
    if (evaluated.total <= 11) return "Standing freezes a hand that still needs to improve.";
    if (evaluated.isSoft && evaluated.total <= 17) return "Soft hands this weak still need to improve.";
    if (evaluated.total === 12 && !["4", "5", "6"].includes(dealer)) return "12 stands only vs 4, 5, or 6.";
    return "Standing is too passive against this upcard.";
  }
  if (playerMove === MOVE.HIT) {
    if (evaluated.total >= 17) return "Hitting risks damaging a hand already strong enough to stand.";
    if (correctMove === MOVE.DOUBLE) return "You missed a profitable double.";
    if (correctMove === MOVE.SPLIT) return "You missed the value of splitting the pair.";
    return "Hitting gives up value versus the stronger play.";
  }
  return "That option is lower value than the correct basic-strategy move.";
}

function evaluateDecision(hand, dealerCard, playerMove, options = {}) {
  const normalizedPlayerMove = String(playerMove).trim().toLowerCase();
  const legality = getMoveLegality(hand, normalizedPlayerMove, options);

  if (!legality.legal) {
    return {
      outcome: FEEDBACK.ILLEGAL,
      playerMove: normalizedPlayerMove,
      correctMove: null,
      fallbackMove: null,
      explanation: legality.reason,
      wrongMoveNote: "",
      illegalReason: legality.reason,
    };
  }

  const { correctMove, fallbackMove, surrenderIsPrimary } = getCorrectMoveWithFallback(hand, dealerCard, options);

  if (normalizedPlayerMove === correctMove) {
    return {
      outcome: FEEDBACK.CORRECT,
      playerMove: normalizedPlayerMove,
      correctMove,
      fallbackMove,
      explanation: buildDecisionFeedback(hand, dealerCard, correctMove, fallbackMove),
      wrongMoveNote: "",
      illegalReason: "",
      surrenderIsPrimary,
    };
  }

  if (fallbackMove && normalizedPlayerMove === fallbackMove) {
    return {
      outcome: FEEDBACK.FALLBACK,
      playerMove: normalizedPlayerMove,
      correctMove,
      fallbackMove,
      explanation: `Surrender is best here, but if unavailable, the next best move is ${fallbackMove.charAt(0).toUpperCase() + fallbackMove.slice(1)}.`,
      wrongMoveNote: "",
      illegalReason: "",
      surrenderIsPrimary,
    };
  }

  return {
    outcome: FEEDBACK.WRONG,
    playerMove: normalizedPlayerMove,
    correctMove,
    fallbackMove,
    explanation: buildDecisionFeedback(hand, dealerCard, correctMove, fallbackMove),
    wrongMoveNote: getWrongMoveNote(hand, dealerCard, normalizedPlayerMove, correctMove),
    illegalReason: "",
    surrenderIsPrimary,
  };
}

function buildVisualCard(rank) {
  return { rank, suit: randomItem(SUITS) };
}

function buildHandResult(cards, kind) {
  const evaluated = evaluateHand(cards);
  return {
    cards: cards.map(buildVisualCard),
    type: kind,
    total: evaluated.total,
    isSoft: evaluated.isSoft,
    isPair: isPair(cards),
    isBlackjack: evaluated.isBlackjack,
  };
}

function generateHardHand() {
  while (true) {
    const c1 = randomItem(CARD_POOL);
    const c2 = randomItem(CARD_POOL);
    const cards = [c1, c2];
    const hand = evaluateHand(cards);
    if (!isPair(cards) && !hand.isSoft && hand.total >= 5 && hand.total <= 20) return buildHandResult(cards, "hard");
  }
}

function generateSoftHand() {
  return buildHandResult(["A", randomItem(["2", "3", "4", "5", "6", "7", "8", "9"])], "soft");
}

function generatePairHand() {
  const pairRank = randomItem(["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]);
  return buildHandResult([pairRank, pairRank], "pair");
}

function generateHand(type = null) {
  if (type === "hard") return generateHardHand();
  if (type === "soft") return generateSoftHand();
  if (type === "pair") return generatePairHand();
  return randomItem([generateHardHand, generateSoftHand, generatePairHand])();
}

function generateDealerCard() {
  return buildVisualCard(randomItem(DEALER_CARDS));
}

function getButtonClasses(action, locked) {
  const map = {
    hit: "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white border-emerald-800 shadow-[0_6px_18px_rgba(16,185,129,0.28)]",
    stand: "bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 border-amber-700 shadow-[0_6px_18px_rgba(245,158,11,0.28)]",
    surrender: "bg-gradient-to-b from-red-500 to-red-700 text-white border-red-800 shadow-[0_6px_18px_rgba(239,68,68,0.28)]",
    split: "bg-gradient-to-b from-slate-700 to-slate-900 text-white border-slate-950 shadow-[0_6px_18px_rgba(15,23,42,0.28)]",
    double: "bg-gradient-to-b from-slate-700 to-slate-900 text-white border-slate-950 shadow-[0_6px_18px_rgba(15,23,42,0.28)]",
  };
  return `${map[action]} ${locked ? "opacity-45" : ""}`;
}

function IconButton({ children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/85 text-slate-700 shadow-md backdrop-blur-md"
    >
      {children}
    </button>
  );
}

function BrandMark() {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="flex items-center gap-3 min-w-0">
      {imgOk ? (
        <img src={LOGO_SRC} alt="" aria-hidden="true" onError={() => setImgOk(false)} className="h-10 w-10 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]" />
      ) : (
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-b from-emerald-700 to-emerald-900 ring-1 ring-amber-300/70 shadow-md" />
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">21Bust</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = "slate", compact = false, highlight = false }) {
  const tones = {
    slate: "border-white/40 bg-white/78",
    amber: "border-amber-200/70 bg-amber-50/90",
    emerald: "border-emerald-200/70 bg-emerald-50/90",
    blue: "border-sky-200/70 bg-sky-50/90",
    red: "border-red-200/70 bg-red-50/90",
  };

  return (
    <div className={classNames(
      "rounded-2xl border shadow-sm backdrop-blur-md",
      compact ? "min-h-[72px] px-2 py-2" : "p-3",
      tones[tone],
      highlight && "ring-2 ring-amber-200 shadow-[0_8px_20px_rgba(245,158,11,0.18)]"
    )}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className={classNames("mt-1 font-semibold text-slate-900", compact ? "text-sm sm:text-base" : "text-xl")}>
        {value}
      </div>
    </div>
  );
}

function Card({ card, compact = false, emphasis = "neutral" }) {
  const emphasisMap = {
    neutral: "border-slate-200 bg-white",
    correct: "border-emerald-300 bg-emerald-50",
    wrong: "border-red-300 bg-red-50",
    dealer: "border-amber-300 bg-amber-50",
  };

  return (
    <div className={classNames(
      "flex flex-col justify-between rounded-[22px] border shadow-[0_8px_18px_rgba(15,23,42,0.08)]",
      compact ? "h-24 w-16 p-2" : "h-28 w-20 p-3 sm:h-32 sm:w-24",
      emphasisMap[emphasis]
    )} aria-label={`Card ${card.rank}${card.suit.symbol}`}>
      <div>
        <div className={classNames("text-left font-bold leading-none", compact ? "text-lg" : "text-2xl")}>{card.rank}</div>
        <div className={classNames("mt-1 text-left leading-none", compact ? "text-base" : "text-xl", card.suit.color)}>{card.suit.symbol}</div>
      </div>
      <div className="self-end text-right">
        <div className={classNames("leading-none", compact ? "text-base" : "text-xl", card.suit.color)}>{card.suit.symbol}</div>
        <div className={classNames("mt-1 font-bold leading-none", compact ? "text-lg" : "text-2xl")}>{card.rank}</div>
      </div>
    </div>
  );
}

function ActionButton({ label, action, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "h-12 rounded-2xl border px-3 text-base font-semibold active:translate-y-[1px] sm:h-11 sm:text-sm",
        getButtonClasses(action, disabled),
        disabled ? "cursor-not-allowed" : ""
      )}
    >
      {label}
    </button>
  );
}

function ResultPill({ result }) {
  return (
    <span className={classNames(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
      result === FEEDBACK.CORRECT ? "bg-emerald-100 text-emerald-700" :
      result === FEEDBACK.ILLEGAL ? "bg-amber-100 text-amber-700" :
      result === FEEDBACK.FALLBACK ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-700"
    )}>
      {result === FEEDBACK.CORRECT ? "Correct" : result === FEEDBACK.ILLEGAL ? "Unavailable" : result === FEEDBACK.FALLBACK ? "Acceptable" : "Wrong"}
    </span>
  );
}

function TrophyChip({ item, subtle = false, locked = false, showDescription = true }) {
  return (
    <div className={classNames(
      "rounded-2xl border px-3 py-2 text-center shadow-sm backdrop-blur-md",
      locked ? "border-white/20 bg-white/10 text-emerald-50/55" :
      subtle ? "border-amber-200/70 bg-white/12 text-emerald-50" :
      "border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-100 text-slate-900 shadow-[0_8px_18px_rgba(245,158,11,0.18)]"
    )}>
      <div className="text-lg">{item.icon}</div>
      <div className={classNames("mt-1 text-[11px] font-semibold", locked ? "text-emerald-50/70" : "text-inherit")}>{item.label}</div>
      {showDescription && <div className={classNames("mt-1 text-[10px] leading-tight", locked ? "text-emerald-50/55" : "text-slate-600")}>{item.description}</div>}
    </div>
  );
}

function DealerMessageBoard({ items }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-amber-200/70 bg-white/12 px-3 py-2 text-center text-emerald-50 shadow-[0_10px_22px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <div className="text-lg">{item.icon}</div>
          <div className="mt-1 text-[11px] font-semibold">{item.label}</div>
          {item.description && <div className="mt-1 text-[10px] text-emerald-50/80">{item.description}</div>}
        </div>
      ))}
    </div>
  );
}

function RulesPopover({ open, onClose, surrenderEnabled, dasEnabled }) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-14 z-30 w-[320px] max-w-[calc(100vw-2rem)] rounded-3xl border border-white/40 bg-white/92 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Active Rules</div>
          <div className="mt-2 grid gap-1 text-sm text-slate-700">
            <div>Multi-deck Vegas-style basic strategy</div>
            <div>Dealer stands on soft 17 (S17)</div>
            <div>{dasEnabled ? "Double after split enabled (DAS)" : "Double after split disabled (no DAS)"}</div>
            <div>Soft 19 vs 6 stands under this S17 trainer</div>
            <div>11 doubles vs 2-10, hits vs A</div>
            <div>12 stands only vs 4, 5, 6</div>
            <div>{surrenderEnabled ? "Late surrender enabled" : "Late surrender disabled"}</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-slate-500">✕</button>
      </div>
    </div>
  );
}

function ProfilePopover({ open, onClose, showProInput, setShowProInput, proCode, setProCode, showBoard, setSettings }) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-14 z-30 w-[340px] max-w-[calc(100vw-2rem)] rounded-3xl border border-white/40 bg-white/92 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Profile & Progress</div>
          <div className="mt-1 text-xs text-slate-500">Planned header-layer destination. Not on the felt.</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-700">
            <div>• Progress graph</div>
            <div>• Accuracy trend</div>
            <div>• Streak history</div>
            <div>• Trophy history</div>
            <div>• Total training time</div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-slate-500">✕</button>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200">
        {!showProInput ? (
          <button type="button" onClick={() => setShowProInput(true)} className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700 active:bg-amber-800">
            Activate Pro
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={proCode}
              onChange={(e) => setProCode(e.target.value)}
              placeholder="Enter activation code"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (proCode === "Wheels123$") {
                    setSettings((prev) => ({ ...prev, targetedTraining: true, continueHandMode: true }));
                    setShowProInput(false);
                    setProCode("");
                    localStorage.setItem("proUnlocked", "true");
                    showBoard([{ id: "pro-unlock", label: "Pro Activated", icon: "💎", description: "Advanced features unlocked." }]);
                  } else if (proCode) {
                    setProCode("");
                    showBoard([{ id: "invalid-code", label: "Invalid Code", icon: "⚠️", description: "Please try again." }]);
                  }
                }}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Unlock
              </button>
              <button type="button" onClick={() => { setShowProInput(false); setProCode(""); }} className="flex-1 rounded-2xl border border-slate-300 py-3 text-sm font-semibold text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ setting, value, onToggle, infoOpen, onInfoToggle, disabled = false, disabledReason = "" }) {
  return (
    <div className={classNames(
      "rounded-2xl border p-3",
      disabled ? "border-slate-200 bg-slate-100 opacity-70" : "border-white/40 bg-white/72"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{setting.label}</div>
            {setting.paywalled && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Pro</span>}
            <button type="button" onClick={() => onInfoToggle(setting.key)} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-bold text-slate-600">i</button>
          </div>
          {infoOpen && <div className="mt-2 text-xs text-slate-600">{disabledReason || setting.description}</div>}
        </div>
        <button
          type="button"
          disabled={disabled || setting.paywalled}
          onClick={() => onToggle(setting.key)}
          className={classNames(
            "min-w-[76px] rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
            disabled || setting.paywalled ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500" : value ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400 bg-slate-200 text-slate-700"
          )}
        >
          {value ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}

function SettingsPopover({ open, onClose, settings, setSettings, infoState, setInfoState, vibrationSupported }) {
  if (!open) return null;

  function handleToggle(key) {
    const def = SETTING_DEFS.find((item) => item.key === key);
    if (!def || def.paywalled) return;
    if (key === "vibrationEnabled" && !vibrationSupported) return;

    if (key === "dealerPush22") {
      if (!settings.dealerPush22) {
        showBoard([{ id: "rule-change", label: "Rule Change", icon: "⚠️", description: "Strategy changes under this rule." }]);
      }
    }

    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleInfoToggle(key) {
    setInfoState((prev) => (prev === key ? null : key));
  }

  const freeSettings = SETTING_DEFS.filter((s) => !s.paywalled);
  const proSettings = SETTING_DEFS.filter((s) => s.paywalled);

  return (
    <div className="absolute right-0 top-14 z-30 w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl border border-white/40 bg-white/92 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Settings</div>
          <div className="text-xs text-slate-500">Fast training first. Extra controls stay out of the way.</div>
        </div>
        <button type="button" onClick={onClose} className="text-slate-500">✕</button>
      </div>

      <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Free</div>
          <div className="grid gap-3">
            {freeSettings.map((setting) => {
              const vibrationDisabled = setting.key === "vibrationEnabled" && !vibrationSupported;
              return (
                <ToggleRow
                  key={setting.key}
                  setting={setting}
                  value={settings[setting.key]}
                  onToggle={handleToggle}
                  infoOpen={infoState === setting.key}
                  onInfoToggle={handleInfoToggle}
                  disabled={vibrationDisabled}
                  disabledReason={vibrationDisabled ? "This device/browser does not support web vibration. Sound and visual feedback still work." : ""}
                />
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pro</div>
          <div className="grid gap-3">
            {proSettings.map((setting) => (
              <ToggleRow
                key={setting.key}
                setting={setting}
                value={settings[setting.key]}
                onToggle={handleToggle}
                infoOpen={infoState === setting.key}
                onInfoToggle={handleInfoToggle}
                disabled={setting.key === "dealerPush22" || setting.key === "bankrollMode"}
                disabledReason={
                  setting.key === "dealerPush22" ? "Dealer Push on 22 (strategy change) coming soon." :
                  setting.key === "bankrollMode" ? "Bankroll mode (wager tracking + daily refills) coming soon." : ""
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TenHandSummaryModal({ open, onClose, items, handRange, buildHelpLink }) {
  if (!open) return null;
  const safeItems = items || [];
  const scoredItems = safeItems.filter((item) => item.result === FEEDBACK.CORRECT || item.result === FEEDBACK.WRONG || item.result === FEEDBACK.FALLBACK);
  const correctishCount = scoredItems.filter((item) => item.result === FEEDBACK.CORRECT || item.result === FEEDBACK.FALLBACK).length;
  const wrongItems = scoredItems.filter((item) => item.result === FEEDBACK.WRONG);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-slate-900">{correctishCount}/10 Strong Decisions</div>
            <div className="mt-1 text-xs text-slate-600">Hands {handRange}</div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500">✕</button>
        </div>

        <div className="mt-3 max-h-[42vh] overflow-y-auto pr-1">
          {wrongItems.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Clean set. No scored mistakes in this 10-hand block.
            </div>
          ) : (
            <div className="grid gap-3">
              {wrongItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">
                      {item.playerHand.map((c) => c.rank).join(", ")} vs {item.dealerCard.rank}
                    </div>
                    <a href={buildHelpLink(item.playerHand.map((c) => c.rank), item.dealerCard.rank, item.correctMove)} target="_blank" rel="noreferrer" className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-600" title="Open article">↗</a>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    You chose <span className="font-semibold capitalize">{item.selectedMove}</span>. Correct move: <span className="font-semibold capitalize">{item.correctMove}</span>.
                  </div>
                  {item.wrongMoveNote && <div className="mt-2 text-xs text-red-700">{item.wrongMoveNote}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionCompleteModal({ open, onRestart, accuracy, readinessLabel, handsPlayed, newlyUnlocked }) {
  if (!open) return null;
  const vegasThreshold = 97;
  const gap = Math.max(0, vegasThreshold - accuracy);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="text-base font-semibold text-slate-900">Session Complete</div>
        <div className="mt-1 text-xs text-slate-600">
          {handsPlayed}/{SESSION_CAP} hands completed. {accuracy}% accuracy ({readinessLabel}).
        </div>

        <div className="mt-3 max-h-[50vh] overflow-y-auto pr-1">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {gap === 0 ? "You are performing at Vegas-ready level. This is real table execution." : `You are ${gap}% away from Vegas-ready play. Keep stacking clean reps.`}
          </div>

          {newlyUnlocked.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">New rewards unlocked</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {newlyUnlocked.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-amber-200 bg-white/70 p-3 text-center">
                    <div className="text-xl">{item.icon}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-900">{item.label}</div>
                    <div className="mt-1 text-[10px] text-slate-600">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onRestart} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 active:scale-95 active:bg-slate-200 hover:bg-slate-100">
              Start Next Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UpgradePromptModal({ open, onClose, accuracy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-md">
        <div className="text-center">
          <div className="text-2xl mb-2">🚀</div>
          <div className="text-lg font-semibold text-slate-900">You've hit your free limit</div>
          <div className="mt-2 text-sm text-slate-600">
            We can take your score of <span className="font-semibold text-emerald-700">{accuracy}%</span> to Vegas-ready level.
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={onClose} className="rounded-2xl bg-amber-600 py-3.5 text-sm font-semibold text-white hover:bg-amber-700 active:bg-amber-800">
            Upgrade to Pro
          </button>
          <button onClick={onClose} className="rounded-2xl border border-slate-300 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyLimitModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="text-base font-semibold text-slate-900">Daily Free Limit Reached</div>
        <div className="mt-2 text-sm text-slate-600">
          You’ve used all {FREE_SESSIONS_PER_DAY} free sessions for today. Come back tomorrow for more reps or unlock Pro for unlimited practice.
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 active:scale-95 active:bg-slate-200 hover:bg-slate-100">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BlackjackTrainerUI() {
  const [freeSessionsUsedToday, setFreeSessionsUsedToday] = useState(0);
  const [settings, setSettings] = useState({
    surrenderEnabled: false,
    dasEnabled: true,
    showHandTotal: true,
    soundEnabled: true,
    vibrationEnabled: true,
    targetedTraining: false,
    continueHandMode: false,
    dealerPush22: false,
    bankrollMode: false,
    tenHandSummary: false,
  });

  const [bankroll, setBankroll] = useState(300);
  const [currentBet, setCurrentBet] = useState(10);
  const [lastBankrollRefillDate, setLastBankrollRefillDate] = useState("");
  const [bankrollFlash, setBankrollFlash] = useState(null);

  const [showProInput, setShowProInput] = useState(false);
  const [proCode, setProCode] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProgressionPrompt, setShowProgressionPrompt] = useState(false);
  const [progressionShown, setProgressionShown] = useState(false);

  const [currentHand, setCurrentHand] = useState(generateHand());
  const [dealerCard, setDealerCard] = useState(generateDealerCard());
  const [feedback, setFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [cleanHandsCurrent, setCleanHandsCurrent] = useState(0);
  const [cleanHandsMax, setCleanHandsMax] = useState(0);
  const [locked, setLocked] = useState(false);

  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [settingsInfoKey, setSettingsInfoKey] = useState(null);
  const [showTenHandSummary, setShowTenHandSummary] = useState(false);
  const [tenHandBlock, setTenHandBlock] = useState([]);
  const [lastSummaryRange, setLastSummaryRange] = useState("");
  const [showGradeInfo, setShowGradeInfo] = useState(false);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [pendingSessionComplete, setPendingSessionComplete] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
  const [sessionCounted, setSessionCounted] = useState(false);
  const [vibrationSupported, setVibrationSupported] = useState(false);
  const [totalTrainingSeconds, setTotalTrainingSeconds] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const [messageBoardItems, setMessageBoardItems] = useState([]);
  const [pageVisible, setPageVisible] = useState(typeof document === "undefined" ? true : document.visibilityState === "visible");

  const actionTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const trainingTimerRef = useRef(null);
  const boardTimeoutRef = useRef(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem("freeSessionsDate");
    const storedCount = Number(localStorage.getItem("freeSessionsUsedToday") || 0);
    const storedAchievements = JSON.parse(localStorage.getItem("bjAchievements") || "[]");
    const storedTime = Number(localStorage.getItem("bjTrainingSeconds") || 0);
    const storedPro = localStorage.getItem("proUnlocked") === "true";

    const storedBankroll = Number(localStorage.getItem("bjBankroll") || 300);
    const storedBet = Number(localStorage.getItem("bjCurrentBet") || 10);
    const storedRefillDate = localStorage.getItem("bjLastBankrollRefillDate") || "";

    if (storedDate !== today) {
      localStorage.setItem("freeSessionsDate", today);
      localStorage.setItem("freeSessionsUsedToday", "0");
      setFreeSessionsUsedToday(0);
    } else {
      setFreeSessionsUsedToday(storedCount);
    }

    setAchievements(storedAchievements);
    setTotalTrainingSeconds(storedTime);
    setBankroll(storedBankroll);
    setCurrentBet(storedBet);
    setLastBankrollRefillDate(storedRefillDate);

    if (storedPro) {
      setSettings((prev) => ({ ...prev, targetedTraining: true, continueHandMode: true }));
    }
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      setVibrationSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!vibrationSupported && settings.vibrationEnabled) {
      setSettings((prev) => ({ ...prev, vibrationEnabled: false }));
    }
  }, [vibrationSupported, settings.vibrationEnabled]);

  useEffect(() => {
    function handleVisibilityChange() {
      setPageVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    document.title = "21Bust";
    let icon = document.querySelector("link[rel='icon']");
    if (!icon) {
      icon = document.createElement("link");
      document.head.appendChild(icon);
    }
    icon.rel = "icon";
    icon.type = "image/x-icon";
    icon.href = FAVICON_ICO;

    let pngIcon = document.querySelector("link[data-fallback-icon='true']");
    if (!pngIcon) {
      pngIcon = document.createElement("link");
      pngIcon.setAttribute("data-fallback-icon", "true");
      document.head.appendChild(pngIcon);
    }
    pngIcon.rel = "alternate icon";
    pngIcon.type = "image/png";
    pngIcon.href = FAVICON_PNG;

    return () => {
      if (actionTimeoutRef.current) window.clearTimeout(actionTimeoutRef.current);
      if (trainingTimerRef.current) window.clearInterval(trainingTimerRef.current);
      if (boardTimeoutRef.current) window.clearTimeout(boardTimeoutRef.current);
    };
  }, []);

  const isTrainingActive = useMemo(() => {
    return pageVisible && !sessionEnded && !showTenHandSummary && !showSessionComplete && !showDailyLimitModal && !showProfile && !showUpgradeModal;
  }, [pageVisible, sessionEnded, showTenHandSummary, showSessionComplete, showDailyLimitModal, showProfile, showUpgradeModal]);

  useEffect(() => {
    if (!isTrainingActive) {
      if (trainingTimerRef.current) {
        window.clearInterval(trainingTimerRef.current);
        trainingTimerRef.current = null;
      }
      return;
    }
    if (!trainingTimerRef.current) {
      trainingTimerRef.current = window.setInterval(() => {
        setTotalTrainingSeconds((prev) => {
          const next = prev + 1;
          localStorage.setItem("bjTrainingSeconds", String(next));
          return next;
        });
      }, 1000);
    }
  }, [isTrainingActive]);

  // Daily refill
  useEffect(() => {
    const today = new Date().toDateString();
    if (!lastBankrollRefillDate || lastBankrollRefillDate !== today) {
      if (bankroll < 300) {
        const newBankroll = Math.min(300, bankroll + 50);
        setBankroll(newBankroll);
        setLastBankrollRefillDate(today);
        localStorage.setItem("bjBankroll", String(newBankroll));
        localStorage.setItem("bjLastBankrollRefillDate", today);

        setBankrollFlash("refill");
        setTimeout(() => setBankrollFlash(null), 1200);

        showBoard([{ id: "refill", label: "+$50 Refill", icon: "💎", description: "Daily chips restored." }]);
      } else {
        setLastBankrollRefillDate(today);
        localStorage.setItem("bjLastBankrollRefillDate", today);
      }
    }
  }, [lastBankrollRefillDate]);

  // Auto-adjust bet
  useEffect(() => {
    if (bankroll < currentBet) {
      const validBets = [50, 25, 10, 5];
      const newBet = validBets.find(b => b <= bankroll) || 5;
      setCurrentBet(newBet);
      localStorage.setItem("bjCurrentBet", String(newBet));
    }
  }, [bankroll]);

  const playerRanks = useMemo(() => currentHand.cards.map((card) => card.rank), [currentHand]);
  const visibleActions = useMemo(() => (settings.surrenderEnabled ? ALL_ACTIONS : ALL_ACTIONS.filter((action) => action !== MOVE.SURRENDER)), [settings.surrenderEnabled]);
  const accuracy = useMemo(() => (handsPlayed === 0 ? 0 : Math.round((correctCount / handsPlayed) * 100)), [correctCount, handsPlayed]);
  const sessionRemaining = Math.max(0, SESSION_CAP - handsPlayed);

  const milestoneState = useMemo(() => ({ bestStreak, cleanHandsMax, handsPlayed, accuracy, totalTrainingSeconds }), [bestStreak, cleanHandsMax, handsPlayed, accuracy, totalTrainingSeconds]);
  const unlockedSet = useMemo(() => new Set(achievements), [achievements]);

  const readinessLabel = useMemo(() => {
    if (handsPlayed < 10) return "Building";
    if (accuracy >= 97) return "Vegas Ready";
    if (accuracy >= 93) return "Sharp";
    if (accuracy >= 88) return "Improving";
    return "Needs Work";
  }, [accuracy, handsPlayed]);

  const gradeInfo = "Status is based on live scored accuracy. 97%+ is Vegas Ready, 93%+ is Sharp, 88%+ is Improving.";

  function incrementSessionCount() {
    const next = freeSessionsUsedToday + 1;
    setFreeSessionsUsedToday(next);
    localStorage.setItem("freeSessionsUsedToday", String(next));
  }

  function getAudioContext() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
    return audioContextRef.current;
  }

  async function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
    return ctx.state === "running" ? ctx : null;
  }

  async function playCorrectTone() {
    if (!settings.soundEnabled) return;
    const ctx = await unlockAudio();
    if (!ctx) return;
    try {
      const osc1 = ctx.createOscillator(); const gain1 = ctx.createGain();
      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(720, ctx.currentTime);
      gain1.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.11);
      osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.12);

      const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(960, ctx.currentTime + 0.05);
      gain2.gain.setValueAtTime(0.0001, ctx.currentTime + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc2.start(ctx.currentTime + 0.05); osc2.stop(ctx.currentTime + 0.17);
    } catch {}
  }

  async function playWrongTone() {
    if (!settings.soundEnabled) return;
    const ctx = await unlockAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(185, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.24);
    } catch {}
  }

  async function playCrowdBuild(level) {
    if (!settings.soundEnabled) return;
    const ctx = await unlockAudio();
    if (!ctx) return;
    try {
      const count = Math.min(4, Math.max(1, Math.floor(level / 5)));
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.09;
        osc.type = "triangle";
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(420 + i * 60, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.035, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
        osc.start(start); osc.stop(start + 0.2);
      }
    } catch {}
  }

  async function playCrowdDisappointment() {
    if (!settings.soundEnabled) return;
    const ctx = await unlockAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.36);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.38);
    } catch {}
  }

  async function playApplause() {
    if (!settings.soundEnabled) return;
    const ctx = await unlockAudio();
    if (!ctx) return;
    try {
      for (let i = 0; i < 6; i++) {
        const bufferSize = Math.floor(ctx.sampleRate * 0.04);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize / 7));
        const source = ctx.createBufferSource(); const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.06;
        source.buffer = buffer; source.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
        source.start(start);
      }
    } catch {}
  }

  function maybeVibrateWrong() {
    if (!settings.vibrationEnabled || !vibrationSupported || typeof navigator === "undefined") return;
    try { navigator.vibrate([80, 40, 110]); } catch {}
  }

  function showBoard(items) {
    setMessageBoardItems(items);
    if (boardTimeoutRef.current) window.clearTimeout(boardTimeoutRef.current);
    boardTimeoutRef.current = window.setTimeout(() => setMessageBoardItems([]), 2200);
  }

  function buildHelpLink(handRanks, dealerRank, correctMove) {
    const rules = [
      settings.surrenderEnabled ? "surrender-on" : "surrender-off",
      settings.dasEnabled ? "das-on" : "das-off",
      settings.dealerPush22 ? "push22-on" : "push22-off",
    ].join("-");
    const hand = handRanks.join("-");
    const slug = `${correctMove}-${hand}-vs-${dealerRank}`.toLowerCase();
    return `https://21bust.com/blackjack/${rules}/${slug}`;
  }

  function checkAchievements(stateOverride = null) {
    const state = stateOverride || milestoneState;
    setAchievements((prevAchievements) => {
      const prevSet = new Set(prevAchievements);
      const newly = FREE_TROPHIES.filter((item) => !prevSet.has(item.id) && item.check(state));
      if (newly.length === 0) return prevAchievements;
      const nextAchievements = [...prevAchievements, ...newly.map((item) => item.id)];
      localStorage.setItem("bjAchievements", JSON.stringify(nextAchievements));
      setNewlyUnlocked(newly);
      showBoard(newly);
      void playApplause();
      return nextAchievements;
    });
  }

  function loadNextHand() {
    setFeedback(null);
    setLocked(false);
    setCurrentHand(generateHand());
    setDealerCard(generateDealerCard());
  }

  function handleTenHandSummaryClose() {
    setShowTenHandSummary(false);
    setTimeout(() => {
      if (pendingSessionComplete) {
        setPendingSessionComplete(false);
        setShowSessionComplete(true);
      }
    }, 180);
  }

  const getFeedbackDelay = (outcome) => {
    if (outcome === FEEDBACK.CORRECT) return 700;
    if (outcome === FEEDBACK.FALLBACK) return 800;
    if (outcome === FEEDBACK.ILLEGAL) return 700;
    return 1050;
  };

  function handleAction(action) {
    if (locked || handsPlayed >= SESSION_CAP || sessionEnded || bankroll <= 0) return;

    if (bankroll < currentBet) {
      showBoard([{ id: "low-chips", label: "Low Chips", icon: "⚠️", description: "Not enough chips for current bet." }]);
      return;
    }

    const result = evaluateDecision(playerRanks, dealerCard.rank, action, {
      surrenderEnabled: settings.surrenderEnabled,
      dasEnabled: settings.dasEnabled,
    });

    const historyEntryBase = {
      id: `${Date.now()}-${Math.random()}`,
      playerHand: currentHand.cards,
      dealerCard,
      selectedMove: result.playerMove,
      correctMove: result.correctMove,
      fallbackMove: result.fallbackMove,
      result: result.outcome,
      wrongMoveNote: result.wrongMoveNote,
      illegalReason: result.illegalReason,
    };

    if (result.outcome === FEEDBACK.ILLEGAL) {
      setLocked(true);
      setFeedback(result);
      setHistory((prev) => [historyEntryBase, ...prev].slice(0, 100));

      if (actionTimeoutRef.current) window.clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        setLocked(false);
      }, 700);
      return;
    }

    const nextHandsPlayed = handsPlayed + 1;
    const nextCorrectCount = correctCount + (result.outcome === FEEDBACK.CORRECT || result.outcome === FEEDBACK.FALLBACK ? 1 : 0);
    const nextStreak = result.outcome === FEEDBACK.CORRECT || result.outcome === FEEDBACK.FALLBACK ? streak + 1 : 0;
    const nextBestStreak = Math.max(bestStreak, nextStreak);
    const nextCleanCurrent = result.outcome === FEEDBACK.CORRECT || result.outcome === FEEDBACK.FALLBACK ? cleanHandsCurrent + 1 : 0;
    const nextCleanMax = Math.max(cleanHandsMax, nextCleanCurrent);
    const reachedSessionCap = nextHandsPlayed >= SESSION_CAP;
    const finalTenHandSummary = settings.tenHandSummary && nextHandsPlayed % 10 === 0;

    const historyEntry = { ...historyEntryBase, result: result.outcome };

    setLocked(true);
    setHandsPlayed(nextHandsPlayed);
    setFeedback({
      ...result,
      streakMilestone: (result.outcome === FEEDBACK.CORRECT || result.outcome === FEEDBACK.FALLBACK) && nextStreak % 5 === 0 ? nextStreak : null,
    });

    // Bankroll impact
    let bankrollDelta = 0;
    if (result.outcome === FEEDBACK.CORRECT || result.outcome === FEEDBACK.FALLBACK) {
      bankrollDelta = currentBet;
    } else if (result.outcome === FEEDBACK.WRONG) {
      bankrollDelta = -currentBet;
    }

    const newBankroll = Math.max(0, bankroll + bankrollDelta);
    setBankroll(newBankroll);
    localStorage.setItem("bjBankroll", String(newBankroll));

    if (bankrollDelta !== 0) {
      const flashType = bankrollDelta > 0 ? "gain" : "loss";
      setBankrollFlash(flashType);
      setTimeout(() => setBankrollFlash(null), 800);

      showBoard([{
        id: `bankroll-${Date.now()}`,
        label: `${bankrollDelta > 0 ? "+" : ""}$${Math.abs(bankrollDelta)}`,
        icon: bankrollDelta > 0 ? "💰" : "📉",
        description: bankrollDelta > 0 ? "Good decision" : "Tough beat"
      }]);
    }

    if (result.outcome === FEEDBACK.CORRECT || result.outcome === FEEDBACK.FALLBACK) {
      void playCorrectTone();
      setCorrectCount(nextCorrectCount);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setCleanHandsCurrent(nextCleanCurrent);
      setCleanHandsMax(nextCleanMax);

      if (nextStreak % 5 === 0) {
        void playCrowdBuild(nextStreak);
        showBoard([{ id: `crowd-${nextStreak}`, label: `${nextStreak}-Streak`, icon: "📣", description: "Crowd momentum building." }]);
      }
    } else {
      if (streak >= 5) {
        void playCrowdDisappointment();
        showBoard([{ id: `lost-${Date.now()}`, label: "Streak Lost", icon: "😮", description: "Crowd energy dropped." }]);
      } else {
        void playWrongTone();
      }
      setStreak(0);
      setCleanHandsCurrent(0);
      maybeVibrateWrong();
    }

    setHistory((prev) => [historyEntry, ...prev].slice(0, 100));
    setTenHandBlock((prev) => [...prev, historyEntry].slice(-10));

    checkAchievements({
      bestStreak: nextBestStreak,
      cleanHandsMax: nextCleanMax,
      handsPlayed: nextHandsPlayed,
      accuracy: Math.round((nextCorrectCount / nextHandsPlayed) * 100),
      totalTrainingSeconds,
    });

    const nextAccuracy = Math.round((nextCorrectCount / nextHandsPlayed) * 100);
    if (!progressionShown && (nextStreak >= 8 || nextAccuracy >= 94) && nextHandsPlayed >= 15) {
      setShowProgressionPrompt(true);
      setProgressionShown(true);
    }

    if (reachedSessionCap) setSessionEnded(true);

    if (actionTimeoutRef.current) window.clearTimeout(actionTimeoutRef.current);
    actionTimeoutRef.current = window.setTimeout(() => {
      if (!reachedSessionCap) {
        loadNextHand();
        return;
      }

      if (!sessionCounted) {
        incrementSessionCount();
        setSessionCounted(true);
      }

      setSessionEnded(true);

      if (finalTenHandSummary) {
        setLastSummaryRange(`${nextHandsPlayed - 9}-${nextHandsPlayed}`);
        setPendingSessionComplete(true);
        setShowTenHandSummary(true);
      } else if (freeSessionsUsedToday + 1 >= FREE_SESSIONS_PER_DAY) {
        setShowUpgradeModal(true);
      } else {
        setShowSessionComplete(true);
      }
    }, getFeedbackDelay(result.outcome));
  }

  function restartSession() {
    const shouldCount = handsPlayed >= HALF_SESSION_MARK && !sessionCounted;
    if (shouldCount) incrementSessionCount();

    if (actionTimeoutRef.current) window.clearTimeout(actionTimeoutRef.current);

    setCurrentHand(generateHand());
    setDealerCard(generateDealerCard());
    setFeedback(null);
    setHistory([]);
    setHandsPlayed(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setCleanHandsCurrent(0);
    setCleanHandsMax(0);
    setLocked(false);
    setShowTenHandSummary(false);
    setTenHandBlock([]);
    setLastSummaryRange("");
    setShowSessionComplete(false);
    setPendingSessionComplete(false);
    setSessionEnded(false);
    setShowDailyLimitModal(false);
    setSessionCounted(false);
    setNewlyUnlocked([]);
    setMessageBoardItems([]);
    setShowUpgradeModal(false);
    setShowProgressionPrompt(false);
    setProgressionShown(false);
    setBankrollFlash(null);
  }

  const playerPanelState = feedback == null ? "border-white/20 bg-white/10" :
    feedback.outcome === FEEDBACK.CORRECT ? "border-emerald-200 bg-emerald-50" :
    feedback.outcome === FEEDBACK.FALLBACK ? "border-sky-200 bg-sky-50" :
    feedback.outcome === FEEDBACK.ILLEGAL ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50";

  const cardEmphasis = feedback == null ? "neutral" :
    (feedback.outcome === FEEDBACK.CORRECT || feedback.outcome === FEEDBACK.FALLBACK) ? "correct" :
    feedback.outcome === FEEDBACK.ILLEGAL ? "neutral" : "wrong";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc_0%,#eef2f7_36%,#e9eef4_100%)] text-slate-900 relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-4 sm:px-6 sm:pt-6 sm:pb-6 relative z-10">
        <header className="mb-4 flex flex-col gap-3">
          <div className="text-sm text-slate-600">
            Free Sessions Today: {freeSessionsUsedToday} / {FREE_SESSIONS_PER_DAY}
          </div>

          <div className="flex items-center justify-between gap-3">
            <BrandMark />
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <IconButton onClick={() => { setShowRules((prev) => !prev); setShowSettings(false); setShowProfile(false); }} title="Info">i</IconButton>
                <RulesPopover open={showRules} onClose={() => setShowRules(false)} surrenderEnabled={settings.surrenderEnabled} dasEnabled={settings.dasEnabled} />
              </div>

              <div className="relative">
                <IconButton onClick={() => { setShowProfile((prev) => !prev); setShowRules(false); setShowSettings(false); }} title="Profile">👤</IconButton>
                <ProfilePopover open={showProfile} onClose={() => setShowProfile(false)} showProInput={showProInput} setShowProInput={setShowProInput} proCode={proCode} setProCode={setProCode} showBoard={showBoard} setSettings={setSettings} />
              </div>

              <div className="relative">
                <IconButton onClick={() => { setShowSettings((prev) => !prev); setShowRules(false); setShowProfile(false); }} title="Settings">⚙</IconButton>
                <SettingsPopover open={showSettings} onClose={() => setShowSettings(false)} settings={settings} setSettings={setSettings} infoState={settingsInfoKey} setInfoState={setSettingsInfoKey} vibrationSupported={vibrationSupported} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 overflow-x-auto pb-1">
            <div className="min-w-[88px]"><StatCard label="Acc" value={`${accuracy}%`} tone="amber" compact highlight={accuracy >= 97 && handsPlayed >= 10} /></div>
            <div className="min-w-[88px]"><StatCard label="Hands" value={handsPlayed} tone="blue" compact /></div>
            <div className="min-w-[88px]"><StatCard label="Streak" value={streak} tone="emerald" compact highlight={streak >= 5} /></div>
            <div className="relative min-w-[96px]">
              <StatCard label="Status" value={readinessLabel} tone="slate" compact />
            </div>
            <div className="min-w-[88px]">
              <StatCard label="Bankroll" value={`$${bankroll}`} tone={bankrollFlash === "gain" ? "emerald" : bankrollFlash === "loss" ? "red" : "slate"} compact highlight={bankrollFlash !== null} />
            </div>
            <div className="min-w-[88px]"><StatCard label="Left" value={sessionRemaining} tone="slate" compact /></div>
          </div>
        </header>

        <main className="grid gap-4 sm:gap-6 relative">
          <TenHandSummaryModal open={showTenHandSummary} onClose={handleTenHandSummaryClose} items={tenHandBlock} handRange={lastSummaryRange} buildHelpLink={buildHelpLink} />
          <SessionCompleteModal open={showSessionComplete} onRestart={restartSession} accuracy={accuracy} readinessLabel={readinessLabel} handsPlayed={handsPlayed} newlyUnlocked={newlyUnlocked} />
          <UpgradePromptModal open={showUpgradeModal} onClose={() => { setShowUpgradeModal(false); setSessionEnded(true); }} accuracy={accuracy} />
          <DailyLimitModal open={showDailyLimitModal} onClose={() => setShowDailyLimitModal(false)} />

          <section className="overflow-hidden rounded-[32px] border border-emerald-950/40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_rgba(255,255,255,0)_30%),linear-gradient(180deg,#065f46_0%,#064e3b_48%,#073b31_100%)] p-[1px] shadow-[0_30px_70px_rgba(6,78,59,0.24)] relative">
            <div className="relative rounded-[31px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 backdrop-blur-sm sm:p-6">
              {/* Logo Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <img src={MASTER_LOGO} alt="" className="w-[70%] max-w-[420px] opacity-10 select-none" />
              </div>

              <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/80">Dealer</div>
                      <div className="mt-3 flex items-center gap-3">
                        <Card card={dealerCard} compact emphasis="dealer" />
                      </div>
                    </div>
                    <div className="min-h-[96px] min-w-[220px] md:pt-6">
                      <DealerMessageBoard items={messageBoardItems} />
                    </div>
                  </div>

                  <section className={classNames("rounded-3xl border p-4 shadow-lg backdrop-blur-md sm:p-6", playerPanelState)}>
                    <div>
                      <div className={classNames("text-xs font-semibold uppercase tracking-[0.22em]", feedback == null ? "text-emerald-50/80" : "text-slate-500")}>
                        Your Hand
                      </div>
                      {settings.showHandTotal && <div className={classNames("mt-1 text-sm", feedback == null ? "text-emerald-50/75" : "text-slate-600")}>Total: {currentHand.total}</div>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {currentHand.cards.map((card, idx) => (
                        <Card key={`${card.rank}-${card.suit.symbol}-${idx}`} card={card} emphasis={cardEmphasis} />
                      ))}
                    </div>
                  </section>

                  {/* Bet Selection */}
                  <section className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/80">Bet</div>
                      <div className="text-[11px] text-emerald-50/65">Current: ${currentBet}</div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[5, 10, 25, 50].map((bet) => (
                        <button
                          key={bet}
                          onClick={() => {
                            if (bankroll >= bet) {
                              setCurrentBet(bet);
                              localStorage.setItem("bjCurrentBet", String(bet));
                            }
                          }}
                          disabled={bankroll < bet}
                          className={classNames(
                            "h-10 rounded-2xl border text-sm font-semibold transition-all",
                            currentBet === bet ? "bg-amber-500 border-amber-600 text-white shadow-md" :
                            bankroll >= bet ? "bg-white/80 border-white/40 text-slate-900 hover:bg-white" :
                            "bg-white/10 border-white/20 text-emerald-50/40 cursor-not-allowed"
                          )}
                        >
                          ${bet}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/80">Actions</div>
                      <div className="text-[11px] text-emerald-50/65">{locked ? "Checking..." : "Tap fast"}</div>
                    </div>
                    <div className={`mt-3 grid gap-2 ${visibleActions.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-5"}`}>
                      {visibleActions.map((action) => (
                        <ActionButton
                          key={action}
                          label={action.charAt(0).toUpperCase() + action.slice(1)}
                          action={action}
                          onClick={() => handleAction(action)}
                          disabled={locked || handsPlayed >= SESSION_CAP || sessionEnded || bankroll <= 0}
                        />
                      ))}
                    </div>
                  </section>

                  <section className={classNames("min-h-[92px] rounded-3xl border p-4 shadow-lg backdrop-blur-md sm:p-5", feedback == null ? "border-white/20 bg-white/12 text-white" : feedback.outcome === FEEDBACK.CORRECT ? "border-emerald-200 bg-emerald-50" : feedback.outcome === FEEDBACK.FALLBACK ? "border-sky-200 bg-sky-50" : feedback.outcome === FEEDBACK.ILLEGAL ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50")} aria-live="polite">
                    {feedback == null ? (
                      <div className="text-sm text-emerald-50/85">
                        Select the best move. Correct answers move fast. Wrong answers stay slightly longer so the pattern locks in.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className={classNames("text-sm font-semibold", feedback.outcome === FEEDBACK.CORRECT ? "text-emerald-700" : feedback.outcome === FEEDBACK.FALLBACK ? "text-sky-700" : feedback.outcome === FEEDBACK.ILLEGAL ? "text-amber-700" : "text-red-700")}>
                              {feedback.outcome === FEEDBACK.CORRECT ? `Correct — ${feedback.correctMove}` : feedback.outcome === FEEDBACK.FALLBACK ? `Acceptable — ${feedback.playerMove}` : feedback.outcome === FEEDBACK.ILLEGAL ? "Unavailable" : `Wrong — ${feedback.correctMove}`}
                            </div>
                            <div className="text-sm text-slate-700">
                              {feedback.outcome === FEEDBACK.ILLEGAL ? feedback.illegalReason : feedback.explanation}
                            </div>
                            {feedback.outcome === FEEDBACK.WRONG && feedback.wrongMoveNote && <div className="mt-1 text-sm text-red-700">{feedback.wrongMoveNote}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

                <aside className="w-full lg:justify-self-end">
                  <div className="rounded-3xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/80">Trophies</div>
                      <div className="text-[11px] text-emerald-50/65">{achievements.length}/{FREE_TROPHIES.length + PRO_TROPHIES.length}</div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {FREE_TROPHIES.map((item) => (
                        <TrophyChip key={item.id} item={item} subtle={false} locked={!(unlockedSet.has(item.id) || item.check(milestoneState))} showDescription />
                      ))}
                    </div>
                    <div className="mt-4 border-t border-white/15 pt-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50/70">Pro Trophies</div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {PRO_TROPHIES.map((item) => <TrophyChip key={item.id} item={item} locked showDescription />)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/80">Recent Hands</div>
                    <div className="mt-2 text-xs text-emerald-50/65">Recent history includes scored hands and unavailable choices.</div>
                  </div>

                  <div className="mt-4 h-[360px] overflow-y-auto rounded-2xl border border-white/20 bg-white/90 shadow-lg">
                    {history.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-slate-500">No hands answered yet.</div>
                    ) : (
                      history.map((entry) => (
                        <div key={entry.id} className="border-t border-slate-200 px-4 py-3 first:border-t-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {entry.playerHand.map((card, cardIndex) => (
                                  <span key={`${entry.id}-${cardIndex}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                    <span>{card.rank}</span>
                                    <span className={card.suit.color}>{card.suit.symbol}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                Dealer {entry.dealerCard.rank}
                                <span className={`ml-1 ${entry.dealerCard.suit.color}`}>{entry.dealerCard.suit.symbol}</span>
                              </div>
                            </div>
                            <ResultPill result={entry.result} />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600 capitalize">
                            <div>
                              You: <span className="font-semibold">{entry.selectedMove}</span>
                              {entry.correctMove && <> · Best: <span className="font-semibold">{entry.correctMove}</span></>}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/40 bg-white/78 p-4 shadow-lg backdrop-blur-md sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session Progress</div>
                <div className="mt-1 text-sm text-slate-700">{SESSION_CAP}-hand session cap. Restart to begin a new tracked block.</div>
                <button type="button" onClick={restartSession} className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 active:scale-95 active:bg-slate-200 hover:bg-slate-100">
                  Restart Session
                </button>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best Streak</div>
                <div className="mt-1 text-sm text-slate-700">{bestStreak} hands</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clean Run</div>
                <div className="mt-1 text-sm text-slate-700">{cleanHandsMax} hands without scored mistakes</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Training Time</div>
                <div className="mt-1 text-sm text-slate-700">{Math.floor(totalTrainingSeconds / 60)}m {totalTrainingSeconds % 60}s</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}