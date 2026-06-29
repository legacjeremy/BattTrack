import { initDb, getAllBatteries, getMeasurementsByBatteryId, getSettings, saveSettings, saveBattery, deleteBattery, deleteMeasurementsByBatteryId, saveMeasurement, deleteMeasurement } from "./db.js";
import { Battery, createBattery, updateBattery, archiveBattery, restoreBattery } from "./battery.js";
import { createChargeMeasurement, createLedMeasurement, createPercentageMeasurement } from "./measurement.js";
import { calculateBatteryStatus, sortBatteryStatusItems } from "./calculation.js";
import { renderDashboard, renderArchivesPage, renderBatteryDetails, openSettingsModal, openBatteryFormModal, openAddMeasurementModal, openQuickMeasurementPicker, openBatteryActionModal, openArchivesDeletePicker, openDashboardActionModal, closeModal, setFabVisible } from "./ui.js";
import { downloadJsonBackup, readJsonBackup, replaceWithImportedData } from "./import-export.js";
import { APP_VERSION, GITHUB_RELEASES_API_URL, INPUT_MODES, VIEWS, THEMES, STATUS, DASHBOARD_FILTERS } from "./constants.js";
import { updateSettings } from "./settings.js";

let state = { batteries: [], settings: null, statuses: [], view: VIEWS.DASHBOARD, currentBatteryId: null, dashboardFilter: DASHBOARD_FILTERS.ALL };
let swRegistration = null;

async function main() {
  swRegistration = await registerServiceWorker();
  window.battTrackVersionInfo = await loadLocalVersionInfo();
  await initDb();
  await reloadState();
  applyTheme(state.settings.theme);
  renderDashboardView();
  await checkCriticalNotifications();
  document.querySelector("#floating-action-button").addEventListener("click", handleFabClick);
  document.querySelector("#settings-button").addEventListener("click", openSettingsView);
  document.querySelector("#home-button").addEventListener("click", renderDashboardView);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme(state.settings.theme));
}

async function reloadState() {
  state.settings = await getSettings();
  state.batteries = (await getAllBatteries()).map(b => new Battery(b));
  state.statuses = [];
  for (const battery of state.batteries) {
    const measurements = await getMeasurementsByBatteryId(battery.id);
    state.statuses.push({ battery, status: calculateBatteryStatus(battery, measurements, state.settings) });
  }
}

function applyTheme(theme) {
  const resolved = theme === THEMES.SYSTEM ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? THEMES.DARK : THEMES.LIGHT) : theme;
  document.documentElement.dataset.theme = resolved;
}

function getArchivedCount() { return state.batteries.filter(b => b.archived).length; }
function activeSorted(mode) { return sortBatteryStatusItems(state.statuses.filter(i => !i.battery.archived), mode); }
function archivedItems() { return state.statuses.filter(i => i.battery.archived); }

function renderDashboardView() {
  state.view = VIEWS.DASHBOARD;
  state.currentBatteryId = null;
  setFabVisible(true);
  renderDashboard(activeSorted(state.settings.dashboardSort), state.settings, getArchivedCount(), state.dashboardFilter, {
    onOpenBattery: openBatteryDetails,
    onSortChange: handleDashboardSort,
    onFilterChange: handleDashboardFilter,
    onArchives: renderArchivesView
  });
}

function renderArchivesView() {
  state.view = VIEWS.ARCHIVES;
  state.currentBatteryId = null;
  setFabVisible(archivedItems().length > 0);
  renderArchivesPage(archivedItems(), { onOpenBattery: openBatteryDetails, onBack: renderDashboardView });
}

function openSettingsView() {
  openSettingsModal(state.settings, { onSave: handleSettingsSave, onCheckUpdate: handleCheckUpdate, onExportJson: handleExportJson, onImportJson: handleImportFile });
  addClearCacheButtonToSettings();
}

