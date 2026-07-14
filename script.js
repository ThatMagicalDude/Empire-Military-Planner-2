const DEFAULT_BASE_RANK = 5;
const MIN_UNIT_RANK = 1;
const DEFAULT_ACTIVITY = "guarding";
const DEFAULT_ACTION = "mercenary-work";

const state = {
  data: null,
  rituals: [],
  activityId: DEFAULT_ACTIVITY,
  actionId: DEFAULT_ACTION,
  mithrilUpgrade: 0,
  modifier: 0,
  ritualId: "none"
};

const els = {
  characterName: document.querySelector("#characterName"),
  unitName: document.querySelector("#unitName"),

  activitySelect: document.querySelector("#activitySelect"),
  actionSelect: document.querySelector("#actionSelect"),
  baseUnitRank: document.querySelector("#baseUnitRank"),
  mithrilUpgrade: document.querySelector("#mithrilUpgrade"),
  modifierSelect: document.querySelector("#modifierSelect"),
  ritualSelect: document.querySelector("#ritualSelect"),

  ritualNote: document.querySelector("#ritualNote"),
  effectiveLevelDisplay: document.querySelector("#effectiveLevelDisplay"),
  effectiveLevelNote: document.querySelector("#effectiveLevelNote"),

  modifierBreakdown: document.querySelector("#modifierBreakdown"),
  productionSummary: document.querySelector("#productionSummary"),
  copySummary: document.querySelector("#copySummary"),

  listEyebrow: document.querySelector("#listEyebrow"),
  actionsHeading: document.querySelector("#actionsHeading"),
  actionCards: document.querySelector("#actionCards"),
  actionCount: document.querySelector("#actionCount"),
  emptyState: document.querySelector("#emptyState"),

  actionDialog: document.querySelector("#actionDialog"),
  closeDialog: document.querySelector("#closeDialog"),
  dialogContent: document.querySelector("#dialogContent")
};

function requiredElementsExist() {
  const required = [
    "activitySelect",
    "baseUnitRank",
    "mithrilUpgrade",
    "modifierSelect",
    "ritualSelect",
    "ritualNote",
    "characterName",
    "unitName",
    "actionSelect",
    "modifierBreakdown",
    "productionSummary",
    "copySummary",
    "listEyebrow",
    "actionsHeading",
    "actionCards",
    "actionCount",
    "emptyState",
    "actionDialog",
    "closeDialog",
    "dialogContent"
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
    ...(ritualData.rituals || [])
  ];

  if (!getActivityById(state.activityId)) {
    state.activityId = state.data.activities[0]?.id || DEFAULT_ACTIVITY;
  }

  if (!getCurrentActivity().actions.some(action => action.id === state.actionId)) {
    state.actionId = getCurrentActivity().actions[0]?.id || DEFAULT_ACTION;
  }

  populateControls();
  bindEvents();
  render();
}
function getEffectiveRank() {
  const ritual = getRitual();
  const raw = DEFAULT_UNIT_RANK + state.mithrilUpgrade + state.modifier + Number(ritual.rankModifier || 0);
  return Math.max(MIN_UNIT_RANK, Math.min(Number(state.data.maxRank || 18), raw));
}
function getMaxRank() {
  return Number(state.data?.maxRank || 18);
}

function getActivityById(id) {
  return state.data.activities.find(activity => activity.id === id);
}

function getCurrentActivity() {
  return getActivityById(state.activityId) || state.data.activities[0];
}

function getCurrentAction() {
  const activity = getCurrentActivity();
  return activity.actions.find(action => action.id === state.actionId) || activity.actions[0];
}

function getRitual() {
  return state.rituals.find(ritual => ritual.id === state.ritualId) || state.rituals[0];
}

function getEffectiveRank() {
  const ritual = getRitual();
  const raw = DEFAULT_BASE_RANK + state.mithrilUpgrade + state.modifier + Number(ritual.rankModifier || 0);
  return Math.max(MIN_UNIT_RANK, Math.min(getMaxRank(), raw));
}

function getEffectiveLevel() {
  return Math.max(1, getEffectiveRank() - 4);
}

function getLootRow() {
  const effectiveRank = getEffectiveRank();
  return state.data.lootTable.find(row => Number(row.rank) === effectiveRank) || state.data.lootTable[0];
}

function populateControls() {
  els.activitySelect.innerHTML = state.data.activities.map(activity =>
    `<option value="${activity.id}">${activity.name}</option>`
  ).join("");

  populateMithrilUpgrade();
  populateModifierSelect();
  populateActions();
  populateRituals();
}

