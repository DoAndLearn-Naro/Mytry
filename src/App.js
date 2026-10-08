import { GardenScene } from './components/GardenScene.js';
import { TaskModal } from './components/TaskModal.js';
import { PhotoCapture } from './components/PhotoCapture.js';
import { DecorationDrawer } from './components/DecorationDrawer.js';
import { AdminPanel } from './components/AdminPanel.js';
import { pickDailyTask, todayKey } from './modules/tasks.js';
import { DEFAULT_LAYOUT, getSlotConfig } from './modules/layout.js';
import { ensureDefaultPack } from './modules/contentPack.js';
import {
  getAllPlacements,
  getAllDecorations,
  setPlacement,
  clearPlacement,
  addPlacementWater,
  saveTaskRecord,
  putPhoto,
  getTasksByDate,
  setMeta,
  getMeta,
} from './modules/db.js';
import { createFileInput, triggerCapture } from './modules/camera.js';
import { playTap, celebrate, unlockAudio, buzz } from './modules/feedback.js';

/**
 * App Controller — Life Garden (Phase 2)
 * ──────────────────────────────────────
 * 單機單人。資料 100% 在 IndexedDB；內容包由管理員入口更新。
 */
export async function mountApp(container) {
  const ctx = {
    container,
    task: null,
    completedSlotId: null,
    placements: {},
    decorationMap: {},
    allDecorations: [],
    totalCompleted: 0,
    photoBlob: null,
    photoUrl: null,
    fileInput: null,
    layerEls: { garden: null, modal: null, photo: null, drawer: null, admin: null },
  };

  await ensureInstallDate();
  await ensureDefaultPack();
  await reloadAll(ctx);

  ctx.task = pickDailyTask();

  ctx.fileInput = createFileInput({
    onPick: (blob) => {
      ctx.photoBlob = blob;
      if (ctx.photoUrl) URL.revokeObjectURL(ctx.photoUrl);
      ctx.photoUrl = URL.createObjectURL(blob);
      renderPhotoPanel(ctx);
    },
  });

  renderShell(ctx);
  renderScene(ctx);
  renderPhotoPanel(ctx);
  attachSecretAdminTrigger(ctx);
}

/* ============ Reload state ============ */

async function reloadAll(ctx) {
  ctx.placements = {};
  const allP = await getAllPlacements();
  for (const p of allP) ctx.placements[p.id] = p;

  ctx.allDecorations = await getAllDecorations();
  ctx.decorationMap = {};
  for (const d of ctx.allDecorations) ctx.decorationMap[d.id] = d;

  const completed = await getTasksByDate(todayKey());
  ctx.completedSlotId = null;
  if (completed.length > 0) {
    const slot = DEFAULT_LAYOUT.slots.find((s) =>
      completed.some((t) => t.templateId === s.boundTask)
    );
    ctx.completedSlotId = slot ? slot.id : null;
  }
  ctx.totalCompleted = completed.length;
}

/* ============ Render ============ */

function renderShell(ctx) {
  container.innerHTML = `
    <header class="app-header">
      <h1 class="app-header__title" id="app-title" role="button" aria-label="每日小花園標題">每日小花園</h1>
      <p class="app-header__sub" id="date-line"></p>
    </header>
    <main id="garden-host" class="garden-host"></main>
    <div id="modal-host" class="modal-host"></div>
    <div id="photo-host" class="photo-host"></div>
  `;
  document.getElementById('date-line').textContent = todayKey();
  ctx.layerEls.garden = document.getElementById('garden-host');
  ctx.layerEls.modal  = document.getElementById('modal-host');
  ctx.layerEls.photo  = document.getElementById('photo-host');
}

function renderScene(ctx) {
  ctx.layerEls.garden.innerHTML = '';
  ctx.layerEls.garden.appendChild(
    GardenScene({
      placements: ctx.placements,
      decorationMap: ctx.decorationMap,
      completedSlotId: ctx.completedSlotId,
      onSlotTap: (slotId) => onSlotTap(ctx, slotId),
      onLightbulbClick: () => openTaskModal(ctx),
    })
  );
}

function renderPhotoPanel(ctx) {
  ctx.layerEls.photo.innerHTML = '';
  const needsPhoto = ctx.task?.needsPhoto;
  if (!needsPhoto) return;
  ctx.layerEls.photo.appendChild(
    PhotoCapture({
      previewUrl: ctx.photoUrl,
      onRetake: () => triggerCapture(ctx.fileInput),
      onConfirm: () => finishTask(ctx, true),
    })
  );
}

/* ============ Task Modal ============ */

function openTaskModal(ctx) {
  unlockAudio();
  playTap();
  buzz([40]);

  ctx.layerEls.modal.innerHTML = '';
  const modal = TaskModal({
    task: ctx.task,
    completed: ctx.completedSlotId
      ? getSlotConfig(ctx.completedSlotId)?.boundTask
      : null,
    onClose: () => {
      ctx.layerEls.modal.innerHTML = '';
    },
    onTakePhoto: () => {
      ctx.layerEls.modal.innerHTML = '';
      triggerCapture(ctx.fileInput);
    },
    onComplete: () => {
      ctx.layerEls.modal.innerHTML = '';
      finishTask(ctx, false);
    },
  });
  ctx.layerEls.modal.appendChild(modal);
}