function addClearCacheButtonToSettings() {
  const checkButton = document.querySelector("#check-update-button");
  if (!checkButton || document.querySelector("#clear-cache-button")) return;

  checkButton.insertAdjacentHTML("afterend", `
    <button id="clear-cache-button" class="button secondary-button" type="button">🧹 Vider le cache et recharger</button>
    <p class="helper-text">Recharge les fichiers de BattTrack sans supprimer vos batteries ni vos mesures.</p>
  `);

  document.querySelector("#clear-cache-button").onclick = handleClearAppCache;
}

async function handleClearAppCache() {
  if (!confirm("Vider le cache de l'application et recharger ?\n\nVos batteries et vos mesures seront conservées.")) return;

  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.update()));
    }
  } catch (error) {
    console.warn("Impossible de vider entièrement le cache", error);
  }

  window.location.reload();
}

async function openBatteryDetails(id) {
  const battery = state.batteries.find(b => b.id === id);
  const measurements = await getMeasurementsByBatteryId(id);
  const status = calculateBatteryStatus(battery, measurements, state.settings);
  state.view = battery.archived ? VIEWS.ARCHIVED_BATTERY_DETAILS : VIEWS.BATTERY_DETAILS;
  state.currentBatteryId = id;
  setFabVisible(true);
  renderBatteryDetails(battery, measurements, status, state.settings, { onEditMeasurement: measurementId => openEditMeasurement(battery, measurements.find(m => m.id === measurementId)) });
}

async function handleDashboardSort(sort) {
  state.settings = updateSettings(state.settings, { dashboardSort: sort });
  await saveSettings(state.settings);
  await reloadState();
  renderDashboardView();
}

function handleDashboardFilter(filter) {
  state.dashboardFilter = filter;
  renderDashboardView();
}

async function handleSettingsSave(updates) {
  const wantsNotifications = updates.notificationsEnabled && !state.settings.notificationsEnabled;
  if (wantsNotifications) {
    const allowed = await requestNotificationPermission();
    if (!allowed) {
      updates.notificationsEnabled = false;
      alert("Les notifications n'ont pas été autorisées.");
    }
  }
  state.settings = updateSettings(state.settings, updates);
  await saveSettings(state.settings);
  applyTheme(state.settings.theme);
  await reloadState();
  openSettingsView();
  await checkCriticalNotifications();
}

async function handleExportJson() {
  downloadJsonBackup();
  state.settings = updateSettings(state.settings, { lastExportAt: new Date().toISOString() });
  await saveSettings(state.settings);
  await reloadState();
  if (state.view === VIEWS.DASHBOARD) renderDashboardView();
}