function populateMithrilUpgrade() {
  els.mithrilUpgrade.innerHTML = "";
  const maxPermanentIncrease = Math.max(0, getMaxRank() - DEFAULT_BASE_RANK);

  for (let i = 0; i <= maxPermanentIncrease; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);

    if (i === 0) {
      option.textContent = "None";
    } else {
      const upgradedUnitLevel = i + 1;
      option.textContent = `+${i} upgrade — costs ${upgradedUnitLevel} Imperial wain${upgradedUnitLevel === 1 ? "" : "s"} of mithril`;
    }

    els.mithrilUpgrade.appendChild(option);
  }
}

function populateModifierSelect() {
  els.modifierSelect.innerHTML = "";

  for (let i = -4; i <= 4; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);

    if (i === 0) {
      option.textContent = "No campaign modifier";
    } else if (i > 0) {
      option.textContent = `+${i} campaign buff`;
    } else {
      option.textContent = `${i} campaign debuff`;
    }

    els.modifierSelect.appendChild(option);
  }
}

function populateActions() {
  const activity = getCurrentActivity();

  if (!activity.actions.some(action => action.id === state.actionId)) {
    state.actionId = activity.actions[0]?.id || "";
  }

  els.actionSelect.innerHTML = activity.actions.map(action =>
    `<option value="${action.id}">${action.name}</option>`
  ).join("");
  els.actionSelect.value = state.actionId;
}

