const DEFAULT_UNIT_RANK = 1;
const MIN_UNIT_RANK = 1;

const state = {
  optionsData: null,
  ritualsData: null,
  baseRank: DEFAULT_UNIT_RANK,
  unitUpgrade: 0,
  regionalModifier: 0,
  ritual: "none",
  activityType: null,
  selectedAssignmentId: null
};

let els = {};
let RITUALS = {};

function getElements() {
  els = {
    characterName: document.querySelector("#characterName"),
    unitName: document.querySelector("#unitName"),
    activityType: document.querySelector("#activityType"),
    baseRank: document.querySelector("#baseRank"),
    unitUpgrade: document.querySelector("#unitUpgrade"),
    ritualSelect: document.querySelector("#ritualSelect"),
    regionalModifier: document.querySelector("#regionalModifier"),
    effectiveRankDisplay: document.querySelector("#effectiveRankDisplay"),
    effectiveRankNote: document.querySelector("#effectiveRankNote"),
    ritualNote: document.querySelector("#ritualNote"),
    resetPlanner: document.querySelector("#resetPlanner"),
    assignmentSelect: document.querySelector("#assignmentSelect"),
    modifierBreakdown: document.querySelector("#modifierBreakdown"),
    resultSummary: document.querySelector("#resultSummary"),
    assignments: document.querySelector("#assignments"),
    emptyState: document.querySelector("#emptyState"),
    copySummary: document.querySelector("#copySummary"),
    detailsDialog: document.querySelector("#detailsDialog"),
    closeDialog: document.querySelector("#closeDialog"),
    dialogContent: document.querySelector("#dialogContent")
  };
}

function requiredElementsExist() {
  return Object.values(els).every(Boolean);
}

function showFatalError(message) {
  const target = document.querySelector("main") || document.body;
  const errorBox = document.createElement("div");
  errorBox.className = "empty-state fatal-error";
  errorBox.textContent = message;
  target.innerHTML = "";
  target.appendChild(errorBox);
}

function buildRituals(ritualsData) {
  const rituals = {};

  (ritualsData.rituals || []).forEach(ritual => {
    rituals[ritual.id] = {
      id: ritual.id,
      name: ritual.name,
      activity: ritual.activity || "All",
      rankModifier: Number(ritual.rankModifier || 0),
      multiplier: Number(ritual.multiplier || 1),
      bonusCoin: Number(ritual.bonusCoin || 0),
      note: ritual.note || ritual.name
    };
  });

  if (!rituals.none) {
    rituals.none = {
      id: "none",
      name: "No ritual",
      activity: "All",
      rankModifier: 0,
      multiplier: 1,
      bonusCoin: 0,
      note: "No ritual selected."
    };
  }

  return rituals;
}

function getActivities() {
  return state.optionsData.activities || [];
}

function getActivityById(id = state.activityType) {
  return getActivities().find(activity => activity.id === id);
}

function getAssignments(activity = getActivityById()) {
  return activity ? activity.assignments || [] : [];
}

function getAssignmentById(id = state.selectedAssignmentId) {
  for (const activity of getActivities()) {
    const assignment = (activity.assignments || []).find(item => item.id === id);
    if (assignment) {
      return {
        ...assignment,
        activityId: activity.id,
        activityName: activity.name
      };
    }
  }
  return null;
}

function getMaxRank() {
  return Number(state.optionsData.maxRank || 10);
}

function getCurrentRitual() {
  return RITUALS[state.ritual] || RITUALS.none;
}

function getEffectiveRank() {
  const ritual = getCurrentRitual();
  const raw = state.baseRank + state.unitUpgrade + state.regionalModifier + ritual.rankModifier;
  return Math.max(MIN_UNIT_RANK, Math.min(getMaxRank(), raw));
}

function isCoinReward(name) {
  return name.toLowerCase().includes("coin") || name.toLowerCase().includes("money") || name.toLowerCase().includes("rings");
}

