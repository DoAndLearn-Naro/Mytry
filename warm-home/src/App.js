import { RoomScene } from './components/RoomScene.js';
import { FurnitureCatalog } from './components/FurnitureCatalog.js';
import { TaskPicker } from './components/TaskPicker.js';
import { TaskModal } from './components/TaskModal.js';
import { PhotoCapture } from './components/PhotoCapture.js';
import { MemoryWall } from './components/MemoryWall.js';
import { OnboardingHint } from './components/OnboardingHint.js';
import { AdminPanel } from './components/AdminPanel.js';
import { pickDailyTasks, todayKey } from './modules/tasks.js';
import { ensureDefaultFurniture } from './modules/contentPack.js';
import {
  getAllFurniture,
  getAllPlacements,
  addPlacement,
  updatePlacement,
  deletePlacement,
  saveTask,
  putPhoto,
  addPolaroid,
  getAllPolaroids,
  setMeta,
  getMeta,
} from './modules/db.js';
import { createFileInput, triggerCapture } from './modules/camera.js';
import { playTap, celebrate, unlockAudio, buzz } from './modules/feedback.js';
import { randomPosition } from './modules/scene.js';

/**
 * App Controller — Warm Home
 * ────────────────────────
 * 主控制器：
 *   1) 載入家具型錄 + 已擺放的家具
 *   2) 每日 3 個任務（從已擺放的家具抽）
 *   3) 任務完成 → 家具 water++ → 拍立得 → 回憶牆
 *   4) 家具抽屜 / 拖曳移動 / 旋轉 / 收回
 */
export async function mountApp(container) {
  const ctx = {
    container,
    furnitureCatalog: [],
    furnitureMap: {},
    placements: [],
    polaroids: [],
    todayTasks: [],
    completedTemplateIds: new Set(),
    selectedPlacementId: null,
    draggingPlacementId: null,
    fileInput: null,
    photoBlob: null,
    photoUrl: null,
    activeTask: null,
    showOnboarding: false,
    layers: {},
  };

  await ensureInstallDate();
  await ensureDefaultFurniture();
  await reloadAll(ctx);

  ctx.fileInput = createFileInput({
    onPick: (blob) => {
      ctx.photoBlob = blob;
      if (ctx.photoUrl) URL.revokeObjectURL(ctx.photoUrl);
      ctx.photoUrl = URL.createObjectURL(blob);
      renderPhotoPanel(ctx);
    },
  });

  if (await isFirstRun()) ctx.showOnboarding = true;

  renderShell(ctx);
  renderScene(ctx);
  renderTaskBar(ctx);
  attachSecretAdminTrigger(ctx);

  if (ctx.showOnboarding) {
    const onboard = OnboardingHint({ onDismiss: () => dismissOnboard(ctx) });
    ctx.layers.modalHost.appendChild(onboard);
  }
}

/* ============ Reload ============ */

async function reloadAll(ctx) {
  ctx.furnitureCatalog = await getAllFurniture();
  ctx.furnitureMap = {};
  for (const f of ctx.furnitureCatalog) ctx.furnitureMap[f.id] = f;

  ctx.placements = await getAllPlacements();
  ctx.polaroids = await getAllPolaroids();

  ctx.todayTasks = pickDailyTasks(ctx.placements, ctx.furnitureCatalog);

  const { getTasksByDate } = await import('./modules/db.js');
  const todayDone = await getTasksByDate(todayKey());
  ctx.completedTemplateIds = new Set(todayDone.filter((t) => t.completed).map((t) => t.templateId));
}

async function isFirstRun() {
  const flag = await getMeta('onboarded');
  return !flag;
}
async function dismissOnboard(ctx) {
  await setMeta('onboarded', true);
  ctx.showOnboarding = false;
  if (ctx.layers.modalHost) ctx.layers.modalHost.innerHTML = '';
}

/* ============ Render ============ */