/* ============ Finish Task ============ */

async function finishTask(ctx, withPhoto) {
  const task = ctx.task;
  if (!task) return;

  if (withPhoto && !ctx.photoBlob) {
    alert('請先拍一張照片再完成任務');
    return;
  }

  if (withPhoto && ctx.photoBlob) {
    await putPhoto({
      taskId: task.id,
      templateId: task.id,
      slotId: task.slotId,
      date: todayKey(),
      blob: ctx.photoBlob,
      createdAt: Date.now(),
    });
  }

  await saveTaskRecord({
    templateId: task.id,
    slotId: task.slotId,
    date: todayKey(),
    completed: true,
    withPhoto: !!withPhoto,
    completedAt: Date.now(),
  });

  if (task.slotId) {
    await addPlacementWater(task.slotId, task.water || 1);
  }

  ctx.photoBlob = null;
  if (ctx.photoUrl) URL.revokeObjectURL(ctx.photoUrl);
  ctx.photoUrl = null;

  await reloadAll(ctx);
  celebrate();
  ctx.layerEls.modal.innerHTML = '';
  ctx.layerEls.photo.innerHTML = '';
  renderScene(ctx);
  flashSuccessBanner(ctx, task);
}

function flashSuccessBanner(ctx, task) {
  let host = ctx.container.querySelector('.banner-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'banner-host';
    ctx.container.appendChild(host);
  }
  const banner = document.createElement('div');
  banner.className = 'banner banner--success';
  banner.innerHTML = `🎉 任務完成！${task.rewardHint || '植物喝到了一點水'}`;
  host.innerHTML = '';
  host.appendChild(banner);
  setTimeout(() => banner.classList.add('banner--show'), 30);
  setTimeout(() => banner.classList.remove('banner--show'), 2400);
  setTimeout(() => banner.remove(), 2800);
}

/* ============ Slot Tap → Drawer ============ */

function onSlotTap(ctx, slotId) {
  unlockAudio();
  playTap();
  buzz([20]);

  const cfg = getSlotConfig(slotId);
  if (!cfg) return;
  const placement = ctx.placements[slotId];

  const wrapper = document.createElement('div');
  ctx.layerEls.drawer = wrapper;
  const drawer = DecorationDrawer({
    slotId,
    decorations: ctx.allDecorations,
    unlockedIds: new Set(
      ctx.allDecorations
        .filter((d) => (d.unlockAfter || 0) <= ctx.totalCompleted)
        .map((d) => d.id)
    ),
    currentDecorationId: placement?.decorationId,
    totalCompleted: ctx.totalCompleted,
    onClose: () => {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      ctx.layerEls.drawer = null;
    },
    onClear: async () => {
      await clearPlacement(slotId);
      await reloadAll(ctx);
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      ctx.layerEls.drawer = null;
      renderScene(ctx);
      playTap();
    },
    onPick: async (decorationId) => {
      await setPlacement(slotId, decorationId);
      await reloadAll(ctx);
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      ctx.layerEls.drawer = null;
      renderScene(ctx);
      celebrate();
    },
  });
  wrapper.appendChild(drawer);
  ctx.container.appendChild(wrapper);
}

/* ============ Secret Admin Trigger ============ */

function attachSecretAdminTrigger(ctx) {
  const title = document.getElementById('app-title');
  if (!title) return;
  let count = 0;
  let timer = null;
  title.addEventListener('click', () => {
    count += 1;
    clearTimeout(timer);
    timer = setTimeout(() => (count = 0), 1500);
    if (count >= 5) {
      count = 0;
      openAdmin(ctx);
    } else if (count >= 2) {
      title.classList.add('is-secret-hint');
      setTimeout(() => title.classList.remove('is-secret-hint'), 400);
    }
  });
}

async function openAdmin(ctx) {
  unlockAudio();
  const { getContentPack } = await import('./modules/db.js');
  const pack = await getContentPack();
  const wrapper = document.createElement('div');
  ctx.layerEls.admin = wrapper;
  const panel = AdminPanel({
    currentPackVersion: pack?.version,
    decorationCount: ctx.allDecorations.length,
    onClose: () => {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      ctx.layerEls.admin = null;
    },
    onUpdated: async () => {
      await reloadAll(ctx);
      renderScene(ctx);
    },
  });
  wrapper.appendChild(panel);
  ctx.container.appendChild(wrapper);
}

/* ============ First run ============ */

async function ensureInstallDate() {
  const exists = await getMeta('installDate');
  if (!exists) {
    await setMeta('installDate', new Date().toISOString());
    await setMeta('phase', '2.0.0');
  }
}