function getRewardAmount(reward, rank = getEffectiveRank()) {
  const ritual = getCurrentRitual();
  let amount = Number(reward.ranks[String(rank)] ?? 0);

  if (ritual.multiplier !== 1) {
    amount = Math.floor(amount * ritual.multiplier);
  }

  if (ritual.bonusCoin && isCoinReward(reward.name)) {
    amount += ritual.bonusCoin;
  }

  return amount;
}

function getProducedRewards(assignment = getAssignmentById(), rank = getEffectiveRank()) {
  if (!assignment) return [];

  const produced = (assignment.rewards || [])
    .map(reward => ({
      name: reward.name,
      amount: getRewardAmount(reward, rank)
    }))
    .filter(item => item.amount > 0);

  const ritual = getCurrentRitual();
  if (ritual.bonusCoin && !produced.some(item => isCoinReward(item.name))) {
    produced.push({ name: "Coin", amount: ritual.bonusCoin });
  }

  return produced;
}

function populateActivitySelect() {
  els.activityType.innerHTML = "";

  getActivities().forEach(activity => {
    const option = document.createElement("option");
    option.value = activity.id;
    option.textContent = activity.name;
    els.activityType.appendChild(option);
  });

  if (!state.activityType && getActivities().length) {
    state.activityType = getActivities()[0].id;
  }

  els.activityType.value = state.activityType;
}

function populateBaseRankSelect() {
  els.baseRank.innerHTML = "";

  for (let i = MIN_UNIT_RANK; i <= getMaxRank(); i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `Rank ${i}`;
    els.baseRank.appendChild(option);
  }

  els.baseRank.value = String(state.baseRank);
}

function populateUpgradeSelect() {
  els.unitUpgrade.innerHTML = "";

  for (let i = 0; i <= getMaxRank() - MIN_UNIT_RANK; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = i === 0 ? "No upgrade" : `+${i} upgrade${i === 1 ? "" : "s"}`;
    els.unitUpgrade.appendChild(option);
  }

  els.unitUpgrade.value = String(state.unitUpgrade);
}

function populateRegionalModifierSelect() {
  els.regionalModifier.innerHTML = "";

  for (let i = -4; i <= 4; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);

    if (i === 0) option.textContent = "No regional modifier";
    else if (i > 0) option.textContent = `+${i} regional buff`;
    else option.textContent = `${i} regional debuff`;

    els.regionalModifier.appendChild(option);
  }

  els.regionalModifier.value = String(state.regionalModifier);
}

function isRitualAvailable(ritual) {
  const activity = getActivityById();
  if (!ritual) return false;
  if (ritual.id === "none") return true;
  if (ritual.activity === "All") return true;
  return ritual.activity === activity?.name;
}

function populateRitualSelect() {
  els.ritualSelect.innerHTML = "";
  const activity = getActivityById();
  const available = Object.values(RITUALS).filter(isRitualAvailable);

  if (!available.some(ritual => ritual.id === state.ritual)) {
    state.ritual = "none";
  }

  const noRitual = available.filter(ritual => ritual.id === "none");
  const activitySpecific = available.filter(ritual => ritual.id !== "none" && ritual.activity === activity?.name);
  const allRituals = available.filter(ritual => ritual.id !== "none" && ritual.activity === "All");

  function makeOption(ritual) {
    const option = document.createElement("option");
    option.value = ritual.id;
    option.textContent = ritual.note && ritual.note !== ritual.name
      ? `${ritual.name} — ${ritual.note}`
      : ritual.name;
    return option;
  }

  noRitual.forEach(ritual => els.ritualSelect.appendChild(makeOption(ritual)));

  if (activitySpecific.length) {
    const group = document.createElement("optgroup");
    group.label = `${activity.name} rituals`;
    activitySpecific.forEach(ritual => group.appendChild(makeOption(ritual)));
    els.ritualSelect.appendChild(group);
  }

  if (allRituals.length) {
    const group = document.createElement("optgroup");
    group.label = "All activities";
    allRituals.forEach(ritual => group.appendChild(makeOption(ritual)));
    els.ritualSelect.appendChild(group);
  }

  els.ritualSelect.value = state.ritual;
}

