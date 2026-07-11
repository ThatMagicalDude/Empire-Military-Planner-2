const DEFAULT_UNIT_RANK = 5;
const MIN_UNIT_RANK = 1;

const state = {
  data: null,
  rituals: [],
  activityId: "guarding",
  actionId: "mercenary-work",
  rank: DEFAULT_UNIT_RANK,
  modifier: 0,
  ritualId: "none"
};

const els = {
  characterName: document.querySelector("#characterName"),
  unitName: document.querySelector("#unitName"),
  activitySelect: document.querySelector("#activitySelect"),
  actionSelect: document.querySelector("#actionSelect"),
  rankSelect: document.querySelector("#rankSelect"),
  modifierSelect: document.querySelector("#modifierSelect"),
  ritualSelect: document.querySelector("#ritualSelect"),
  ritualNote: document.querySelector("#ritualNote"),
  breakdown: document.querySelector("#modifierBreakdown"),
  copySummary: document.querySelector("#copySummary"),
  actionType: document.querySelector("#actionType"),
  actionTitle: document.querySelector("#actionTitle"),
  actionDescription: document.querySelector("#actionDescription"),
  lootOutput: document.querySelector("#productionSummary")
};

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function requiredElementsExist() {
  const required = [
    "characterName",
    "unitName",
    "activitySelect",
    "actionSelect",
    "rankSelect",
    "modifierSelect",
    "ritualSelect",
    "ritualNote",
    "breakdown",
    "copySummary",
    "actionType",
    "actionTitle",
    "actionDescription",
    "lootOutput"
  ];

  const missing = required.filter(key => !els[key]);
  if (missing.length) {
    throw new Error(`Missing required HTML element(s): ${missing.join(", ")}`);
  }
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} failed to load: ${response.status}`);
  }
  return response.json();
}

async function init() {
  requiredElementsExist();

  const [optionsData, ritualData] = await Promise.all([
    loadJson("./military-options.json"),
    loadJson("./military-rituals.json")
  ]);

  state.data = optionsData;
  state.rituals = [
    {
      id: "none",
      name: "No ritual",
      option: "All",
      rankModifier: 0,
      productionMultiplier: 1,
      note: "No ritual selected."
    },
    ...(ritualData.rituals || []).map(ritual => ({
      id: ritual.id || slug(ritual.name),
      name: ritual.name,
      option: ritual.option || "All",
      rankModifier: Number(ritual.rankModifier || 0),
      productionMultiplier: Number(ritual.productionMultiplier || 1),
      note: ritual.note || ""
    }))
  ];

  populateControls();
  bindEvents();
  render();
}

function getActivity() {
  return state.data.activities.find(activity => activity.id === state.activityId) || state.data.activities[0];
}

function getAction() {
  const activity = getActivity();
  return activity.actions.find(action => action.id === state.actionId) || activity.actions[0];
}

function getRitual() {
  return state.rituals.find(ritual => ritual.id === state.ritualId) || state.rituals[0];
}

function getMaxRank() {
  return Number(state.data.maxRank || 8);
}

function getEffectiveRank() {
  const ritual = getRitual();
  const raw = state.rank + state.modifier + Number(ritual.rankModifier || 0);
  return Math.max(MIN_UNIT_RANK, Math.min(Number(state.data.maxRank || 18), raw));
}

function getLootRow(rank = getEffectiveRank()) {
  return state.data.lootTable.find(row => Number(row.rank) === Number(rank)) || state.data.lootTable[0];
}

function getLootRowForProduction(production) {
  const rows = [...state.data.lootTable].sort((a, b) => Number(a.production) - Number(b.production));
  return rows.find(row => Number(row.production) >= production) || rows[rows.length - 1];
}

function populateControls() {
  els.activitySelect.innerHTML = state.data.activities.map(activity =>
    `<option value="${activity.id}">${activity.name}</option>`
  ).join("");

  els.rankSelect.innerHTML = "";

for (let i = 5; i <= Number(state.data.maxRank || 18); i += 1) {
  const level = i - 4;
  els.rankSelect.insertAdjacentHTML(
    "beforeend",
    `<option value="${i}">Level ${level} — Rank ${i}</option>`
  );
}

  els.modifierSelect.innerHTML = "";
  for (let i = -5; i <= 5; i += 1) {
    const label = i === 0 ? "No modifier" : i > 0 ? `+${i} campaign buff` : `${i} campaign debuff`;
    els.modifierSelect.insertAdjacentHTML("beforeend", `<option value="${i}">${label}</option>`);
  }

  populateActions();
  populateRituals();
}

function populateActions() {
  const activity = getActivity();
  els.actionSelect.innerHTML = activity.actions.map(action =>
    `<option value="${action.id}">${action.name}</option>`
  ).join("");

  if (!activity.actions.some(action => action.id === state.actionId)) {
    state.actionId = activity.actions[0].id;
  }

  els.actionSelect.value = state.actionId;
}

function populateRituals() {
  const activity = getActivity();
  const matching = state.rituals.filter(ritual => ritual.option === activity.name && ritual.id !== "none");
  const all = state.rituals.filter(ritual => ritual.option === "All" && ritual.id !== "none");

  const optionHtml = [
    `<option value="none">No ritual</option>`,
    matching.length ? `<optgroup label="${activity.name} rituals">${matching.map(ritual =>
      `<option value="${ritual.id}">${ritual.name} — ${ritual.note}</option>`
    ).join("")}</optgroup>` : "",
    all.length ? `<optgroup label="All activities">${all.map(ritual =>
      `<option value="${ritual.id}">${ritual.name} — ${ritual.note}</option>`
    ).join("")}</optgroup>` : ""
  ].join("");

  els.ritualSelect.innerHTML = optionHtml;

  if (!state.rituals.some(ritual => ritual.id === state.ritualId)) {
    state.ritualId = "none";
  }

  els.ritualSelect.value = state.ritualId;
}

function bindEvents() {
  els.activitySelect.addEventListener("change", event => {
    state.activityId = event.target.value;
    state.actionId = getActivity().actions[0].id;
    state.ritualId = "none";
    populateActions();
    populateRituals();
    render();
  });

  els.actionSelect.addEventListener("change", event => {
    state.actionId = event.target.value;
    render();
  });

  els.rankSelect.addEventListener("change", event => {
    state.rank = Number(event.target.value);
    render();
  });

  els.modifierSelect.addEventListener("change", event => {
    state.modifier = Number(event.target.value);
    render();
  });

  els.ritualSelect.addEventListener("change", event => {
    state.ritualId = event.target.value;
    render();
  });

  els.copySummary.addEventListener("click", copySummary);
}

function formatSigned(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}

function render() {
  const activity = getActivity();
  const action = getAction();
  const ritual = getRitual();
  const effectiveRank = getEffectiveRank();

  els.activitySelect.value = state.activityId;
  els.rankSelect.value = String(state.rank);
  els.modifierSelect.value = String(state.modifier);
  els.ritualSelect.value = state.ritualId;

  els.ritualNote.textContent = ritual.note || "No ritual selected.";

  els.breakdown.innerHTML = `
    <div class="breakdown-row">
  <span>Base unit</span>
  <strong>Level ${state.rank - 4} / Rank ${state.rank}</strong>
