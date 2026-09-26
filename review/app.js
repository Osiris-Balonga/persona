import { isPortraitCompliant, matchesPortraitFilters } from "./gallery-filters.js";
import { portraitRegion, regionGroups } from "./gallery-regions.js";
import { eligibleReviewIds, nextPendingIndex, selectableAgeIndexes } from "./review-sequence.js";

const $ = (selector) => document.querySelector(selector);
const state = {
  items: [],
  appearances: [],
  ageRanges: {},
  region: "all",
  openRegions: new Set(),
  uploadCollection: "",
  status: "all",
  ageGroup: "all",
  ageRange: "all",
  gender: "all",
  quality: "all",
  selected: null,
  selectionMode: false,
  selectedIds: new Set(),
  bulkDecision: null,
  pendingDecision: null,
  editAgeRanges: [],
  editAgePickerEditable: false,
  sequence: null,
};
const labels = {
  "processing-error": "Erreur",
  "needs-metadata": "À documenter",
  "ready-for-review": "À valider",
  approved: "Approuvé",
  rejected: "Rejeté",
};
const appearanceLabels = {
  "west-african": "Afrique de l’Ouest",
  "central-african": "Afrique centrale",
  "east-african": "Afrique de l’Est",
  "southern-african": "Afrique australe",
  "north-african": "Afrique du Nord",
  black: "Noir·e (apparence)",
  "middle-eastern": "Moyen-Orient",
  european: "Europe",
  "south-asian": "Asie du Sud",
  "east-asian": "Asie de l’Est",
  "southeast-asian": "Asie du Sud-Est",
  "pacific-islander": "Îles du Pacifique",
  "latin-american": "Amérique latine",
  mixed: "Mixte",
  unclassified: "À classer",
};
const collectionLabels = {
  "africa-west": "Afrique de l’Ouest",
  "africa-central": "Afrique centrale",
  "africa-east": "Afrique de l’Est",
  "africa-south": "Afrique australe",
  "africa-north": "Afrique du Nord",
  "africa-indian-ocean": "Afrique · Océan Indien",
  "asia-east": "Asie de l’Est",
  "asia-southeast": "Asie du Sud-Est",
  "asia-south": "Asie du Sud",
  "asia-middle-east": "Moyen-Orient",
  "americas-north": "Amérique du Nord",
  "americas-latin-caribbean": "Amérique latine et Caraïbes",
  "europe-north": "Europe du Nord",
  "europe-west": "Europe de l’Ouest",
  "europe-south": "Europe du Sud",
  "europe-east": "Europe de l’Est",
  "oceania-australia-new-zealand": "Australie et Nouvelle-Zélande",
  "oceania-pacific-islands": "Îles du Pacifique",
};
const regionLabels = Object.fromEntries(regionGroups.flatMap((group) => group.children));
regionLabels.unassigned = "À classer";
const ageLabels = {
  child: "Enfant",
  teen: "Ado",
  adult: "Adulte",
  senior: "Senior",
};
const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
  );
const formatBytes = (bytes) =>
  bytes == null ? "—" : `${(bytes / 1024).toFixed(1)} Ko`;
const formatAgeRange = (minimum, maximum) =>
  minimum === maximum ? `${minimum} ans` : `${minimum}–${maximum} ans`;