function populateAssignmentSelect() {
  els.assignmentSelect.innerHTML = "";
  const assignments = getAssignments();

  assignments.forEach(assignment => {
    const option = document.createElement("option");
    option.value = assignment.id;
    option.textContent = assignment.name;
    els.assignmentSelect.appendChild(option);
  });

  if (!assignments.some(item => item.id === state.selectedAssignmentId)) {
    state.selectedAssignmentId = assignments[0]?.id || null;
  }

  els.assignmentSelect.value = state.selectedAssignmentId || "";
}

function rewardRowHtml(reward, rank = getEffectiveRank()) {
  const amount = getRewardAmount(reward, rank);
  return `
    <div class="reward-row">
      <span>${reward.name}</span>
      <strong>×${amount}</strong>
    </div>
  `;
}

function renderEffectiveRank() {
  const rank = getEffectiveRank();
  const ritual = getCurrentRitual();
  const activity = getActivityById();

  els.effectiveRankDisplay.textContent = rank;

  const parts = [`Base rank ${state.baseRank}`];
  if (state.unitUpgrade) parts.push(`+${state.unitUpgrade} upgrade`);
  if (state.regionalModifier) parts.push(`${state.regionalModifier > 0 ? "+" : ""}${state.regionalModifier} regional`);
  if (ritual.rankModifier) parts.push(`${ritual.rankModifier > 0 ? "+" : ""}${ritual.rankModifier} ${ritual.name}`);

  els.effectiveRankNote.textContent = `${activity?.name || "Military activity"}: ${parts.join(" ")} = Effective Unit Rank ${rank}`;
  els.ritualNote.textContent = ritual.note;

  const bonusCoinRow = ritual.bonusCoin
    ? `<div class="breakdown-row"><span>Bonus Coin</span><strong>+${ritual.bonusCoin} included below</strong></div>`
    : "";

  els.modifierBreakdown.innerHTML = `
    <div class="breakdown-row"><span>Activity</span><strong>${activity?.name || "N/A"}</strong></div>
    <div class="breakdown-row"><span>Base unit rank</span><strong>${state.baseRank}</strong></div>
    <div class="breakdown-row"><span>Unit upgrade</span><strong>+${state.unitUpgrade}</strong></div>
    <div class="breakdown-row"><span>Regional buff/debuff</span><strong>${state.regionalModifier > 0 ? "+" : ""}${state.regionalModifier}</strong></div>
    <div class="breakdown-row"><span>Ritual</span><strong>${ritual.name}</strong></div>
    <div class="breakdown-row"><span>Ritual rank change</span><strong>${ritual.rankModifier > 0 ? "+" : ""}${ritual.rankModifier}</strong></div>
    <div class="breakdown-row"><span>Result multiplier</span><strong>${ritual.multiplier === 1 ? "×1" : `×${ritual.multiplier}`}</strong></div>
    ${bonusCoinRow}
    <div class="breakdown-row breakdown-row--total"><span>Effective unit rank</span><strong>${rank}</strong></div>
  `;
}

function renderAssignments() {
  const assignments = getAssignments();
  const rank = getEffectiveRank();
  const activity = getActivityById();

  els.assignments.innerHTML = "";
  els.emptyState.hidden = assignments.length !== 0;

  assignments.forEach(assignment => {
    const card = document.createElement("article");
    card.className = "assignment-card";
    if (assignment.id === state.selectedAssignmentId) card.classList.add("assignment-card--selected");

    const rewards = (assignment.rewards || []).slice(0, 5);

    card.innerHTML = `
      <div class="assignment-card__header">
        <div>
          <h3>${assignment.name}</h3>
          <span class="type-pill">${assignment.type || activity.name}</span>
        </div>
        <span class="rank-pill">Rank ${rank}</span>
      </div>
      <p>${assignment.description || "No description yet."}</p>
      <div class="rewards-list">
        ${rewards.map(reward => rewardRowHtml(reward, rank)).join("")}
      </div>
      <div class="card-actions">
        <button type="button" data-action="choose" data-assignment-id="${assignment.id}">${assignment.id === state.selectedAssignmentId ? "Selected" : "Choose"}</button>
        <button type="button" data-action="details" data-assignment-id="${assignment.id}">Details</button>
      </div>
    `;

    els.assignments.appendChild(card);
  });
}