function renderShell(ctx) {
  ctx.container.innerHTML = `
    <header class="app-header">
      <h1 class="app-header__title" id="app-title" role="button">暖窩</h1>
      <p class="app-header__sub" id="date-line"></p>
    </header>
    <main class="scene-host" id="scene-host"></main>
    <div class="modal-host" id="modal-host"></div>
    <div class="photo-host" id="photo-host"></div>
    <nav class="toolbar" id="toolbar">
      <button class="toolbar__btn toolbar__btn--primary" data-act="pick">📋 今日任務</button>
      <button class="toolbar__btn" data-act="add">＋ 加家具</button>
      <button class="toolbar__btn" data-act="wall">📸 回憶牆</button>
      <button class="toolbar__btn" data-act="delete" title="收回選取的家具">🗑️</button>
    </nav>
  `;
  document.getElementById('date-line').textContent = todayKey();
  ctx.layers.sceneHost = document.getElementById('scene-host');
  ctx.layers.modalHost = document.getElementById('modal-host');
  ctx.layers.photoHost = document.getElementById('photo-host');
  ctx.layers.toolbar = document.getElementById('toolbar');

  ctx.layers.toolbar.querySelector('[data-act="pick"]').addEventListener('click', () => openTaskPicker(ctx));
  ctx.layers.toolbar.querySelector('[data-act="add"]').addEventListener('click', () => openCatalog(ctx));
  ctx.layers.toolbar.querySelector('[data-act="wall"]').addEventListener('click', () => openMemoryWall(ctx));
  ctx.layers.toolbar.querySelector('[data-act="delete"]').addEventListener('click', () => deleteSelected(ctx));
}

function renderScene(ctx) {
  ctx.layers.sceneHost.innerHTML = '';
  ctx.layers.sceneHost.appendChild(
    RoomScene({
      furnitureCatalog: ctx.furnitureCatalog,
      placements: ctx.placements,
      selectedPlacementId: ctx.selectedPlacementId,
      draggingPlacementId: ctx.draggingPlacementId,
      onSelect: (id) => { ctx.selectedPlacementId = id; renderScene(ctx); playTap(); },
      onMove: async (id, x, y) => {
        ctx.draggingPlacementId = id;
        renderScene(ctx);
        await updatePlacement(id, { x, y });
        ctx.draggingPlacementId = null;
      },
    })
  );
  if (ctx.activeTask) {
    renderPhotoPanel(ctx);
  }
}

function renderTaskBar(ctx) {
  /* 任務按鈕顯示已完成 / 總數的小提示 */
  const btn = ctx.layers.toolbar.querySelector('[data-act="pick"]');
  if (btn) {
    const done = ctx.completedTemplateIds.size;
    btn.innerHTML = `📋 今日任務 <span style="opacity:0.7;">(${done}/${ctx.todayTasks.length})</span>`;
  }
}

function renderPhotoPanel(ctx) {
  if (!ctx.activeTask || !ctx.activeTask.needsPhoto) {
    ctx.layers.photoHost.innerHTML = '';
    return;
  }
  ctx.layers.photoHost.innerHTML = '';
  ctx.layers.photoHost.appendChild(
    PhotoCapture({
      previewUrl: ctx.photoUrl,
      onRetake: () => triggerCapture(ctx.fileInput),
      onConfirm: () => finishTask(ctx),
    })
  );
}

/* ============ Task Picker ============ */

function openTaskPicker(ctx) {
  unlockAudio();
  playTap();
  buzz([20]);

  const panel = TaskPicker({
    tasks: ctx.todayTasks,
    completedTemplateIds: ctx.completedTemplateIds,
    onPick: (task) => startTask(ctx, task),
    onClose: () => { ctx.layers.modalHost.innerHTML = ''; },
  });
  ctx.layers.modalHost.innerHTML = '';
  ctx.layers.modalHost.appendChild(panel);
}

function startTask(ctx, task) {
  ctx.activeTask = task;
  ctx.photoBlob = null;
  ctx.photoUrl = null;
  ctx.layers.modalHost.innerHTML = '';

  const modal = TaskModal({
    task,
    furniture: ctx.furnitureMap[task.furnitureId],
    onClose: () => { ctx.layers.modalHost.innerHTML = ''; ctx.activeTask = null; renderPhotoPanel(ctx); },
    onTakePhoto: () => {
      ctx.layers.modalHost.innerHTML = '';
      triggerCapture(ctx.fileInput);
    },
    onComplete: () => {
      ctx.layers.modalHost.innerHTML = '';
      finishTask(ctx);
    },
  });
  ctx.layers.modalHost.appendChild(modal);
}