async function handleCheckUpdate() {
  try {
    const response = await fetch(`${GITHUB_RELEASES_API_URL}?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Release GitHub indisponible");
    const release = await response.json();
    const latestTag = release?.tag_name;
    const installedTag = toVersionTag(APP_VERSION);
    if (!latestTag || !isVersionNewer(latestTag, installedTag)) {
      alert(`BattTrack est déjà à jour (${installedTag}).`);
      return;
    }
    if (confirm(`Mises à jour disponibles : ${latestTag}\n\nVoir les nouveautés ?`)) {
      window.open(release.html_url, "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    console.warn("Vérification de mise à jour impossible", error);
    alert("Impossible de vérifier les mises à jour pour le moment.");
  }
}

function toVersionTag(version) {
  const value = String(version ?? "0.0.0").trim();
  return value.startsWith("v") ? value : `v${value}`;
}

function versionParts(version) {
  return String(version ?? "0.0.0").replace(/^v/i, "").split(".").map(part => Number.parseInt(part, 10) || 0);
}

function isVersionNewer(remoteVersion, localVersion) {
  const remote = versionParts(remoteVersion);
  const local = versionParts(localVersion);
  const length = Math.max(remote.length, local.length);
  for (let i = 0; i < length; i++) {
    const diff = (remote[i] ?? 0) - (local[i] ?? 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return false;
}

function handleFabClick() {
  if (state.view === VIEWS.DASHBOARD) {
    return openDashboardActionModal({
      onAddMeasurement: () => openQuickMeasurementPicker(activeSorted(state.settings.dashboardSort), { onSelectBattery: b => { closeModal(); openAddMeasurementForBattery(b); } }),
      onCreateBattery: () => openBatteryFormModal({ onSave: handleCreateBattery }),
      onQuickCharge: () => openQuickMeasurementPicker(activeSorted(state.settings.dashboardSort), { onSelectBattery: b => handleAddCharge(b.id) }, "Rechargé à 100 %")
    });
  }
  if (state.view === VIEWS.BATTERY_DETAILS || state.view === VIEWS.ARCHIVED_BATTERY_DETAILS) return openBatteryActionsForCurrent();
  if (state.view === VIEWS.ARCHIVES) return openArchivesDeletePicker(archivedItems(), { onDeleteBattery: handleDeleteBatteryById });
}

function openBatteryActionsForCurrent() {
  const battery = state.batteries.find(b => b.id === state.currentBatteryId);
  openBatteryActionModal(battery, {
    onAddMeasurement: () => openAddMeasurementForBattery(battery),
    onAddCharge: () => handleAddCharge(battery.id),
    onEdit: () => openBatteryFormModal({ onSave: data => handleUpdateBattery(battery, data) }, battery),
    onArchive: () => handleArchiveBattery(battery),
    onRestore: () => handleRestoreBattery(battery),
    onDelete: () => handleDeleteBatteryById(battery.id)
  });
}

function openAddMeasurementForBattery(battery) { openAddMeasurementModal(battery, { onSave: data => handleCreateMeasurement(battery, data) }); }

function openEditMeasurement(battery, measurement) {
  openAddMeasurementModal(battery, {
    onSave: data => handleCreateMeasurement(battery, data),
    onDelete: async m => {
      if (confirm("Supprimer cette mesure ?")) {
        await deleteMeasurement(m.id);
        closeModal();
        await reloadState();
        await openBatteryDetails(battery.id);
        await checkCriticalNotifications();
      }
    }
  }, measurement);
}

async function handleCreateBattery(data) {
  const battery = createBattery(data);
  await saveBattery(battery);
  closeModal();
  await reloadState();
  renderDashboardView();
  await checkCriticalNotifications();
}

async function handleUpdateBattery(battery, data) {
  await saveBattery(updateBattery(battery, data));
  await reloadState();
  await openBatteryDetails(battery.id);
  await checkCriticalNotifications();
}

async function handleArchiveBattery(battery) {
  if (!confirm(`Archiver ${battery.name} ?`)) return;
  await saveBattery(archiveBattery(battery));
  closeModal();
  await reloadState();
  renderDashboardView();
  await checkCriticalNotifications();
}

async function handleRestoreBattery(battery) {
  await saveBattery(restoreBattery(battery));
  closeModal();
  await reloadState();
  await openBatteryDetails(battery.id);
  await checkCriticalNotifications();
}

async function handleDeleteBatteryById(id) {
  const battery = state.batteries.find(b => b.id === id);
  if (!battery || !confirm(`Supprimer définitivement ${battery.name} et toutes ses mesures ?`)) return;
  await deleteMeasurementsByBatteryId(id);
  await deleteBattery(id);
  closeModal();
  await reloadState();
  renderArchivesView();
  await checkCriticalNotifications();
}

async function handleAddCharge(id) {
  await saveMeasurement(createChargeMeasurement(id));
  closeModal();
  await reloadState();
  if (state.currentBatteryId === id) await openBatteryDetails(id); else renderDashboardView();
  await checkCriticalNotifications();
}

async function handleCreateMeasurement(battery, data) {
  const existing = data.existingMeasurement;
  const common = { batteryId: battery.id, levelPercent: data.levelPercent, measuredAt: data.measuredAt, date: data.measuredAt?.slice(0, 10), id: existing?.id, createdAt: existing?.createdAt };
  const measurement = battery.preferredInputMode === INPUT_MODES.LED && battery.ledConfig
    ? createLedMeasurement({ ...common, ledCount: battery.ledConfig.ledCount, behavior: battery.ledConfig.behavior, sliderPosition: data.sliderPosition })
    : createPercentageMeasurement(common);
  await saveMeasurement(measurement);
  await reloadState();
  await openBatteryDetails(battery.id);
  await checkCriticalNotifications();
}

async function handleImportFile(file) {
  if (!file) return;
  if (!confirm("Importer ce fichier ? Les données actuelles seront remplacées.")) return;
  const data = await readJsonBackup(file);
  await replaceWithImportedData(data);
  await reloadState();
  closeModal();
  renderDashboardView();
  await checkCriticalNotifications();
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

async function checkCriticalNotifications() {
  if (!state.settings?.notificationsEnabled || !state.settings?.notifyOnCritical) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const history = { ...(state.settings.notificationHistory ?? {}) };
  let changed = false;
  for (const item of state.statuses) {
    const battery = item.battery;
    const status = item.status;
    if (battery.archived) {
      if (history[battery.id]) { delete history[battery.id]; changed = true; }
      continue;
    }
    if (status.status === STATUS.RED) {
      if (!history[battery.id]) { showBatteryCriticalNotification(battery, status); history[battery.id] = true; changed = true; }
    } else if (history[battery.id]) {
      delete history[battery.id];
      changed = true;
    }
  }
  if (changed) {
    state.settings = updateSettings(state.settings, { notificationHistory: history });
    await saveSettings(state.settings);
  }
}

function showBatteryCriticalNotification(battery, status) {
  const level = status.estimatedLevelIsAvailable ? `estimée à ${status.estimatedLevelPercent} %` : "à recharger";
  const title = "🔋 Batterie à recharger";
  const options = { body: `${battery.name} est ${level}.`, icon: "assets/icon-192.png", badge: "assets/icon-192-maskable.png", tag: `batttrack-critical-${battery.id}`, renotify: false };
  if (swRegistration?.showNotification) swRegistration.showNotification(title, options); else new Notification(title, options);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register("./service-worker.js");
    if (registration.waiting) showUpdateAvailableBanner(registration);
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) showUpdateAvailableBanner(registration);
      });
    });
    return registration;
  } catch (error) {
    console.warn("Service worker non enregistré", error);
    return null;
  }
}

async function loadLocalVersionInfo() { return { version: APP_VERSION, title: "Version locale" }; }

main().catch(error => {
  console.error(error);
  document.querySelector("#app").innerHTML = `<section class="card"><h2>Erreur</h2><p>${error.message}</p></section>`;
});

function showUpdateAvailableBanner(registration) {
  if (document.querySelector("#update-banner")) return;
  const banner = document.createElement("div");
  banner.id = "update-banner";
  banner.style.position = "fixed";
  banner.style.left = "1rem";
  banner.style.right = "1rem";
  banner.style.bottom = "5.5rem";
  banner.style.zIndex = "50";
  banner.style.padding = "1rem";
  banner.style.borderRadius = "1rem";
  banner.style.background = "var(--card)";
  banner.style.color = "var(--text)";
  banner.style.boxShadow = "0 8px 18px var(--shadow)";
  banner.style.border = "1px solid var(--border)";
  banner.innerHTML = `<strong>Nouvelle version disponible</strong><div class="action-row"><button id="update-app-button" class="button" type="button">Mettre à jour</button></div>`;
  document.body.appendChild(banner);
  document.querySelector("#update-app-button").addEventListener("click", () => {
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
  });
}

let refreshing = false;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
