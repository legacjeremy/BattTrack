import { APP_VERSION, BATTERY_INPUT_TYPES, INPUT_MODES, LED_BEHAVIORS, STATUS, DASHBOARD_SORTS, THEMES } from "./constants.js";
import { buildLedAdvancedState, buildLedSimpleState, convertLedAdvancedToPercent, convertLedSimpleToPercent, getLedSliderPositionFromPercent } from "./measurement.js";
import { calculateMeasurementRates, formatRelativeDate } from "./calculation.js";
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const pageTitle = document.querySelector("#page-title");

export function setPageTitle(title) { pageTitle.textContent = title; }
export function setFabVisible(visible) { document.querySelector("#floating-action-button").hidden = !visible; }
export function setActiveNav(view) {
  document.querySelector("#nav-dashboard").classList.toggle("active", view === "dashboard");
  document.querySelector("#nav-batteries").classList.toggle("active", ["batteries","battery-details","archives","archived-battery-details"].includes(view));
  document.querySelector("#nav-settings").classList.toggle("active", view === "settings");
}

export function renderDashboard(items, settings, archivedCount, handlers) {
  setPageTitle("Tableau de bord");
  const active = items.filter(i => !i.battery.archived);
  const red = active.filter(i => i.status.status === STATUS.RED);
  const orange = active.filter(i => i.status.status === STATUS.ORANGE);
  const green = active.filter(i => i.status.status === STATUS.GREEN);
  const uninit = active.filter(i => i.status.status === STATUS.UNINITIALIZED);
  app.innerHTML = `
    <section class="card"><h2>Tableau de bord</h2><div class="status-row">
      <div><span class="badge badge-gray">🔋 Actives : ${active.length}</span></div>
      <div><span class="badge badge-red"><img class="status-icon" src="assets/icons/status/critical.svg" alt=""> À recharger : ${red.length}</span></div>
      <div><span class="badge badge-orange"><img class="status-icon" src="assets/icons/status/warning.svg" alt=""> À surveiller : ${orange.length}</span></div>
      <div><span class="badge badge-green"><img class="status-icon" src="assets/icons/status/ok.svg" alt=""> OK : ${green.length}</span></div>
      <div><span class="badge badge-gray"><img class="status-icon" src="assets/icons/status/unknown.svg" alt=""> Non initialisée : ${uninit.length}</span></div>
      <div><span class="badge badge-gray">📦 Archivées : ${archivedCount}</span></div>
    </div></section>
    <section class="card"><h3>Batteries</h3>${renderSortControl("dashboard-sort", settings.dashboardSort)}${active.length === 0 ? `<p class="empty-state">Aucune batterie active.</p>` : renderBatteryList(active)}</section>`;
  bindBatteryButtons(handlers.onOpenBattery);
  bindSort("#dashboard-sort", handlers.onSortChange);
}

export function renderBatteriesPage(items, settings, archivedCount, handlers) {
  setPageTitle("🔋 Batteries");
  const active = items.filter(i => !i.battery.archived);
  app.innerHTML = `<section class="card"><h2>🔋 Batteries</h2>${renderSortControl("batteries-sort", settings.batteriesSort)}<label class="search-box">Rechercher<input id="battery-search" type="search" placeholder="DJI, laser, trottinette..."></label><div id="battery-list-zone">${active.length === 0 ? `<p class="empty-state">Aucune batterie active.</p>` : renderBatteryList(active)}</div><div class="archives-link"><button id="open-archives" class="button secondary-button" type="button">📦 Archives (${archivedCount})</button></div></section>`;
  const zone = app.querySelector("#battery-list-zone");
  const search = app.querySelector("#battery-search");
  const bind = () => zone.querySelectorAll("[data-battery-id]").forEach(btn => btn.addEventListener("click", () => handlers.onOpenBattery(btn.dataset.batteryId)));
  bind();
  search.addEventListener("input", () => { const q = search.value.trim().toLowerCase(); const filtered = active.filter(i => i.battery.name.toLowerCase().includes(q)); zone.innerHTML = filtered.length ? renderBatteryList(filtered) : `<p class="empty-state">Aucune batterie trouvée.</p>`; bind(); });
  bindSort("#batteries-sort", handlers.onSortChange);
  app.querySelector("#open-archives").onclick = handlers.onArchives;
}

export function renderArchivesPage(items, handlers) {
  setPageTitle("📦 Archives");
  const archived = items.filter(i => i.battery.archived);
  app.innerHTML = `<section class="card"><h2>📦 Archives (${archived.length})</h2>${archived.length === 0 ? `<p class="empty-state">Aucune batterie archivée.</p>` : renderBatteryList(archived)}</section>`;
  bindBatteryButtons(handlers.onOpenBattery);
}

