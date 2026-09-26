const $ = (selector) => document.querySelector(selector);
const state = {
  items: [],
  appearances: [],
  ageRanges: {},
  appearance: "all",
  status: "all",
  selected: null,
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
  "middle-eastern": "Moyen-Orient",
  european: "Europe",
  "south-asian": "Asie du Sud",
  "east-asian": "Asie de l’Est",
  "southeast-asian": "Asie du Sud-Est",
  "latin-american": "Amérique latine",
  mixed: "Mixte",
  unclassified: "À classer",
};
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
function render() {
  const appearanceOf = (item) => item.metadata?.appearance ?? "unclassified";
  const available = [
    ...state.appearances.filter((name) =>
      state.items.some((item) => appearanceOf(item) === name),
    ),
  ];
  if (state.items.some((item) => appearanceOf(item) === "unclassified"))
    available.push("unclassified");
  if (state.appearance !== "all" && !available.includes(state.appearance))
    state.appearance = "all";
  $("#appearanceNav").innerHTML =
    `<button type="button" data-appearance="all" class="${state.appearance === "all" ? "active" : ""}">Toutes les apparences <span>${state.items.length}</span></button>` +
    available
      .map(
        (name) =>
          `<button type="button" data-appearance="${name}" class="${state.appearance === name ? "active" : ""}">${appearanceLabels[name]} <span>${state.items.filter((item) => appearanceOf(item) === name).length}</span></button>`,
      )
      .join("");
  $("#totalCount").textContent = state.items.length;
  $("#readyCount").textContent = state.items.filter(
    (item) => item.status === "ready-for-review",
  ).length;
  $("#nav-all").textContent = state.items.length;
  for (const status of Object.keys(labels))
    $(`#nav-${status}`).textContent = state.items.filter(
      (item) => item.status === status,
    ).length;
  const visible = state.items.filter(
    (item) =>
      (state.status === "all" || item.status === state.status) &&
      (state.appearance === "all" || appearanceOf(item) === state.appearance),
  );
  const groups = available
    .filter(
      (appearance) =>
        state.appearance === "all" || state.appearance === appearance,
    )
    .map((appearance) => ({
      appearance,
      items: visible.filter((item) => appearanceOf(item) === appearance),
    }))
    .filter((group) => group.items.length);
  $("#empty").hidden = groups.length > 0;
  $("#groups").innerHTML = groups
    .map(
      (
        group,
      ) => `<section class="portrait-group" id="group-${group.appearance}">
    <div class="group-head"><h2>${appearanceLabels[group.appearance]}</h2><span class="group-count">${group.items.length}</span></div>
    <div class="portrait-grid">${group.items
      .map(
        (
          item,
        ) => `<button type="button" class="portrait-tile" data-id="${item.id}" aria-label="Ouvrir ${item.id}, ${labels[item.status]}" title="${escapeHtml(item.originalName)}">
      ${item.technical ? `<img src="/api/items/${item.id}/image?v=${item.technical.sha256}" alt="" loading="lazy">` : '<span class="missing">Image à corriger</span>'}
      <span class="tile-status ${item.status}" title="${labels[item.status]}"></span><span class="tile-caption"><span>${item.id}</span><span>${item.metadata ? formatAgeRange(item.metadata.apparentAgeMin, item.metadata.apparentAgeMax) : labels[item.status]}</span></span>
    </button>`,
      )
      .join("")}</div></section>`,
    )
    .join("");
}
function fillAgeRanges(group, selected) {
  const select = $("#metadataForm").elements.namedItem("ageRange");
  select.innerHTML = '<option value="">Choisir un intervalle</option>';
  const ranges = state.ageRanges[group] ?? [];
  for (const [min, max] of ranges) {
    const option = document.createElement("option");
    option.value = `${min}-${max}`;
    option.textContent = `${formatAgeRange(min, max)}${option.value === selected ? " · proposition" : ""}`;
    select.append(option);
  }
  select.value = selected ?? "";
}
function openDetail(id) {
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
  for (const key of ["ageGroup", "gender", "appearance"])
    form.elements.namedItem(key).value = metadata?.[key] ?? "";
  fillAgeRanges(
    metadata?.ageGroup,
    metadata ? `${metadata.apparentAgeMin}-${metadata.apparentAgeMax}` : "",
  );
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
    metadata && item.technical && item.status !== "approved",
  );
  form.querySelectorAll("select,button").forEach((element) => {
    element.disabled = !editable;
  });
  $("#approveButton").disabled = item.status !== "ready-for-review";
  $("#rejectButton").disabled = ["rejected", "approved"].includes(item.status);
  $("#decisionReason").value = "";
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
async function decide(decision) {
  const reason = $("#decisionReason").value.trim();
  if (decision === "rejected" && !reason) {
    $("#decisionReason").focus();
    return;
  }
  try {
    await request(`/api/items/${state.selected}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        decision,
        reviewer: "Osiris Balonga",
        reason: reason || "Conforme après inspection visuelle",
      }),
    });
    $("#detailDialog").close();
    await refresh();
    notify(
      decision === "approved"
        ? "Portrait approuvé et conservé localement."
        : "Portrait rejeté et conservé pour suivi.",
    );
  } catch (error) {
    notify(error.message, true);
  }
}
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
  $("#statusNav")
    .querySelectorAll("button")
    .forEach((element) =>
      element.classList.toggle("active", element === button),
    );
  render();
});
$("#appearanceNav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-appearance]");
  if (button) {
    state.appearance = button.dataset.appearance;
    render();
  }
});
$("#groups").addEventListener("click", (event) => {
  const tile = event.target.closest(".portrait-tile");
  if (tile) openDetail(tile.dataset.id);
});
$("#closeDialog").addEventListener("click", () => $("#detailDialog").close());
$("#metadataForm")
  .elements.namedItem("ageGroup")
  .addEventListener("change", (event) => fillAgeRanges(event.target.value, ""));
$("#metadataForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = state.items.find((candidate) => candidate.id === state.selected);
  if (!item?.metadata) return;
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const [apparentAgeMin, apparentAgeMax] = values.ageRange
    .split("-")
    .map(Number);
  const payload = {
    ...item.metadata,
    ageGroup: values.ageGroup,
    gender: values.gender,
    appearance: values.appearance,
    apparentAgeMin,
    apparentAgeMax,
  };
  if (values.appearance !== item.metadata.appearance) {
    payload.visualGroup = [
      "west-african",
      "central-african",
      "east-african",
      "southern-african",
    ].includes(values.appearance)
      ? "black"
      : values.appearance;
  }
  try {
    await request(`/api/items/${state.selected}/metadata`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    await refresh();
    $("#detailDialog").close();
    notify("Corrections enregistrées. Le portrait reste à valider.");
  } catch (error) {
    notify(error.message, true);
  }
});
$("#approveButton").addEventListener("click", () => decide("approved"));
$("#rejectButton").addEventListener("click", () => decide("rejected"));
request("/api/options")
  .then(({ appearanceCategories, portraitAgeRanges }) => {
    state.appearances = appearanceCategories;
    state.ageRanges = portraitAgeRanges;
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
  if (!$("#detailDialog").open)
    refresh().catch((error) => notify(error.message, true));
}, 5000);