function renderSelectedOutput() {
  const assignment = getAssignmentById();
  const produced = getProducedRewards(assignment);

  if (!assignment) {
    els.resultSummary.innerHTML = `<p class="empty-mini">Choose an assignment.</p>`;
    return;
  }

  if (!produced.length) {
    els.resultSummary.innerHTML = `<p class="empty-mini">No result at effective rank ${getEffectiveRank()}.</p>`;
    return;
  }

  els.resultSummary.innerHTML = produced.map(item => `
    <div class="summary-item">
      <span>${item.name}</span>
      <strong>×${item.amount}</strong>
    </div>
  `).join("");
}

function renderAll() {
  populateRitualSelect();
  populateAssignmentSelect();
  renderEffectiveRank();
  renderAssignments();
  renderSelectedOutput();
  saveState();
}

function chooseAssignment(id) {
  state.selectedAssignmentId = id;
  renderAll();
  const assignment = getAssignmentById(id);
  showToast(`${assignment.name} selected.`);
}

function openDetails(id) {
  const assignment = getAssignmentById(id);
  const rank = getEffectiveRank();
  if (!assignment) return;

  els.dialogContent.innerHTML = `
    <p class="eyebrow">${assignment.activityName}</p>
    <h2>${assignment.name}</h2>
    <p>${assignment.description || "No description yet."}</p>
    <p class="subtitle">Results shown for effective unit rank ${rank}.</p>
    <div class="dialog-reward-grid">
      ${(assignment.rewards || []).map(reward => rewardRowHtml(reward, rank)).join("")}
    </div>
  `;

  if (typeof els.detailsDialog.showModal === "function") els.detailsDialog.showModal();
  else alert(`${assignment.name}\n${getProducedRewards(assignment, rank).map(item => `${item.name}: ${item.amount}`).join("\n")}`);
}

function copySummary() {
  const assignment = getAssignmentById();
  const rank = getEffectiveRank();
  const characterName = els.characterName.value.trim() || "Not provided";
  const unitName = els.unitName.value.trim() || "Not provided";
  const activity = getActivityById();
  const ritual = getCurrentRitual();

  const lines = [
    "Empire Military Downtime Tool",
    "",
    `Character: ${characterName}`,
    `Military Unit: ${unitName}`,
    "",
    `Activity: ${activity?.name || "N/A"}`,
    `Assignment: ${assignment ? assignment.name : "None selected"}`,
    `Base unit rank: ${state.baseRank}`,
    `${ritual.name}; Upgrade +${state.unitUpgrade}, Regional modifier ${state.regionalModifier > 0 ? "+" : ""}${state.regionalModifier}`,
    `Effective Unit Rank: ${rank}`,
    "",
    "Downtime result:"
  ];

  getProducedRewards(assignment, rank).forEach(item => {
    lines.push(`${item.name}: ${item.amount}`);
  });

  const text = lines.join("\n");

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showToast("Summary copied."))
      .catch(() => fallbackCopyText(text));
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    showToast("Summary copied.");
  } catch {
    showToast("Could not copy summary.");
  }

  textarea.remove();
}

function resetPlanner() {
  state.baseRank = DEFAULT_UNIT_RANK;
  state.unitUpgrade = 0;
  state.regionalModifier = 0;
  state.ritual = "none";
  state.activityType = getActivities()[0]?.id || null;
  state.selectedAssignmentId = getAssignments(getActivityById(state.activityType))[0]?.id || null;
  syncControlsFromState();
  renderAll();
}