export function renderBatteryDetails(battery, measurements, status, handlers) {
  setPageTitle(battery.archived ? "📦 Batterie archivée" : "🔋 Batterie");
  const measurementsWithRates = calculateMeasurementRates(measurements);
  const estimatedText = status.estimatedLevelIsAvailable ? `≈ ${status.estimatedLevelPercent} %` : "≈ ?";
  app.innerHTML = `
    <section class="card"><h2>${escapeHtml(battery.name)}</h2>${battery.archived ? `<p><span class="badge badge-gray">📦 Archivée</span></p>` : ""}${battery.notes ? `<p class="helper-text">${escapeHtml(battery.notes)}</p>` : ""}</section>
    <section class="card"><h3>Statut</h3><p>${battery.archived ? `<span class="badge badge-gray">📦 Archivée</span>` : formatStatus(status.status)}</p><p>≈ Niveau actuel : <strong class="${statusClass(status.status)}">${estimatedText}</strong></p>${!status.estimatedLevelIsAvailable ? `<p class="helper-text">Pas assez de mesures pour estimer l'autodécharge.</p>` : ""}<p>Dernière mesure : <strong>${status.lastLevelPercent ?? "-"} %</strong> (${formatRelativeDate(status.lastMeasurementDate)})</p><p>Date seuil estimée : <strong>${status.estimatedThresholdDate ? formatRelativeDate(status.estimatedThresholdDate) : "Non calculable"}</strong></p><p>Confiance : <strong>${status.confidence}</strong></p></section>
    <section class="card"><h3>Statistiques</h3><p>Mesures : <strong>${status.measurementCount}</strong></p><p>Cycles : <strong>${status.cycleCount}</strong></p><p>Perte moyenne : <strong>${status.averageDischargePerDay.toFixed(3)} % / jour</strong></p></section>
    <section class="card"><h3>Historique</h3>${measurements.length === 0 ? `<p class="empty-state">Aucune mesure.</p>` : renderMeasurementHistory(measurementsWithRates)}</section>`;
  app.querySelectorAll("[data-measurement-id]").forEach(row => row.addEventListener("click", () => handlers.onEditMeasurement(row.dataset.measurementId)));
}

export function renderSettingsPage(settings, handlers) {
  setPageTitle("⚙️ Paramètres");
  app.innerHTML = `<section class="card"><h2>⚙️ Paramètres</h2><form id="settings-form" class="form-grid">
    <h3>Alertes</h3>
    <label>🟠 Seuil d'alerte (%)<input name="alertThresholdPercent" type="number" inputmode="numeric" min="0" max="100" step="1" value="${settings.alertThresholdPercent}" required></label>
    <label>🔴 Seuil critique (%)<input name="criticalThresholdPercent" type="number" inputmode="numeric" min="0" max="100" step="1" value="${settings.criticalThresholdPercent}" required></label>
    <h3>Apparence</h3>
    <label>Thème<select name="theme"><option value="${THEMES.SYSTEM}">📱 Système</option><option value="${THEMES.LIGHT}">☀️ Clair</option><option value="${THEMES.DARK}">🌙 Sombre</option></select></label>
    <div class="action-row"><button class="button" type="submit">Enregistrer</button></div>
  </form></section>
  <section class="card"><h3>Données</h3><div class="action-row"><button id="export-json" class="button secondary-button" type="button">💾 Exporter JSON</button><label class="button secondary-button">📥 Importer JSON<input id="import-json-input" type="file" accept="application/json" hidden></label></div></section>
  <section class="card"><h3>À propos</h3><button id="about-button" class="button secondary-button" type="button">Voir</button></section>`;
  const form = app.querySelector("#settings-form");
  form.theme.value = settings.theme;
  form.addEventListener("submit", e => { e.preventDefault(); const data = new FormData(e.currentTarget); handlers.onSave({ alertThresholdPercent: Number(data.get("alertThresholdPercent")), criticalThresholdPercent: Number(data.get("criticalThresholdPercent")), theme: data.get("theme") }); });
  app.querySelector("#export-json").onclick = handlers.onExportJson;
  app.querySelector("#import-json-input").onchange = e => handlers.onImportJson(e.target.files?.[0]);
  app.querySelector("#about-button").onclick = () => { openModal(`<h2>Battery Reminder</h2><p class="about-text">Aider à éviter les décharges profondes des batteries rarement utilisées en estimant leur autodécharge et en affichant un statut visuel.</p><p>Version : <strong>${APP_VERSION}</strong></p><div class="action-row"><button id="close-about" class="button secondary-button" type="button">Fermer</button></div>`); modalRoot.querySelector("#close-about").onclick = closeModal; };
}

export function openQuickMeasurementPicker(items, handlers) {
  const active = items.filter(i => !i.battery.archived);
  openModal(`<h2>Ajouter une mesure</h2><label class="search-box">Rechercher<input id="battery-search" type="search" placeholder="DJI, laser, trottinette..."></label><div id="quick-battery-list">${renderQuickBatteryList(active)}</div><div class="action-row"><button id="cancel-form" class="button secondary-button" type="button">Annuler</button></div>`);
  const search = modalRoot.querySelector("#battery-search"); const list = modalRoot.querySelector("#quick-battery-list");
  const bind = () => list.querySelectorAll("[data-battery-id]").forEach(btn => btn.addEventListener("click", () => handlers.onSelectBattery(active.find(i => i.battery.id === btn.dataset.batteryId).battery)));
  search.addEventListener("input", () => { const q = search.value.trim().toLowerCase(); list.innerHTML = renderQuickBatteryList(active.filter(i => i.battery.name.toLowerCase().includes(q))); bind(); });
  bind(); modalRoot.querySelector("#cancel-form").addEventListener("click", closeModal);
}

export function openBatteryActionModal(battery, handlers) {
  const isArchived = battery.archived;
  openModal(`<h2>${escapeHtml(battery.name)}</h2><div class="action-column">
    ${isArchived ? `<button id="restore-battery" class="button" type="button">↩️ Restaurer</button><button id="delete-battery" class="button danger-button" type="button">🗑️ Supprimer définitivement</button>` : `<button id="add-measurement" class="button" type="button">Ajouter une mesure</button><button id="add-charge" class="button secondary-button" type="button">🔋 Rechargé à 100 %</button><button id="edit-battery" class="button secondary-button" type="button">✏️ Modifier la batterie</button><button id="archive-battery" class="button warning-button" type="button">📦 Archiver la batterie</button>`}
    <button id="cancel-form" class="button secondary-button" type="button">Annuler</button></div>`);
  if (isArchived) { modalRoot.querySelector("#restore-battery").onclick = handlers.onRestore; modalRoot.querySelector("#delete-battery").onclick = handlers.onDelete; }
  else { modalRoot.querySelector("#add-measurement").onclick = handlers.onAddMeasurement; modalRoot.querySelector("#add-charge").onclick = handlers.onAddCharge; modalRoot.querySelector("#edit-battery").onclick = handlers.onEdit; modalRoot.querySelector("#archive-battery").onclick = handlers.onArchive; }
  modalRoot.querySelector("#cancel-form").onclick = closeModal;
}

export function openArchivesDeletePicker(items, handlers) {
  const archived = items.filter(i => i.battery.archived);
  openModal(`<h2>Supprimer définitivement</h2>${archived.length === 0 ? `<p class="empty-state">Aucune batterie archivée.</p>` : renderQuickBatteryList(archived)}<div class="action-row"><button id="cancel-form" class="button secondary-button" type="button">Annuler</button></div>`);
  modalRoot.querySelectorAll("[data-battery-id]").forEach(btn => btn.addEventListener("click", () => handlers.onDeleteBattery(btn.dataset.batteryId)));
  modalRoot.querySelector("#cancel-form").onclick = closeModal;
}

export function openBatteryFormModal(handlers, battery = null) {
  const inputType = battery?.inputType ?? inputTypeFromBattery(battery);
  openModal(`<h2>${battery ? "Modifier batterie" : "Créer batterie"}</h2><form id="battery-form" class="form-grid">
    <label>Nom<input name="name" type="text" value="${escapeHtml(battery?.name ?? "")}" required></label>
    <label>Mode de saisie<select name="inputType"><option value="percentage">Pourcentage</option><option value="led_simple">LEDs fixes</option><option value="led_advanced">LEDs fixes + clignotantes</option></select></label>
    <div id="led-config-section"><label>Configuration LEDs<div id="led-config-preview" class="led-preview"></div><input id="led-count-slider" name="ledCount" type="range" min="2" max="6" step="1" value="${battery?.ledConfig?.ledCount ?? 4}"><span class="helper-text"><span id="led-count-label">${battery?.ledConfig?.ledCount ?? 4}</span> LEDs</span></label></div>
    <label>Notes<textarea name="notes">${escapeHtml(battery?.notes ?? "")}</textarea></label>
    <div class="action-row"><button class="button" type="submit">Enregistrer</button><button id="cancel-form" class="button secondary-button" type="button">Annuler</button></div></form>`);
  const form = modalRoot.querySelector("#battery-form"), section = modalRoot.querySelector("#led-config-section"), slider = modalRoot.querySelector("#led-count-slider"), preview = modalRoot.querySelector("#led-config-preview"), label = modalRoot.querySelector("#led-count-label");
  form.inputType.value = inputType;
  const update = () => { const type = form.inputType.value; const isLed = type !== BATTERY_INPUT_TYPES.PERCENTAGE; section.hidden = !isLed; if (!isLed) return; const count = Number(slider.value); const behavior = type === BATTERY_INPUT_TYPES.LED_ADVANCED ? LED_BEHAVIORS.ADVANCED : LED_BEHAVIORS.SIMPLE; label.textContent = String(count); const pos = behavior === LED_BEHAVIORS.ADVANCED ? count * 2 - 1 : Math.max(1, count - 1); preview.innerHTML = renderLedPreviewHtml(count, behavior, pos); };
  form.inputType.onchange = update; slider.oninput = update; update();
  form.onsubmit = e => { e.preventDefault(); const data = new FormData(form); const savedInputType = data.get("inputType"); const isLed = savedInputType !== BATTERY_INPUT_TYPES.PERCENTAGE; handlers.onSave({ name: data.get("name"), inputType: savedInputType, ledConfig: isLed ? { ledCount: Number(data.get("ledCount")), behavior: savedInputType === BATTERY_INPUT_TYPES.LED_ADVANCED ? LED_BEHAVIORS.ADVANCED : LED_BEHAVIORS.SIMPLE } : null, notes: data.get("notes") }); closeModal(); };
  modalRoot.querySelector("#cancel-form").onclick = closeModal;
}

export function openAddMeasurementModal(battery, handlers, existingMeasurement = null) {
  const isLed = battery.preferredInputMode === INPUT_MODES.LED && battery.ledConfig;
  const ledCount = battery.ledConfig?.ledCount ?? existingMeasurement?.observation?.ledCount ?? 4;
  const behavior = battery.ledConfig?.behavior ?? existingMeasurement?.observation?.behavior ?? LED_BEHAVIORS.SIMPLE;
  const maxPosition = behavior === LED_BEHAVIORS.ADVANCED ? ledCount * 2 : ledCount;
  const initialPosition = existingMeasurement?.observation?.sliderPosition ?? maxPosition;
  const initialPercent = existingMeasurement?.levelPercent ?? (behavior === LED_BEHAVIORS.ADVANCED ? convertLedAdvancedToPercent(ledCount, initialPosition) : convertLedSimpleToPercent(ledCount, initialPosition));
  openModal(`<h2>${existingMeasurement ? "Modifier mesure" : "Ajouter mesure"}</h2><form id="measurement-form" class="form-grid">
    <label>Date<input name="date" type="date" value="${existingMeasurement?.date ?? new Date().toISOString().slice(0,10)}" required></label>
    ${isLed ? `<div><div id="led-preview" class="led-preview"></div><input id="led-slider" name="sliderPosition" type="range" min="0" max="${maxPosition}" step="1" value="${initialPosition}"></div>` : ""}
    <label>Pourcentage<input name="levelPercent" type="number" inputmode="numeric" min="0" max="100" step="1" value="${initialPercent}" required></label>
    <div class="action-row"><button class="button" type="submit">Enregistrer</button>${existingMeasurement ? `<button id="delete-measurement" class="button danger-button" type="button">Supprimer</button>` : ""}<button id="cancel-form" class="button secondary-button" type="button">Annuler</button></div></form>`);
  const form = modalRoot.querySelector("#measurement-form"), slider = modalRoot.querySelector("#led-slider"), preview = modalRoot.querySelector("#led-preview");
  if (slider && preview) {
    const updatePreviewOnly = () => { const pos = Number(slider.value); const percent = Number(form.levelPercent.value); preview.innerHTML = `${renderLedPreviewHtml(ledCount, behavior, pos)} <span class="led-preview-text">(${Number.isNaN(percent) ? "-" : percent} %)</span>`; };
    slider.oninput = () => { const pos = Number(slider.value); form.levelPercent.value = behavior === LED_BEHAVIORS.ADVANCED ? convertLedAdvancedToPercent(ledCount, pos) : convertLedSimpleToPercent(ledCount, pos); updatePreviewOnly(); };
    form.levelPercent.oninput = () => { slider.value = String(getLedSliderPositionFromPercent(Number(form.levelPercent.value), ledCount, behavior)); updatePreviewOnly(); };
    updatePreviewOnly();
  }
  form.onsubmit = e => { e.preventDefault(); const data = new FormData(form); handlers.onSave({ date: data.get("date"), levelPercent: Number(data.get("levelPercent")), sliderPosition: slider ? Number(data.get("sliderPosition")) : null, existingMeasurement }); closeModal(); };
  if (existingMeasurement) modalRoot.querySelector("#delete-measurement").onclick = () => handlers.onDelete(existingMeasurement);
  modalRoot.querySelector("#cancel-form").onclick = closeModal;
}
export function closeModal() { modalRoot.innerHTML = ""; }

function renderSortControl(id, value) { return `<div class="sort-row"><label>Trier par <select id="${id}" data-current="${value}"><option value="urgency">Urgence</option><option value="name">Nom</option><option value="estimatedLevel">≈ % restant</option><option value="lastMeasurement">Dernière mesure</option><option value="lastCharge">Dernière recharge</option><option value="status">Statut</option></select></label></div>`; }
function bindSort(selector, handler) { const select = app.querySelector(selector); select.value = select.dataset.current; select.onchange = () => handler(select.value); }
function bindBatteryButtons(handler) { app.querySelectorAll("[data-battery-id]").forEach(btn => btn.addEventListener("click", () => handler(btn.dataset.batteryId))); }
function renderBatteryList(items) { return `<div class="battery-list">${items.map(({battery,status}) => `<button class="battery-item" type="button" data-battery-id="${battery.id}"><span><span class="battery-name">${escapeHtml(battery.name)}</span><br><span class="battery-meta ${statusClass(status.status)}">${formatBatteryMeta(status)}</span></span><span>${battery.archived ? `<span class="badge badge-gray">📦 Archivée</span>` : formatStatus(status.status)}</span></button>`).join("")}</div>`; }
function renderQuickBatteryList(items) { if (items.length === 0) return `<p class="empty-state">Aucune batterie trouvée.</p>`; return renderBatteryList(items); }
function formatBatteryMeta(status) { if (!status.lastMeasurementDate) return "≈ ?"; const estimated = status.estimatedLevelIsAvailable ? `≈ ${status.estimatedLevelPercent} %` : "≈ ?"; return `${estimated} • ${formatRelativeDate(status.lastMeasurementDate)}`; }
function renderMeasurementHistory(measurementsWithRates) { const visible = measurementsWithRates.slice(-5).reverse(); return `${visible.map(m => `<div class="history-item" data-measurement-id="${m.id}"><span>${m.date}</span><strong>${m.levelPercent} %</strong><span class="history-rate">${m.rateLabel}</span></div>`).join("")}${measurementsWithRates.length > 5 ? `<p class="helper-text">5 dernières mesures affichées.</p>` : ""}`; }
function renderLedPreviewHtml(ledCount, behavior, sliderPosition) { const state = behavior === LED_BEHAVIORS.ADVANCED ? buildLedAdvancedState(ledCount, sliderPosition) : buildLedSimpleState(ledCount, sliderPosition); const leds = []; for (let i=0;i<state.solid;i++) leds.push(`<span class="led led-on"></span>`); for (let i=0;i<state.blinking;i++) leds.push(`<span class="led led-blink"></span>`); for (let i=0;i<state.off;i++) leds.push(`<span class="led led-off"></span>`); return leds.join(""); }
function inputTypeFromBattery(battery) { if (!battery) return BATTERY_INPUT_TYPES.PERCENTAGE; if (battery.inputType) return battery.inputType; if (battery.ledConfig?.behavior === LED_BEHAVIORS.ADVANCED) return BATTERY_INPUT_TYPES.LED_ADVANCED; if (battery.ledConfig) return BATTERY_INPUT_TYPES.LED_SIMPLE; return BATTERY_INPUT_TYPES.PERCENTAGE; }
function formatStatus(status) { switch(status) { case STATUS.RED: return `<span class="badge badge-red"><img class="status-icon" src="assets/icons/status/critical.svg" alt=""> À recharger</span>`; case STATUS.ORANGE: return `<span class="badge badge-orange"><img class="status-icon" src="assets/icons/status/warning.svg" alt=""> À surveiller</span>`; case STATUS.GREEN: return `<span class="badge badge-green"><img class="status-icon" src="assets/icons/status/ok.svg" alt=""> OK</span>`; default: return `<span class="badge badge-gray"><img class="status-icon" src="assets/icons/status/unknown.svg" alt=""> Non initialisée</span>`; } }
function statusClass(status) { switch(status) { case STATUS.RED: return "value-red"; case STATUS.ORANGE: return "value-orange"; case STATUS.GREEN: return "value-green"; default: return "value-gray"; } }
function openModal(content) { modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal">${content}</div></div>`; }
function escapeHtml(value) { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