</div>
    <div class="breakdown-row">
      <span>Action</span>
      <strong>${action.name}</strong>
    </div>
    <div class="breakdown-row">
      <span>Base rank</span>
      <strong>${state.rank}</strong>
    </div>
    <div class="breakdown-row">
      <span>Campaign modifier</span>
      <strong>${formatSigned(state.modifier)}</strong>
    </div>
    <div class="breakdown-row">
      <span>Ritual</span>
      <strong>${ritual.name}</strong>
    </div>
    <div class="breakdown-row">
      <span>Ritual rank change</span>
      <strong>${formatSigned(ritual.rankModifier)}</strong>
    </div>
  <div class="breakdown-row breakdown-row--total">
  <span>Effective rank</span>
  <strong>${effectiveRank}</strong>
</div>
  `;

  els.actionType.textContent = action.type === "loot" ? "Loot" : action.type === "guerdon" ? "Guerdon Eligible" : "Narrative";
  els.actionTitle.textContent = action.name;
  els.actionDescription.textContent = action.description || "No description provided.";

  renderOutput(action);
}

function renderOutput(action) {
  if (action.type === "loot") {
    const row = getLootRow();
    const ritual = getRitual();
    const multiplier = Number(ritual.productionMultiplier || 1);
    const baseProduction = Number(row.production || 0);
    const modifiedProduction = Math.max(1, Math.ceil(baseProduction * multiplier));
    const resultRow = multiplier === 1 ? row : getLootRowForProduction(modifiedProduction);
    const productionLabel = multiplier === 1
      ? row.label
      : `${modifiedProduction} random resources after ritual modifier`;

    els.lootOutput.innerHTML = `
      <div class="summary-item">
        <span>Production</span>
        <strong>${productionLabel}</strong>
      </div>
      <div class="summary-item">
        <span>25% Resources</span>
        <strong>${resultRow.resources}</strong>
      </div>
      <div class="summary-item">
        <span>25% Money</span>
        <strong>${resultRow.money}</strong>
      </div>
      <div class="summary-item">
        <span>25% Mana</span>
        <strong>${resultRow.mana}</strong>
      </div>
      <div class="summary-item">
        <span>25% Herbs</span>
        <strong>${resultRow.herbs}</strong>
      </div>
    `;
    return;
  }

  if (action.type === "guerdon") {
    els.lootOutput.innerHTML = `
      <div class="summary-item">
        <span>Income</span>
        <strong>Only if Imperial guerdon applies</strong>
      </div>
      <div class="summary-item">
        <span>Contribution</span>
        <strong>Effective rank ${getEffectiveRank()}</strong>
      </div>
      <div class="summary-item">
        <span>Note</span>
        <strong>Adds unit strength to the selected army, fortification, or spy network.</strong>
      </div>
    `;
    return;
  }

  els.lootOutput.innerHTML = `
    <div class="summary-item">
      <span>Outcome</span>
      <strong>Narrative or plot result</strong>
    </div>
    <div class="summary-item">
      <span>Income</span>
      <strong>None unless the plot option states otherwise</strong>
    </div>
  `;
}

function getSummaryLines() {
  const character = els.characterName.value.trim() || "Not provided";
  const unit = els.unitName.value.trim() || "Not provided";
  const activity = getActivity();
  const action = getAction();
  const ritual = getRitual();
  const effectiveRank = getEffectiveRank();

  const lines = [
    "Empire Military Downtime Tool",
    "",
    `Character: ${character}`,
    `Military Unit: ${unit}`,
    "",
    `Activity: ${activity.name}`,
    `Action: ${action.name}`,
    `Base Rank: ${state.rank}`,
    `Campaign Modifier: ${formatSigned(state.modifier)}`,
    `Ritual: ${ritual.name}`,
    `Ritual Rank Change: ${formatSigned(ritual.rankModifier)}`,
    `Effective Rank: ${effectiveRank}`,
    "",
    "Downtime Result:"
  ];

  if (action.type === "loot") {
    const row = getLootRow();
    const multiplier = Number(ritual.productionMultiplier || 1);
    const baseProduction = Number(row.production || 0);
    const modifiedProduction = Math.max(1, Math.ceil(baseProduction * multiplier));
    const resultRow = multiplier === 1 ? row : getLootRowForProduction(modifiedProduction);
    const productionLabel = multiplier === 1 ? row.label : `${modifiedProduction} random resources after ritual modifier`;

    lines.push(`Production: ${productionLabel}`);
    lines.push(`25% Resources: ${resultRow.resources}`);
    lines.push(`25% Money: ${resultRow.money}`);
    lines.push(`25% Mana: ${resultRow.mana}`);
    lines.push(`25% Herbs: ${resultRow.herbs}`);
  } else if (action.type === "guerdon") {
    lines.push("Income: Only if Imperial guerdon applies.");
    lines.push(`Contribution: Effective rank ${effectiveRank}.`);
  } else {
    lines.push("Outcome: Narrative or plot result.");
    lines.push("Income: None unless the plot option states otherwise.");
  }

  return lines;
}

async function copySummary() {
  const text = getSummaryLines().join("\n");
  await navigator.clipboard.writeText(text);
  const oldText = els.copySummary.textContent;
  els.copySummary.textContent = "Copied!";
  setTimeout(() => {
    els.copySummary.textContent = oldText;
  }, 1200);
}

init().catch(error => {
  console.error(error);
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<p style="background:#ffd6d6;color:#4a0000;padding:1rem;margin:0;position:relative;z-index:5;">
      Military tool error:<br>
      ${error.message}
    </p>`
  );
});