function saveState() {
  const payload = {
    baseRank: state.baseRank,
    unitUpgrade: state.unitUpgrade,
    regionalModifier: state.regionalModifier,
    ritual: state.ritual,
    activityType: state.activityType,
    selectedAssignmentId: state.selectedAssignmentId
  };

  localStorage.setItem("empireMilitaryDowntime.starter", JSON.stringify(payload));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("empireMilitaryDowntime.starter") || "{}");
    state.baseRank = Number(saved.baseRank || DEFAULT_UNIT_RANK);
    state.unitUpgrade = Number(saved.unitUpgrade || 0);
    state.regionalModifier = Number(saved.regionalModifier || 0);
    state.ritual = saved.ritual && RITUALS[saved.ritual] ? saved.ritual : "none";
    state.activityType = getActivities().some(activity => activity.id === saved.activityType)
      ? saved.activityType
      : getActivities()[0]?.id || null;
    state.selectedAssignmentId = saved.selectedAssignmentId || getAssignments()[0]?.id || null;
  } catch {
    state.activityType = getActivities()[0]?.id || null;
    state.selectedAssignmentId = getAssignments()[0]?.id || null;
  }
}

function syncControlsFromState() {
  els.activityType.value = state.activityType || "";
  els.baseRank.value = String(state.baseRank);
  els.unitUpgrade.value = String(state.unitUpgrade);
  els.regionalModifier.value = String(state.regionalModifier);
  els.ritualSelect.value = state.ritual;
  els.assignmentSelect.value = state.selectedAssignmentId || "";
}

function bindEvents() {
  els.activityType.addEventListener("change", event => {
    state.activityType = event.target.value;
    state.selectedAssignmentId = getAssignments()[0]?.id || null;

    const ritual = getCurrentRitual();
    if (state.ritual !== "none" && !isRitualAvailable(ritual)) state.ritual = "none";

    renderAll();
  });

  els.baseRank.addEventListener("change", event => {
    state.baseRank = Number(event.target.value);
    renderAll();
  });

  els.unitUpgrade.addEventListener("change", event => {
    state.unitUpgrade = Number(event.target.value);
    renderAll();
  });

  els.ritualSelect.addEventListener("change", event => {
    state.ritual = event.target.value;
    renderAll();
  });

  els.regionalModifier.addEventListener("change", event => {
    state.regionalModifier = Number(event.target.value);
    renderAll();
  });

  els.assignmentSelect.addEventListener("change", event => {
    chooseAssignment(event.target.value);
  });

  els.resetPlanner.addEventListener("click", resetPlanner);
  els.copySummary.addEventListener("click", copySummary);
  els.closeDialog.addEventListener("click", () => els.detailsDialog.close());

  els.assignments.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "choose") chooseAssignment(button.dataset.assignmentId);
    if (button.dataset.action === "details") openDetails(button.dataset.assignmentId);
  });
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return response.json();
}

async function init() {
  getElements();

  if (!requiredElementsExist()) {
    showFatalError("The HTML file is missing required planner elements. Upload index.html, style.css, script.js, military-options.json, and military-rituals.json together.");
    console.error("Missing elements", els);
    return;
  }

  try {
    const [optionsData, ritualsData] = await Promise.all([
      loadJson("military-options.json"),
      loadJson("military-rituals.json")
    ]);

    state.optionsData = optionsData;
    state.ritualsData = ritualsData;
    RITUALS = buildRituals(ritualsData);

    populateActivitySelect();
    populateBaseRankSelect();
    populateUpgradeSelect();
    populateRegionalModifierSelect();
    loadState();
    populateActivitySelect();
    populateBaseRankSelect();
    populateUpgradeSelect();
    populateRegionalModifierSelect();
    populateRitualSelect();
    populateAssignmentSelect();
    syncControlsFromState();
    bindEvents();
    renderAll();
  } catch (error) {
    showFatalError(`${error.message}. Make sure military-options.json and military-rituals.json are in the same folder as index.html.`);
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", init);