function populateRituals() {
  const activity = getCurrentActivity();
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
    state.actionId = getCurrentActivity().actions[0]?.id || "";
    state.ritualId = "none";
    populateActions();
    populateRituals();
    render();
  });

  els.actionSelect.addEventListener("change", event => {
    state.actionId = event.target.value;
    render();
  });

  els.mithrilUpgrade.addEventListener("change", event => {
    state.mithrilUpgrade = Number(event.target.value);
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

  els.actionCards.addEventListener("click", event => {
    const selectButton = event.target.closest("[data-select-action]");
    const detailsButton = event.target.closest("[data-show-details]");

    if (selectButton) {
      state.actionId = selectButton.dataset.selectAction;
      els.actionSelect.value = state.actionId;
      render();
      return;
    }

    if (detailsButton) {
      openDetails(detailsButton.dataset.showDetails);
    }
  });

  els.closeDialog.addEventListener("click", () => els.actionDialog.close());
}

function render() {
  const activity = getCurrentActivity();
  const action = getCurrentAction();
  const ritual = getRitual();
  const effectiveRank = getEffectiveRank();

  renderEffectiveLevel();

  els.activitySelect.value = state.activityId;
  els.actionSelect.value = state.actionId;
  els.mithrilUpgrade.value = String(state.mithrilUpgrade);
  els.modifierSelect.value = String(state.modifier);
  els.ritualSelect.value = state.ritualId;

  els.baseUnitRank.textContent = "Level 5";
  els.ritualNote.textContent = ritual.note || "No ritual selected.";
  els.listEyebrow.textContent = activity.name;
  els.actionsHeading.textContent = `${activity.name} assignments`;

  renderBreakdown(activity, ritual, effectiveRank);
  renderOutput(action);
  renderActionCards(activity.actions);
}

function renderEffectiveLevel() {
  const level = getEffectiveRank();
  const ritual = getRitual();
  const activity = getCurrentActivity();

  const activityLabel = activity?.name || "Military action";

  if (els.effectiveLevelDisplay) {
    els.effectiveLevelDisplay.textContent = level;
    els.effectiveLevelDisplay.classList.toggle("debuffed", level < DEFAULT_UNIT_RANK);
    els.effectiveLevelDisplay.classList.toggle("boosted", level > DEFAULT_UNIT_RANK);
  }

  const parts = [`Base ${DEFAULT_UNIT_RANK}`];

  if (state.mithrilUpgrade) {
    parts.push(`+${state.mithrilUpgrade} Mithril`);
  }

  if (state.modifier) {
    parts.push(
      state.modifier > 0
        ? `+${state.modifier} campaign buff`
        : `${state.modifier} campaign debuff`
    );
  }

  if (ritual.rankModifier > 0) {
    parts.push(`+${ritual.rankModifier} ${ritual.name}`);
  }

  if (ritual.rankModifier < 0) {
    parts.push(`${ritual.rankModifier} ${ritual.name}`);
  }

  if (els.effectiveLevelNote) {
    els.effectiveLevelNote.textContent = `${activityLabel}: ${parts.join(" ")} = Rank ${level}`;

    if (level < DEFAULT_UNIT_RANK) {
      els.effectiveLevelNote.textContent += " — using debuffed reward rows.";
    }
  }

  if (els.ritualNote) {
    els.ritualNote.textContent = ritual.note;
    els.ritualNote.classList.toggle(
      "ritual-note--buff",
      ritual.rankModifier > 0 || ritual.productionMultiplier > 1
    );
    els.ritualNote.classList.toggle(
      "ritual-note--debuff",
      ritual.rankModifier < 0 || ritual.productionMultiplier < 1
    );
  }
}

function renderBreakdown(activity, ritual, effectiveRank) {
  const multiplier = Number(ritual.productionMultiplier || ritual.multiplier || 1);

  els.modifierBreakdown.innerHTML = `
    <div class="breakdown-row">
      <span>Activity</span>
      <strong>${activity.name}</strong>
    </div>
    <div class="breakdown-row">
      <span>Base unit</span>
      <strong>Level 1 / Rank ${DEFAULT_BASE_RANK}</strong>
    </div>
    <div class="breakdown-row">
      <span>Mithril permanent upgrade</span>
      <strong>+${state.mithrilUpgrade}</strong>
    </div>
    <div class="breakdown-row">
      <span>Campaign buff/debuff</span>
      <strong>${state.modifier > 0 ? "+" : ""}${state.modifier}</strong>
    </div>
    <div class="breakdown-row">
      <span>Ritual</span>
      <strong>${ritual.name}</strong>
    </div>
    <div class="breakdown-row">
      <span>Ritual rank change</span>
      <strong>${Number(ritual.rankModifier || 0) > 0 ? "+" : ""}${Number(ritual.rankModifier || 0)}</strong>
    </div>
    <div class="breakdown-row">
      <span>Production multiplier</span>
      <strong>${multiplier === 1 ? "×1" : `×${multiplier}`}</strong>
    </div>
    <div class="breakdown-row breakdown-row--total">
      <span>Effective rank</span>
      <strong>${effectiveRank}</strong>
    </div>
  `;
}

function renderOutput(action) {
  if (!action) {
    els.productionSummary.innerHTML = `<div class="summary-item"><span>Outcome</span><strong>No action selected</strong></div>`;
    return;
  }

  if (action.type === "venture") {
    const rewardRows = getActionRewardRows(action);
    els.productionSummary.innerHTML = `
      ${action.restricted ? `
        <div class="summary-item">
          <span>Restriction</span>
          <strong>${action.restricted}</strong>
        </div>
      ` : ""}
      ${rewardRows.length ? rewardRows.map(row => `
        <div class="summary-item">
          <span>${row.name}</span>
          <strong>${row.amount}</strong>
        </div>
      `).join("") : `
        <div class="summary-item">
          <span>Outcome</span>
          <strong>Narrative or plot result</strong>
        </div>
      `}
    `;
    return;
  }

  if (action.type === "loot") {
    const row = getLootRow();
    const multiplier = Number(getRitual().productionMultiplier || 1);
    const production = multiplier === 1
      ? row.label
      : `${Math.ceil(Number(row.production || 0) * multiplier)} random resources after ritual modifier`;

    els.productionSummary.innerHTML = `
      <div class="summary-item"><span>Production</span><strong>${production}</strong></div>
      <div class="summary-item"><span>25% Resources</span><strong>${row.resources}</strong></div>
      <div class="summary-item"><span>25% Money</span><strong>${row.money}</strong></div>
      <div class="summary-item"><span>25% Mana</span><strong>${row.mana}</strong></div>
      <div class="summary-item"><span>25% Herbs</span><strong>${row.herbs}</strong></div>
    `;
    return;
  }

  if (action.type === "guerdon") {
    els.productionSummary.innerHTML = `
      <div class="summary-item"><span>Income</span><strong>Only if Imperial guerdon applies</strong></div>
      <div class="summary-item"><span>Contribution</span><strong>Effective rank ${getEffectiveRank()}</strong></div>
      <div class="summary-item"><span>Note</span><strong>Adds unit strength to the selected army, fortification, or spy network.</strong></div>
    `;
    return;
  }

  els.productionSummary.innerHTML = `
    <div class="summary-item"><span>Outcome</span><strong>Narrative or plot result</strong></div>
    <div class="summary-item"><span>Income</span><strong>None unless the plot option states otherwise</strong></div>
  `;
}

function getActionRewardRows(action, rank = getEffectiveRank()) {
  const multiplier = Number(getRitual().productionMultiplier || 1);
  const rows = [];

  if (Array.isArray(action.rewardsByRank)) {
    action.rewardsByRank.forEach(reward => {
      const rawAmount = reward.amountByRank?.[String(rank)] ?? reward.amountByRank?.[rank] ?? 0;
      const amount = reward.scalable === false ? Number(rawAmount) : Math.ceil(Number(rawAmount) * multiplier);
      if (!amount) return;
      rows.push({
        name: reward.name,
        amount: formatAmount(amount, reward.unit)
      });
    });
  }

  if (Array.isArray(action.rewards)) {
    action.rewards.forEach(reward => {
      const amount = reward.scalable === false ? Number(reward.amount || 0) : Math.ceil(Number(reward.amount || 0) * multiplier);
      if (!amount) return;
      rows.push({
        name: reward.name,
        amount: formatAmount(amount, reward.unit)
      });
    });
  }

  return rows;
}

function formatAmount(amount, unit) {
  if (unit) {
    return `×${amount} ${unit}`;
  }
  return `×${amount}`;
}

function renderActionCards(actions) {
  els.actionCount.textContent = String(actions.length);
  els.emptyState.hidden = actions.length > 0;

  els.actionCards.innerHTML = actions.map(action => {
    const rewardRows = getActionRewardRows(action).slice(0, 4);
    const selectedClass = action.id === state.actionId ? " selected" : "";
    const typeLabel = action.type === "guerdon" ? "Guerdon" : action.type === "venture" ? "Venture" : action.type === "loot" ? "Loot" : "Narrative";

    return `
      <article class="action-card${selectedClass}">
        <p class="eyebrow">${typeLabel}</p>
        <h3>${action.name}</h3>
        <p class="action-meta">${action.restricted || "Available action"}</p>
        <p class="action-description">${action.description || "No description provided."}</p>
        <div class="action-rewards">
          ${rewardRows.length ? rewardRows.map(row => `
            <div class="reward-row">
              <span>${row.name}</span>
              <strong>${row.amount}</strong>
            </div>
          `).join("") : `
            <span class="badge">${typeLabel}</span>
          `}
        </div>
        <div class="action-card__actions">
          <button class="select-action-button" type="button" data-select-action="${action.id}">${action.id === state.actionId ? "Selected" : "Select"}</button>
          <button class="details-button" type="button" data-show-details="${action.id}">Details</button>
        </div>
      </article>
    `;
  }).join("");
}

function openDetails(actionId) {
  const activity = getCurrentActivity();
  const action = activity.actions.find(item => item.id === actionId);
  if (!action) return;

  const rewardRows = getActionRewardRows(action);
  const typeLabel = action.type === "guerdon" ? "Guerdon Eligible" : action.type === "venture" ? "Venture" : action.type === "loot" ? "Loot" : "Narrative";

  els.dialogContent.innerHTML = `
    <p class="eyebrow">${activity.name}</p>
    <h2>${action.name}</h2>
    <p class="subtitle" style="color: var(--ink-soft);">${typeLabel} shown for effective rank ${getEffectiveRank()}.</p>
    <p>${action.description || "No description provided."}</p>
    ${action.restricted ? `<p><strong>Restriction:</strong> ${action.restricted}</p>` : ""}
    <div class="summary-list">
      ${rewardRows.length ? rewardRows.map(row => `
        <div class="summary-item">
          <span>${row.name}</span>
          <strong>${row.amount}</strong>
        </div>
      `).join("") : `
        <div class="summary-item">
          <span>Outcome</span>
          <strong>${typeLabel}</strong>
        </div>
      `}
    </div>
  `;

  els.actionDialog.showModal();
}

function getSummaryLines() {
  const character = els.characterName.value.trim() || "Not provided";
  const unit = els.unitName.value.trim() || "Not provided";
  const activity = getCurrentActivity();
  const action = getCurrentAction();
  const ritual = getRitual();

  const lines = [
    "Empire Military Downtime Tool",
    "",
    `Character: ${character}`,
    `Military Unit: ${unit}`,
    "",
    `Activity: ${activity.name}`,
    `Action: ${action.name}`,
    `Base Unit: Level 1 / Rank ${DEFAULT_BASE_RANK}`,
    `Mithril Upgrade: +${state.mithrilUpgrade}`,
    `Campaign Modifier: ${state.modifier > 0 ? "+" : ""}${state.modifier}`,
    `Ritual: ${ritual.name}`,
    `Effective Rank: ${getEffectiveRank()}`,
    "",
    "Downtime Result:"
  ];

  if (action.type === "venture") {
    if (action.restricted) {
      lines.push(`Restriction: ${action.restricted}`);
    }
    const rewardRows = getActionRewardRows(action);
    if (rewardRows.length) {
      rewardRows.forEach(row => lines.push(`${row.name}: ${row.amount}`));
    } else {
      lines.push("Outcome: Narrative or plot result.");
    }
  } else if (action.type === "loot") {
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
  document.body.insertAdjacentHTML(
    "afterbegin",
    `<p style="background:#ffd6d6;color:#4a0000;padding:1rem;margin:0;position:relative;z-index:10;">
      Military tool error:<br>${error.message}
    </p>`
  );
});
