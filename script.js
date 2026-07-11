const state = {
  data: null,
  rituals: [],
  activityId: "guarding",
  actionId: "mercenary-work",
  rank: 1,
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
  effectiveRank: document.querySelector("#effectiveRank"),
  breakdown: document.querySelector("#breakdown"),
  copySummary: document.querySelector("#copySummary"),
  actionType: document.querySelector("#actionType"),
  actionTitle: document.querySelector("#actionTitle"),
  actionDescription: document.querySelector("#actionDescription"),
  lootOutput: document.querySelector("#lootOutput")
};

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function init() {
  const [optionsResponse, ritualsResponse] = await Promise.all([
    fetch("military-options.json"),
    fetch("military-rituals.json")
  ]);

  state.data = await optionsResponse.json();
  const ritualData = await ritualsResponse.json();

  state.rituals = [
    {
      id: "none",
      name: "No ritual",
      option: "All",
      rankModifier: 0,
      productionMultiplier: 1,
      note: "No ritual selected."
    },
    ...ritualData.rituals
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

function getEffectiveRank() {
  const ritual = getRitual();
  const raw = state.rank + state.modifier + Number(ritual.rankModifier || 0);
  return Math.max(1, Math.min(Number(state.data.maxRank || 8), raw));
}

function getLootRow() {
  const effectiveRank = getEffectiveRank();
  return state.data.lootTable.find(row => Number(row.rank) === effectiveRank) || state.data.lootTable[0];
}

function populateControls() {
  els.activitySelect.innerHTML = state.data.activities.map(activity =>
    `<option value="${activity.id}">${activity.name}</option>`
  ).join("");

  els.rankSelect.innerHTML = "";
  for (let i = 1; i <= Number(state.data.maxRank || 8); i += 1) {
    els.rankSelect.insertAdjacentHTML("beforeend", `<option value="${i}">Rank ${i}</option>`);
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
  const matching = state.rituals.filter(ritual => ritual.option === activity.name);
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

function render() {
  const activity = getActivity();
  const action = getAction();
  const ritual = getRitual();
  const effectiveRank = getEffectiveRank();

  els.activitySelect.value = state.activityId;
  els.rankSelect.value = String(state.rank);
  els.modifierSelect.value = String(state.modifier);
  els.ritualSelect.value = state.ritualId;

  els.ritualNote.textContent = ritual.note;
  els.effectiveRank.textContent = effectiveRank;

  els.breakdown.innerHTML = `
  <div class="breakdown-row">
    <span>Activity</span>
    <strong>${activity.name}</strong>
  </div>
  <div class="breakdown-row">
    <span>Base rank</span>
    <strong>${state.rank}</strong>
  </div>
  <div class="breakdown-row">
    <span>Campaign modifier</span>
    <strong>${state.modifier > 0 ? "+" : ""}${state.modifier}</strong>
  </div>
  <div class="breakdown-row">
    <span>Ritual</span>
    <strong>${ritual.name}</strong>
  </div>
  <div class="breakdown-row">
    <span>Ritual rank change</span>
    <strong>${ritual.rankModifier > 0 ? "+" : ""}${ritual.rankModifier}</strong>
  </div>
  <div class="breakdown-row breakdown-row--total">
    <span>Effective rank</span>
    <strong>${effectiveRank}</strong>
  </div>
`;

}

  els.actionType.textContent = action.type === "loot" ? "Loot" : action.type === "guerdon" ? "Guerdon Eligible" : "Narrative";
  els.actionTitle.textContent = action.name;
  els.actionDescription.textContent = action.description;

  renderOutput(action);
}

function renderOutput(action) {
  if (action.type === "loot") {
    const row = getLootRow();
    const multiplier = Number(getRitual().productionMultiplier || 1);
    const productionLabel = multiplier === 1 ? row.label : `${Math.ceil(row.production * multiplier)} random resources after ritual modifier`;

    els.lootOutput.innerHTML = `
  <div class="summary-item">
    <span>Production</span>
    <strong>${productionLabel}</strong>
  </div>
  <div class="summary-item">
    <span>25% Resources</span>
    <strong>${row.resources}</strong>
  </div>
  <div class="summary-item">
    <span>25% Money</span>
    <strong>${row.money}</strong>
  </div>
  <div class="summary-item">
    <span>25% Mana</span>
    <strong>${row.mana}</strong>
  </div>
  <div class="summary-item">
    <span>25% Herbs</span>
    <strong>${row.herbs}</strong>
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

  const lines = [
    "Empire Military Downtime Tool",
    "",
    `Character: ${character}`,
    `Military Unit: ${unit}`,
    "",
    `Activity: ${activity.name}`,
    `Action: ${action.name}`,
    `Base Rank: ${state.rank}`,
    `Campaign Modifier: ${state.modifier > 0 ? "+" : ""}${state.modifier}`,
    `Ritual: ${ritual.name}`,
    `Effective Rank: ${getEffectiveRank()}`,
    "",
    "Downtime Result:"
  ];

  if (action.type === "loot") {
    const row = getLootRow();
    lines.push(`Production: ${row.label}`);
    lines.push(`25% Resources: ${row.resources}`);
    lines.push(`25% Money: ${row.money}`);
    lines.push(`25% Mana: ${row.mana}`);
    lines.push(`25% Herbs: ${row.herbs}`);
  } else if (action.type === "guerdon") {
    lines.push("Income: Only if Imperial guerdon applies.");
    lines.push(`Contribution: Effective rank ${getEffectiveRank()}.`);
  } else {
    lines.push("Outcome: Narrative or plot result.");
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
  document.body.insertAdjacentHTML("afterbegin", `<p style="background:#ffd6d6;color:#4a0000;padding:1rem;">Could not load military data files. Check that military-options.json and military-rituals.json are uploaded beside index.html.</p>`);
});