async function finishTask(ctx) {
  const task = ctx.activeTask;
  if (!task) return;

  if (task.needsPhoto && !ctx.photoBlob) {
    alert('請先拍一張照片再完成任務');
    return;
  }

  let photoId = null;
  if (task.needsPhoto && ctx.photoBlob) {
    const result = await putPhoto({
      placementId: task.placementId,
      taskId: task.id,
      blob: ctx.photoBlob,
      createdAt: Date.now(),
    });
    photoId = result;
    await addPolaroid({
      placementId: task.placementId,
      photoId,
      caption: task.title,
      furnitureEmoji: task.furnitureEmoji,
      photoBlob: ctx.photoBlob,
      createdAt: Date.now(),
    });
  }

  await saveTask({
    templateId: task.id,
    placementId: task.placementId,
    furnitureId: task.furnitureId,
    date: todayKey(),
    completed: true,
    withPhoto: !!task.needsPhoto,
    photoId,
    completedAt: Date.now(),
  });

  const placement = ctx.placements.find((p) => p.id === task.placementId);
  if (placement) {
    placement.water = (placement.water || 0) + (task.water || 1);
    await updatePlacement(placement.id, { water: placement.water });
  }

  celebrate();
  ctx.activeTask = null;
  ctx.photoBlob = null;
  if (ctx.photoUrl) URL.revokeObjectURL(ctx.photoUrl);
  ctx.photoUrl = null;
  ctx.layers.modalHost.innerHTML = '';
  ctx.layers.photoHost.innerHTML = '';

  await reloadAll(ctx);
  renderScene(ctx);
  renderTaskBar(ctx);
  flashSuccess(task);
}

function flashSuccess(task) {
  const banner = document.createElement('div');
  banner.className = 'banner banner--success';
  banner.innerHTML = `🎉 完成「${task.title}」！回憶拍立得已貼上`;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('banner--show'), 30);
  setTimeout(() => banner.classList.remove('banner--show'), 2400);
  setTimeout(() => banner.remove(), 2800);
}

/* ============ Catalog ============ */

function openCatalog(ctx) {
  unlockAudio();
  playTap();
  buzz([20]);

  ctx.layers.modalHost.innerHTML = '';
  ctx.layers.modalHost.appendChild(
    FurnitureCatalog({
      furnitureCatalog: ctx.furnitureCatalog,
      onPick: async (furnitureId) => {
        const f = ctx.furnitureMap[furnitureId];
        const pos = randomPosition(f.placement);
        await addPlacement({
          furnitureId,
          x: pos.x,
          y: pos.y,
          rotation: 0,
          water: 0,
          createdAt: Date.now(),
        });
        await reloadAll(ctx);
        ctx.layers.modalHost.innerHTML = '';
        renderScene(ctx);
        renderTaskBar(ctx);
        celebrate();
      },
      onClose: () => { ctx.layers.modalHost.innerHTML = ''; },
    })
  );
}

/* ============ Memory Wall ============ */

async function openMemoryWall(ctx) {
  unlockAudio();
  playTap();

  const polaroids = await getAllPolaroids();
  const polaroidsWithUrls = polaroids.map((p) => ({
    ...p,
    photoUrl: URL.createObjectURL(p.photoBlob),
  }));

  ctx.layers.modalHost.innerHTML = '';
  const wall = MemoryWall({
    polaroids: polaroidsWithUrls,
    onClose: () => {
      polaroidsWithUrls.forEach((p) => URL.revokeObjectURL(p.photoUrl));
      ctx.layers.modalHost.innerHTML = '';
    },
  });
  ctx.layers.modalHost.appendChild(wall);
}

/* ============ Delete Selected ============ */

async function deleteSelected(ctx) {
  if (!ctx.selectedPlacementId) {
    flashHint('先點一件家具，再按 🗑️');
    return;
  }
  await deletePlacement(ctx.selectedPlacementId);
  ctx.selectedPlacementId = null;
  await reloadAll(ctx);
  renderScene(ctx);
  renderTaskBar(ctx);
}

function flashHint(text) {
  const banner = document.createElement('div');
  banner.className = 'banner banner--hint';
  banner.textContent = text;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('banner--show'), 30);
  setTimeout(() => banner.classList.remove('banner--show'), 1800);
  setTimeout(() => banner.remove(), 2200);
}

/* ============ Admin Trigger ============ */

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
  ctx.layers.modalHost.innerHTML = '';
  const panel = AdminPanel({
    currentPackVersion: pack?.version,
    furnitureCount: ctx.furnitureCatalog.length,
    onClose: () => { ctx.layers.modalHost.innerHTML = ''; },
    onUpdated: async () => {
      await reloadAll(ctx);
      renderScene(ctx);
      renderTaskBar(ctx);
    },
  });
  ctx.layers.modalHost.appendChild(panel);
}

/* ============ Install date ============ */

async function ensureInstallDate() {
  const exists = await getMeta('installDate');
  if (!exists) {
    await setMeta('installDate', new Date().toISOString());
    await setMeta('phase', '0.1.0');
  }
}