const metadataAgeRanges = (metadata) => (metadata?.apparentAgeRanges ?? [
  [metadata?.apparentAgeMin, metadata?.apparentAgeMax],
  ...(metadata?.secondaryAgeMin == null ? [] : [[metadata.secondaryAgeMin, metadata.secondaryAgeMax]]),
]).slice().sort(([a], [b]) => a - b);
const ageGroupForRange = (age) => age <= 12 ? "child" : age <= 17 ? "teen" : age <= 64 ? "adult" : "senior";
const formatPortraitAge = (metadata) => {
  const ranges = metadataAgeRanges(metadata);
  return formatAgeRange(ranges[0][0], ranges.at(-1)[1]);
};
async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      message = (await response.json()).error ?? message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
function notify(message, error = false) {
  const box = $("#message");
  box.textContent = message;
  box.classList.toggle("error", error);
  box.hidden = false;
}
async function refresh() {
  const next = await request("/api/items");
  if (JSON.stringify(next) === JSON.stringify(state.items)) return;
  state.items = next;
  render();
}
function renderSidebar() {
  const counts = new Map();
  for (const item of state.items) {
    const region = portraitRegion(item);
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  const branches = regionGroups.map((group) => {
    const children = group.children.filter(([id]) => counts.has(id));
    const count = children.reduce((sum, [id]) => sum + counts.get(id), 0);
    if (!count) return "";
    return `<div class="region-branch ${state.openRegions.has(group.id) ? "expanded" : ""}" data-branch="${group.id}">
      <button type="button" class="region-parent" data-region="${group.id}" aria-expanded="${state.openRegions.has(group.id)}" aria-controls="region-children-${group.id}">
        <span class="region-label"><svg class="region-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4.5 6 3.5 3.5L11.5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="region-name">${group.label}</span></span><span class="region-count">${count}</span>
      </button>
      <div class="region-children" id="region-children-${group.id}"><div class="region-children-inner"><button type="button" class="region-child region-all" data-region="${group.id}">Tous <span>${count}</span></button>${children.map(([id, label]) =>
        `<button type="button" class="region-child" data-region="${id}">${label}<span>${counts.get(id)}</span></button>`).join("")}</div></div>
    </div>`;
  }).join("");
  $("#appearanceNav").innerHTML = `<button type="button" data-region="all">Tous les portraits <span>${state.items.length}</span></button>`
    + branches + (counts.has("unassigned")
      ? `<button type="button" data-region="unassigned">À classer <span>${counts.get("unassigned")}</span></button>` : "");
  updateSidebarSelection();
}
function updateSidebarSelection() {
  $("#appearanceNav").querySelectorAll("button[data-region]").forEach((button) => {
    const active = button.dataset.region === state.region && !button.classList.contains("region-parent");
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}
function render({ sidebar = true } = {}) {
  if (sidebar) renderSidebar();
  $("#totalCount").textContent = state.items.length;
  $("#readyCount").textContent = state.items.filter(
    (item) => item.status === "ready-for-review",
  ).length;
  $("#nav-all").textContent = state.items.length;
  for (const status of Object.keys(labels))
    $(`#nav-${status}`).textContent = state.items.filter(
      (item) => item.status === status,
    ).length;
  const visible = state.items.filter((item) => matchesPortraitFilters(item, state));
  $("#startSequence").disabled = eligibleReviewIds(state.items, state).length === 0;
  for (const id of state.selectedIds)
    if (!visible.some((item) => item.id === id && item.status === "ready-for-review"))
      state.selectedIds.delete(id);
  updateSelectionControls(visible);
  const orderedRegions = [...regionGroups.flatMap((group) => group.children.map(([id]) => id)), "unassigned"];
  const groups = orderedRegions
    .map((region) => ({
      region,
      items: visible.filter((item) => portraitRegion(item) === region),
    }))
    .filter((group) => group.items.length);
  $("#empty").hidden = groups.length > 0;
  $("#groups").innerHTML = groups
    .map(
      (
        group,
      ) => `<section class="portrait-group" id="group-${group.region}">
    <div class="group-head"><h2>${regionLabels[group.region]}</h2><span class="group-count">${group.items.length}</span></div>
    <div class="portrait-grid">${group.items
      .map(
        (
          item,
        ) => `<button type="button" class="portrait-tile ${state.selectedIds.has(item.id) ? "selected" : ""}" data-id="${item.id}" ${state.selectionMode && item.status === "ready-for-review" ? `aria-pressed="${state.selectedIds.has(item.id)}"` : ""} aria-label="${state.selectionMode && item.status === "ready-for-review" ? "Sélectionner" : "Ouvrir"} ${item.id}, ${labels[item.status]}, ${item.technical ? `${item.technical.width} par ${item.technical.height} pixels, ${formatBytes(item.technical.bytes)}` : "caractéristiques indisponibles"}${isPortraitCompliant(item) ? "" : ", fichier à corriger"}" title="${escapeHtml(item.originalName)}">
      ${item.technical ? `<img src="/api/items/${item.id}/image?v=${item.technical.sha256}" alt="" loading="lazy">` : '<span class="missing">Image à corriger</span>'}
      <span class="tile-spec">${item.technical ? `${item.technical.width} × ${item.technical.height} px · ${formatBytes(item.technical.bytes)}` : "Dimensions — · Taille —"}</span>
      ${state.selectionMode && item.status === "ready-for-review" ? `<span class="tile-check">${state.selectedIds.has(item.id) ? "✓" : ""}</span>` : isPortraitCompliant(item) ? `<span class="tile-status ${item.status}" title="${labels[item.status]}"></span>` : '<span class="tile-quality">À corriger</span>'}
      <span class="tile-caption"><span>${item.id}</span><span>${item.metadata ? formatPortraitAge(item.metadata) : labels[item.status]}</span></span>
    </button>`,
      )
      .join("")}</div></section>`,
    )
    .join("");
}
function updateSelectionControls(visible) {
  const count = state.selectedIds.size;
  const eligible = visible.filter((item) => item.status === "ready-for-review");
  $("#selectionToggle").setAttribute("aria-pressed", String(state.selectionMode));
  $("#selectionBar").hidden = !state.selectionMode;
  $("#selectionCount").textContent = `${count} sélectionné${count > 1 ? "s" : ""}`;
  const allSelected = eligible.length > 0 && eligible.every((item) => state.selectedIds.has(item.id));
  $("#selectVisible").disabled = eligible.length === 0;
  $("#selectVisible").setAttribute("aria-pressed", String(allSelected));
  $("#selectVisible").textContent = allSelected ? "Tout décocher" : "Tout cocher";
  $("#clearSelection").disabled = count === 0;
  $("#bulkApprove").disabled = count === 0;
  $("#bulkReject").disabled = count === 0;
}
function clearSelection() {
  state.selectedIds.clear();
  render();
}
function fillGalleryAgeRanges() {
  const select = $("#filterAgeRange");
  const ranges = state.ageGroup === "all"
    ? Object.values(state.ageRanges).flat()
    : (state.ageRanges[state.ageGroup] ?? []);
  const choices = [...new Map(ranges.map(([min, max]) => [`${min}-${max}`, [min, max]])).values()];
  select.innerHTML = '<option value="all">Toutes</option>';
  for (const [min, max] of choices) {
    const option = document.createElement("option");
    option.value = `${min}-${max}`;
    option.textContent = formatAgeRange(min, max);
    select.append(option);
  }
  if (!choices.some(([min, max]) => `${min}-${max}` === state.ageRange))
    state.ageRange = "all";
  select.value = state.ageRange;
}
function updateClearFilters() {
  $("#clearFilters").hidden = ["ageGroup", "ageRange", "gender", "quality"]
    .every((key) => state[key] === "all");
}
const allAgeRanges = () => Object.values(state.ageRanges).flat();
function buildAgePickerOptions() {
  const container = $("#agePickerOptions");
  container.replaceChildren();
  let index = 0;
  for (const [group, ranges] of Object.entries(state.ageRanges)) {
    const heading = document.createElement("strong");
    heading.textContent = ageLabels[group];
    container.append(heading);
    for (const [min, max] of ranges) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.index = String(index++);
      label.append(checkbox, document.createTextNode(formatAgeRange(min, max)));
      container.append(label);
    }
  }
}
function renderAgePicker() {
  const ranges = allAgeRanges();
  const selected = state.editAgeRanges.map(([min, max]) =>
    ranges.findIndex(([first, last]) => first === min && last === max));
  const available = selectableAgeIndexes(ranges, state.editAgeRanges);
  for (const checkbox of $("#agePickerOptions").querySelectorAll("input")) {
    const index = Number(checkbox.dataset.index);
    checkbox.checked = selected.includes(index);
    checkbox.disabled = !state.editAgePickerEditable;
    checkbox.parentElement.hidden = !available.includes(index);
  }
  for (const heading of $("#agePickerOptions").querySelectorAll("strong")) {
    let next = heading.nextElementSibling;
    heading.hidden = true;
    while (next && next.tagName !== "STRONG") {
      if (!next.hidden) heading.hidden = false;
      next = next.nextElementSibling;
    }
  }
  const summary = $("#agePickerSummary");
  summary.replaceChildren();
  if (state.editAgeRanges.length === 0) {
    summary.textContent = "Choisir une ou plusieurs tranches";
    return;
  }
  for (const [min, max] of state.editAgeRanges.slice(0, 2)) {
    const chip = document.createElement("span");
    chip.className = "age-chip";
    chip.textContent = formatAgeRange(min, max);
    summary.append(chip);
  }
  if (state.editAgeRanges.length > 2) {
    const more = document.createElement("span");
    more.textContent = `+${state.editAgeRanges.length - 2}`;
    summary.append(more);
  }
}
function closeAgePicker() {
  $("#agePickerMenu").hidden = true;
  $("#agePickerToggle").setAttribute("aria-expanded", "false");
}
function populateDetail(id) {
  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;
  state.selected = id;
  $("#detailTitle").textContent = `${item.id} · ${labels[item.status]}`;
  $("#detailImage").src = item.technical
    ? `/api/items/${id}/image?v=${item.technical.sha256}`
    : "";
  $("#detailImage").hidden = !item.technical;
  $("#technicalInfo").innerHTML =
    `<strong>Fichier</strong> · ${escapeHtml(item.originalName)}<br><strong>Dimensions</strong> · ${item.technical ? `${item.technical.width} × ${item.technical.height} px` : "—"}<br><strong>Format</strong> · ${item.technical?.format?.toUpperCase() ?? "—"}<br><strong>Taille</strong> · ${formatBytes(item.technical?.bytes)} / 50 Ko${item.error ? `<br><strong>Erreur</strong> · ${escapeHtml(item.error)}` : ""}${item.decision ? `<br><strong>Décision</strong> · ${escapeHtml(item.decision.reviewer)} · ${escapeHtml(item.decision.reason)}` : ""}`;
  const form = $("#metadataForm");
  form.reset();
  const metadata = item.metadata;
  $("#detailCollection").value = item.collection ?? "";
  $(".review-column .section-heading p").textContent = metadata?.reviewNotes
    ? `À vérifier : ${metadata.reviewNotes}` : "Corrige un choix seulement si nécessaire.";
  for (const key of ["gender", "appearance"])
    form.elements.namedItem(key).value = metadata?.[key] ?? "";
  form.elements.namedItem("skinToneMst").value = metadata?.skinToneMst ?? "";
  state.editAgeRanges = metadata ? metadataAgeRanges(metadata) : [];
  closeAgePicker();
  $("#rightsSummary").textContent =
    metadata?.rights === "Synthetic portrait generated for Persona"
      ? "Portrait synthétique créé pour Persona"
      : (metadata?.rights ?? "En attente du contrôle de l’agent");
  $("#evidenceSummary").textContent = metadata?.rightsEvidence?.startsWith(
    "Codex image_gen batch africa-pilot-2026-09-25",
  )
    ? "Généré avec Codex le 25/09/2026 · trace de génération conservée localement"
    : (metadata?.rightsEvidence ??
      "La provenance sera ajoutée avant ta validation.");
  const editable = Boolean(
    metadata && item.technical && item.status !== "processing-error",
  );
  form.querySelectorAll("select,button").forEach((element) => {
    element.disabled = !editable;
  });
  state.editAgePickerEditable = editable;
  renderAgePicker();
  const decided = ["approved", "rejected"].includes(item.status);
  $("#saveMetadata").textContent = "Enregistrer les changements";
  $("#reopenButton").hidden = !decided;
  $("#reopenButton").textContent = metadata && item.technical ? "Remettre à valider" : "Reprendre la préparation";
  $("#decisionStatus").textContent = decided
    ? `${labels[item.status]} · conservé localement. Vous pouvez reprendre sa revue ou corriger ses caractéristiques.`
    : `${labels[item.status]} · aucune décision enregistrée.`;
  $("#approveButton").disabled = item.status !== "ready-for-review";
  $("#rejectButton").disabled = item.status !== "ready-for-review";
  $("#detailError").hidden = true;
  $("#decisionReason").value = "";
}
function openDetail(id) {
  populateDetail(id);
  $("#detailDialog").showModal();
}
async function upload(files) {
  if (!files.length) return;
  let successes = 0;
  const errors = [];
  for (const file of files) {
    try {
      notify(
        `Traitement ${successes + errors.length + 1}/${files.length} · ${file.name}`,
      );
      await request("/api/upload", {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-file-name": encodeURIComponent(file.name),
          ...(state.uploadCollection ? { "x-portrait-collection": state.uploadCollection } : {}),
        },
        body: file,
      });
      successes++;
    } catch (error) {
      errors.push(`${file.name} : ${error.message}`);
    }
  }
  await refresh();
  notify(
    `${successes} fichier${successes > 1 ? "s" : ""} importé${successes > 1 ? "s" : ""}${errors.length ? `. ${errors.join(" ; ")}` : "."}`,
    errors.length > 0,
  );
}
function metadataPayload() {
  const item = state.items.find((candidate) => candidate.id === state.selected);
  const form = $("#metadataForm");
  if (!item?.metadata || !form.reportValidity()) return null;
  if (state.editAgeRanges.length === 0) {
    const error = state.sequence ? $("#serialError") : $("#detailError");
    error.textContent = "Choisis au moins une tranche d’âge apparent.";
    error.hidden = false;
    $("#agePickerToggle").focus();
    return null;
  }
  const values = Object.fromEntries(new FormData(form));
  const [apparentAgeMin, apparentAgeMax] = state.editAgeRanges[0];
  const payload = {
    ...item.metadata,
    ageGroup: ageGroupForRange(apparentAgeMin),
    gender: values.gender,
    appearance: values.appearance,
    apparentAgeMin,
    apparentAgeMax,
    apparentAgeRanges: state.editAgeRanges.map(([min, max]) => [min, max]),
  };
  if (values.skinToneMst) payload.skinToneMst = Number(values.skinToneMst);
  else delete payload.skinToneMst;
  delete payload.secondaryAgeMin;
  delete payload.secondaryAgeMax;
  if (values.appearance !== item.metadata.appearance) {
    payload.visualGroup = ["west-african", "central-african", "east-african", "southern-african"].includes(values.appearance)
      ? "black" : values.appearance;
  }
  return payload;
}
function metadataChanged(payload) {
  const metadata = state.items.find((item) => item.id === state.selected)?.metadata;
  return ["ageGroup", "gender", "appearance"].some((key) => payload[key] !== metadata?.[key])
    || JSON.stringify(payload.apparentAgeRanges) !== JSON.stringify(metadataAgeRanges(metadata))
    || payload.skinToneMst !== metadata?.skinToneMst;
}
function onlySkinToneChanged(payload) {
  const metadata = state.items.find((item) => item.id === state.selected)?.metadata;
  return payload.skinToneMst !== metadata?.skinToneMst
    && ["ageGroup", "gender", "appearance", "visualGroup"].every((key) => payload[key] === metadata?.[key])
    && JSON.stringify(payload.apparentAgeRanges) === JSON.stringify(metadataAgeRanges(metadata));
}
function decide(decision) {
  const reason = $("#decisionReason").value.trim();
  if (decision === "rejected" && !reason) {
    $("#decisionReason").focus();
    return;
  }
  const payload = metadataPayload();
  if (!payload) return;
  const changed = metadataChanged(payload);
  state.pendingDecision = { decision, reason: reason || "Conforme après inspection visuelle", payload: changed ? payload : null };
  $("#confirmDecisionTitle").textContent = decision === "approved" ? "Approuver ce portrait ?" : "Rejeter ce portrait ?";
  $("#confirmDecisionText").textContent = changed
    ? `Les caractéristiques modifiées seront enregistrées avant ${decision === "approved" ? "l’approbation" : "le rejet"}. Confirmer ?`
    : "Cette décision sera enregistrée localement. Vous pourrez ensuite remettre le portrait à valider.";
  $("#confirmDecision").textContent = decision === "approved" ? "Confirmer l’approbation" : "Confirmer le rejet";
  $("#confirmDecisionError").hidden = true;
  $("#confirmDecisionDialog").showModal();
}
async function confirmDecision() {
  const pending = state.pendingDecision;
  if (!pending) return;
  $("#confirmDecision").disabled = true;
  try {
    if (pending.payload) {
      await request(`/api/items/${state.selected}/metadata`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pending.payload),
      });
    }
    await request(`/api/items/${state.selected}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision: pending.decision, reviewer: "Osiris Balonga", reason: pending.reason }),
    });
    $("#confirmDecisionDialog").close();
    $("#detailDialog").close();
    await refresh();
    notify(pending.decision === "approved"
      ? "Portrait approuvé et conservé localement. Retrouvez-le dans Approuvés."
      : "Portrait rejeté et conservé localement. Retrouvez-le dans Rejetés.");
  } catch (error) {
    $("#confirmDecisionError").textContent = error.message;
    $("#confirmDecisionError").hidden = false;
    await refresh();
  } finally {
    $("#confirmDecision").disabled = false;
  }
}
const reviewColumn = $("#detailDialog .review-column");
function sequenceItem(index) {
  return state.items.find((item) => item.id === state.sequence?.ids[index]);
}
function showSequenceItem() {
  const sequence = state.sequence;
  if (!sequence) return;
  const item = sequenceItem(sequence.index);
  const completed = sequence.ids.filter((id) =>
    ["approved", "rejected"].includes(state.items.find((candidate) => candidate.id === id)?.status)).length;
  const remaining = sequence.ids.length - completed;
  $("#serialProgressCount").textContent = `${completed} / ${sequence.ids.length} examinés`;
  $("#serialProgressBar").max = sequence.ids.length;
  $("#serialProgressBar").value = completed;
  $("#serialRemaining").textContent = `${remaining} à valider`;
  $("#serialPosition").textContent = item
    ? `${sequence.index + 1}${sequence.index === 0 ? "er" : "e"} portrait`
    : "File terminée";
  $("#serialReview").hidden = !item;
  $("#serialDone").hidden = Boolean(item);
  if (!item) {
    $("#serialDoneText").textContent = remaining === 0
      ? `${sequence.ids.length} portraits examinés dans cette file.`
      : `${remaining} portrait${remaining > 1 ? "s" : ""} encore à valider dans cette file.`;
    return;
  }
  populateDetail(item.id);
  $("#serialImage").src = item.technical
    ? `/api/items/${item.id}/image?v=${item.technical.sha256}` : "";
  $("#serialId").textContent = item.id;
  $("#serialTechnical").innerHTML = item.technical
    ? `${item.technical.width} × ${item.technical.height} px · ${formatBytes(item.technical.bytes)} <span class="${isPortraitCompliant(item) ? "file-ok" : "file-bad"}">${isPortraitCompliant(item) ? "✓ Conforme" : "À corriger"}</span>`
    : "Caractéristiques indisponibles";
  for (const [selector, neighbor] of [["#serialPrevious", sequenceItem(sequence.index - 1)], ["#serialNext", sequenceItem(sequence.index + 1)]]) {
    const button = $(selector);
    button.disabled = !neighbor;
    button.querySelector("img").src = neighbor?.technical
      ? `/api/items/${neighbor.id}/image?v=${neighbor.technical.sha256}` : "";
    button.querySelector("span").textContent = neighbor
      ? `${neighbor.id} · ${labels[neighbor.status]}` : "";
  }
  const ready = item.status === "ready-for-review";
  $("#serialApprove").hidden = !ready;
  $("#serialReject").hidden = !ready;
  $("#serialReopen").hidden = ready;
  $("#serialError").hidden = true;
}
function closeSequence() {
  if (state.sequence?.busy) return;
  $("#serialDialog").close();
}
function moveSequence(index) {
  if (!state.sequence || index < 0 || index >= state.sequence.ids.length) return;
  const item = sequenceItem(state.sequence.index);
  if (item?.status === "ready-for-review") {
    const payload = metadataPayload();
    if (!payload) return;
    if (metadataChanged(payload)) {
      $("#serialError").textContent = "Valide ce portrait avant de quitter les caractéristiques modifiées.";
      $("#serialError").hidden = false;
      return;
    }
  }
  state.sequence.index = index;
  showSequenceItem();
}
async function submitSequenceDecision(decision, reason) {
  const sequence = state.sequence;
  if (!sequence || sequence.busy) return;
  const item = sequenceItem(sequence.index);
  const payload = metadataPayload();
  if (!item || !payload) return;
  sequence.busy = true;
  $("#serialApprove").disabled = true;
  $("#serialRejectConfirm").disabled = true;
  $("#closeSequence").disabled = true;
  try {
    if (metadataChanged(payload)) {
      await request(`/api/items/${item.id}/metadata`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
    }
    await request(`/api/items/${item.id}/decision`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, reviewer: "Osiris Balonga", reason }),
    });
    if ($("#serialRejectDialog").open) $("#serialRejectDialog").close();
    await refresh();
    sequence.index = nextPendingIndex(sequence.ids, state.items, sequence.index);
    showSequenceItem();
  } catch (error) {
    const target = $("#serialRejectDialog").open ? $("#serialRejectError") : $("#serialError");
    target.textContent = error.message;
    target.hidden = false;
    await refresh();
  } finally {
    sequence.busy = false;
    $("#serialApprove").disabled = false;
    $("#serialRejectConfirm").disabled = false;
    $("#closeSequence").disabled = false;
  }
}
$("#startSequence").addEventListener("click", () => {
  const ids = eligibleReviewIds(state.items, state);
  if (!ids.length) return;
  state.sequence = { ids, index: 0, busy: false };
  $("#serialFormHost").append(reviewColumn);
  $("#serialDialog").showModal();
  showSequenceItem();
});
$("#closeSequence").addEventListener("click", closeSequence);
$("#serialDoneClose").addEventListener("click", closeSequence);
$("#serialDialog").addEventListener("cancel", (event) => {
  if (state.sequence?.busy) event.preventDefault();
});
$("#serialDialog").addEventListener("close", () => {
  $("#detailDialog .dialog-layout").append(reviewColumn);
  state.sequence = null;
});
$("#serialPrevious").addEventListener("click", () => moveSequence(state.sequence.index - 1));
$("#serialNext").addEventListener("click", () => moveSequence(state.sequence.index + 1));
$("#serialApprove").addEventListener("click", () =>
  submitSequenceDecision("approved", "Conforme après inspection visuelle"));
$("#serialReject").addEventListener("click", () => {
  $("#serialRejectReason").value = "";
  $("#serialRejectError").hidden = true;
  $("#serialRejectDialog").showModal();
  $("#serialRejectReason").focus();
});
$("#serialRejectCancel").addEventListener("click", () => $("#serialRejectDialog").close());
$("#serialRejectConfirm").addEventListener("click", () => {
  const reason = $("#serialRejectReason").value.trim();
  if (!reason) { $("#serialRejectReason").focus(); return; }
  submitSequenceDecision("rejected", reason);
});
$("#serialReopen").addEventListener("click", async () => {
  const item = sequenceItem(state.sequence.index);
  const payload = metadataPayload();
  if (!item || !payload) return;
  try {
    if (metadataChanged(payload)) {
      await request(`/api/items/${item.id}/metadata`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      });
    } else await request(`/api/items/${item.id}/reopen`, { method: "POST" });
    await refresh();
    showSequenceItem();
  } catch (error) {
    $("#serialError").textContent = error.message;
    $("#serialError").hidden = false;
  }
});
$("#uploadButton").addEventListener("click", () => $("#fileInput").click());
$("#dropBrowse").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", (event) => {
  upload([...event.target.files]);
  event.target.value = "";
});
const zone = $("#dropZone");
for (const type of ["dragenter", "dragover"])
  zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.add("dragging");
  });
for (const type of ["dragleave", "drop"])
  zone.addEventListener(type, (event) => {
    event.preventDefault();
    zone.classList.remove("dragging");
  });
zone.addEventListener("drop", (event) => upload([...event.dataTransfer.files]));
zone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    $("#fileInput").click();
  }
});
$("#statusNav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-status]");
  if (!button) return;
  state.status = button.dataset.status;
  state.selectedIds.clear();
  $("#statusNav")
    .querySelectorAll("button")
    .forEach((element) =>
      element.classList.toggle("active", element === button),
    );
  render();
});
$("#appearanceNav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-region]");
  if (button) {
    const region = button.dataset.region;
    const branch = button.closest(".region-branch");
    if (branch && button.classList.contains("region-parent")) {
      const expanded = !state.openRegions.has(region);
      state.openRegions.clear();
      $("#appearanceNav").querySelectorAll(".region-branch.expanded").forEach((openBranch) => {
        openBranch.classList.remove("expanded");
        openBranch.querySelector(".region-parent").setAttribute("aria-expanded", "false");
      });
      if (expanded) state.openRegions.add(region);
      branch.classList.toggle("expanded", expanded);
      button.setAttribute("aria-expanded", String(expanded));
      return;
    }
    state.region = region;
    state.selectedIds.clear();
    updateSidebarSelection();
    render({ sidebar: false });
  }
});
for (const [id, key] of [
  ["filterAgeGroup", "ageGroup"],
  ["filterAgeRange", "ageRange"],
  ["filterGender", "gender"],
  ["filterQuality", "quality"],
]) {
  $(`#${id}`).addEventListener("change", (event) => {
    state[key] = event.target.value;
    state.selectedIds.clear();
    if (key === "ageGroup") fillGalleryAgeRanges();
    updateClearFilters();
    render();
  });
}
$("#clearFilters").addEventListener("click", () => {
  for (const key of ["ageGroup", "ageRange", "gender", "quality"])
    state[key] = "all";
  for (const id of ["filterAgeGroup", "filterGender", "filterQuality"])
    $(`#${id}`).value = "all";
  fillGalleryAgeRanges();
  updateClearFilters();
  state.selectedIds.clear();
  render();
});
$("#selectionToggle").addEventListener("click", () => {
  state.selectionMode = !state.selectionMode;
  state.selectedIds.clear();
  render();
});
$("#selectVisible").addEventListener("click", () => {
  const eligible = state.items.filter((item) => item.status === "ready-for-review" && matchesPortraitFilters(item, state));
  const allSelected = eligible.every((item) => state.selectedIds.has(item.id));
  state.selectionMode = true;
  for (const item of eligible) {
    if (allSelected) state.selectedIds.delete(item.id);
    else state.selectedIds.add(item.id);
  }
  render();
});
$("#clearSelection").addEventListener("click", clearSelection);
$("#groups").addEventListener("click", (event) => {
  const tile = event.target.closest(".portrait-tile");
  if (!tile) return;
  if (state.selectionMode && state.items.some((item) => item.id === tile.dataset.id && item.status === "ready-for-review")) {
    if (state.selectedIds.has(tile.dataset.id)) state.selectedIds.delete(tile.dataset.id);
    else state.selectedIds.add(tile.dataset.id);
    render();
  } else openDetail(tile.dataset.id);
});
function openBulkDecision(decision) {
  if (!state.selectedIds.size) return;
  state.bulkDecision = decision;
  $("#bulkTitle").textContent = decision === "approved" ? "Approuver le lot" : "Rejeter le lot";
  $("#bulkSummary").textContent = `${state.selectedIds.size} portrait${state.selectedIds.size > 1 ? "s" : ""} sélectionné${state.selectedIds.size > 1 ? "s" : ""}. Cette décision s’appliquera à chacun.`;
  $("#bulkReasonLabel").hidden = decision !== "rejected";
  $("#bulkReason").hidden = decision !== "rejected";
  $("#bulkReason").value = "";
  $("#bulkError").hidden = true;
  $("#bulkDialog").showModal();
}
$("#bulkApprove").addEventListener("click", () => openBulkDecision("approved"));
$("#bulkReject").addEventListener("click", () => openBulkDecision("rejected"));
$("#bulkCancel").addEventListener("click", () => $("#bulkDialog").close());
$("#bulkConfirm").addEventListener("click", async () => {
  const reason = state.bulkDecision === "rejected"
    ? $("#bulkReason").value.trim()
    : "Revue visuelle du lot";
  if (!reason) { $("#bulkReason").focus(); return; }
  const count = state.selectedIds.size;
  $("#bulkConfirm").disabled = true;
  try {
    await request("/api/decisions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [...state.selectedIds], decision: state.bulkDecision,
        reviewer: "Osiris Balonga", reason }),
    });
    $("#bulkDialog").close();
    state.selectedIds.clear();
    state.selectionMode = false;
    await refresh();
    notify(`${count} portrait${count > 1 ? "s" : ""} ${state.bulkDecision === "approved" ? "approuvé" : "rejeté"}${count > 1 ? "s" : ""}.`);
  } catch (error) {
    $("#bulkError").textContent = error.message;
    $("#bulkError").hidden = false;
  } finally {
    $("#bulkConfirm").disabled = false;
  }
});
$("#closeDialog").addEventListener("click", () => $("#detailDialog").close());
$("#agePickerToggle").addEventListener("click", () => {
  const menu = $("#agePickerMenu");
  menu.hidden = !menu.hidden;
  $("#agePickerToggle").setAttribute("aria-expanded", String(!menu.hidden));
});
$("#agePickerOptions").addEventListener("change", (event) => {
  const checkbox = event.target.closest('input[type="checkbox"]');
  if (!checkbox) return;
  const ranges = allAgeRanges();
  const index = Number(checkbox.dataset.index);
  if (checkbox.checked) state.editAgeRanges.push(ranges[index]);
  else state.editAgeRanges = state.editAgeRanges.filter(([min, max]) =>
    min !== ranges[index][0] || max !== ranges[index][1]);
  state.editAgeRanges.sort(([a], [b]) => a - b);
  $("#detailError").hidden = true;
  renderAgePicker();
});
$("#clearAgeRanges").addEventListener("click", () => {
  state.editAgeRanges = [];
  renderAgePicker();
  $("#agePickerOptions input:not(:disabled)")?.focus();
});
document.addEventListener("click", (event) => {
  if (!$("#agePicker").contains(event.target)) closeAgePicker();
});
$("#agePicker").addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#agePickerMenu").hidden) {
    event.stopPropagation();
    closeAgePicker();
    $("#agePickerToggle").focus();
  }
});
$("#metadataForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = metadataPayload();
  if (!payload) return;
  const wasDecided = ["approved", "rejected"].includes(
    state.items.find((item) => item.id === state.selected)?.status,
  );
  if (!metadataChanged(payload)) {
    notify("Aucune correction à enregistrer.");
    return;
  }
  const toneOnly = onlySkinToneChanged(payload);
  try {
    await request(`/api/items/${state.selected}/${toneOnly ? "skin-tone" : "metadata"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toneOnly ? { tone: payload.skinToneMst ?? null } : payload),
    });
    await refresh();
    $("#detailDialog").close();
    notify(toneOnly
      ? "Teinte enregistrée. La décision de validation est conservée."
      : wasDecided
      ? "Corrections enregistrées. La décision précédente est annulée : le portrait est à valider."
      : "Corrections enregistrées. Le portrait reste à valider.");
  } catch (error) {
    $("#detailError").textContent = error.message;
    $("#detailError").hidden = false;
  }
});
$("#approveButton").addEventListener("click", () => decide("approved"));
$("#rejectButton").addEventListener("click", () => decide("rejected"));
$("#cancelDecision").addEventListener("click", () => $("#confirmDecisionDialog").close());
$("#confirmDecision").addEventListener("click", confirmDecision);
$("#reopenButton").addEventListener("click", async () => {
  const item = state.items.find((candidate) => candidate.id === state.selected);
  const payload = metadataPayload();
  if (item?.metadata && !payload) return;
  if (payload && metadataChanged(payload)) {
    $("#detailError").textContent = "Enregistrez d’abord vos corrections pour ne pas les perdre.";
    $("#detailError").hidden = false;
    return;
  }
  try {
    await request(`/api/items/${state.selected}/reopen`, { method: "POST" });
    $("#detailDialog").close();
    await refresh();
    notify("Décision annulée. Le portrait peut de nouveau être préparé ou validé.");
  } catch (error) {
    $("#detailError").textContent = error.message;
    $("#detailError").hidden = false;
  }
});
$("#uploadCollection").addEventListener("change", (event) => { state.uploadCollection = event.target.value; });
$("#detailCollection").addEventListener("change", async (event) => {
  if (!state.selected) return;
  try {
    await request("/api/collections", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [state.selected], collection: event.target.value || null }) });
    await refresh();
    notify("Lot de production enregistré.");
  } catch (error) { notify(error.message, true); }
});
request("/api/options")
  .then(({ appearanceCategories, portraitAgeRanges, portraitCollectionOptions }) => {
    state.appearances = appearanceCategories;
    state.ageRanges = portraitAgeRanges;
    for (const collection of portraitCollectionOptions) {
      for (const id of ["uploadCollection", "detailCollection"]) {
        const option = document.createElement("option");
        option.value = collection;
        option.textContent = collectionLabels[collection] ?? collection;
        $(`#${id}`).append(option);
      }
    }
    fillGalleryAgeRanges();
    buildAgePickerOptions();
    for (const category of appearanceCategories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = appearanceLabels[category] ?? category;
      $("#metadataForm").elements.namedItem("appearance").append(option);
    }
    return refresh();
  })
  .catch((error) => notify(error.message, true));
setInterval(() => {
  if (!$("#detailDialog").open && !$("#bulkDialog").open && !$("#serialDialog").open)
    refresh().catch((error) => notify(error.message, true));
}, 5000);
