import { RoomScene } from './components/RoomScene.js';
import { FurnitureCatalog } from './components/FurnitureCatalog.js';
import { TaskPicker } from './components/TaskPicker.js';
import { TaskModal } from './components/TaskModal.js';
import { PhotoCapture } from './components/PhotoCapture.js';
import { MemoryWall } from './components/MemoryWall.js';
import { DiaryWall } from './components/DiaryWall.js';
import { MoodModal } from './components/MoodModal.js';
import { OnboardingHint } from './components/OnboardingHint.js';
import { AdminPanel } from './components/AdminPanel.js';
import { pickDailyTasks, todayKey } from './modules/tasks.js';
import { ensureDefaultFurniture } from './modules/contentPack.js';
import { runMigrations } from './modules/migrations.js';
import {
  getAllFurniture,
  getAllPlacements,
  addPlacement,
  updatePlacement,
  deletePlacement,
  stashToWarehouse,
  getWarehouse,
  takeFromWarehouse,
  saveTask,
  putPhoto,
  addPolaroid,
  getAllPolaroids,
  getRecentTasks,
  logInteraction,
  getRecentInteractions,
  saveMood,
  getAllMoods,
  setMeta,
  getMeta,
} from './modules/db.js';
import { createFileInput, triggerCapture } from './modules/camera.js';
import { playTap, celebrate, unlockAudio, buzz } from './modules/feedback.js';
import {
  rotatedGridSize,
  isAreaFree,
  migrateToGrid,
  randomGridPositionAuto,
  findFreeCellAuto,
  cornerCellToXY,
  resolvePlane,
} from './modules/scene.js';
import { rollClickInteraction, rollIdleEvent, isCoolingDown } from './modules/interactions.js';

/**
 * App Controller — Warm Home v0.2
 * ─────────────────────────────
 * 1) 格線擺放（地板 8×4 / 牆面 8×2，吸附+防重疊+旋轉）
 * 2) 每日 3 任務 + 心情紀錄 → 拍立得 → IG 式日記
 * 3) 隨機互動：點擊語錄 + 閒置事件泡泡
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
    bubbles: {},
    activeEvent: null,
    lastEventAt: 0,
    lastIdleAt: Date.now(),
    fileInput: null,
    photoBlob: null,
    photoUrl: null,
    activeTask: null,
    pendingMoodTask: null,
    showOnboarding: false,
    layers: {},
  };

  await ensureInstallDate();
  await ensureDefaultFurniture();
  await reloadAll(ctx);
  // 版本遷移（v3 起：角落座標重算；未來 v4+ 照 migrations.js 加）
  try {
    const r = await runMigrations(ctx);
    if (r.migrated.length) {
      await reloadAll(ctx);
    }
  } catch (e) {
    console.warn('[Warm Home] 遷移略過', e);
  }
  await migrateLegacyPlacements(ctx);

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
  startIdleEvents(ctx);

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
  try {
    ctx.warehouse = await getWarehouse();
  } catch (_) {
    ctx.warehouse = [];
  }

  ctx.todayTasks = pickDailyTasks(ctx.placements, ctx.furnitureCatalog);

  const { getTasksByDate } = await import('./modules/db.js');
  const todayDone = await getTasksByDate(todayKey());
  ctx.completedTemplateIds = new Set(todayDone.filter((t) => t.completed).map((t) => t.templateId));
}

/** 舊 x/y 遷移到格子（只做一次；v4 之後主要由 migrations 處理） */
async function migrateLegacyPlacements(ctx) {
  let changed = false;
  for (const p of ctx.placements) {
    if (p.gx == null || p.gy == null || p.plane == null) {
      const next = migrateToGrid(p, ctx.furnitureMap);
      const f = ctx.furnitureMap[p.furnitureId];
      if (f) {
        const plane = resolvePlane(next, f);
        const size = rotatedGridSize(f, next.rotation || 0);
        if (!isAreaFree(ctx.placements, ctx.furnitureMap, p.id, plane, next.gx, next.gy, size.w, size.h)) {
          const free = randomGridPositionAuto(ctx.placements, ctx.furnitureMap, f);
          if (free) {
            next.plane = free.plane;
            next.gx = free.gx;
            next.gy = free.gy;
          }
        }
        const pt = cornerCellToXY(next.plane || plane, next.gx, next.gy, size.w, size.h);
        await updatePlacement(p.id, { plane: next.plane || plane, gx: next.gx, gy: next.gy, x: pt.x, y: pt.y, rotation: next.rotation || 0 });
        changed = true;
      }
    }
  }
  if (changed) ctx.placements = await getAllPlacements();
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
      <button class="toolbar__btn" data-act="diary">📖 日記</button>
      <button class="toolbar__btn" data-act="wall">📸 回憶</button>
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
  ctx.layers.toolbar.querySelector('[data-act="diary"]').addEventListener('click', () => openDiary(ctx));
  ctx.layers.toolbar.querySelector('[data-act="wall"]').addEventListener('click', () => openMemoryWall(ctx));
  ctx.layers.toolbar.querySelector('[data-act="delete"]').addEventListener('click', () => deleteSelected(ctx));
}

function renderScene(ctx) {
  ctx.layers.sceneHost.innerHTML = '';
  ctx.layers.sceneHost.appendChild(
    RoomScene({
      furnitureCatalog: ctx.furnitureCatalog,
      furnitureMap: ctx.furnitureMap,
      placements: ctx.placements,
      selectedPlacementId: ctx.selectedPlacementId,
      draggingPlacementId: ctx.draggingPlacementId,
      bubbles: ctx.bubbles,
      activeEventPlacementId: ctx.activeEvent ? ctx.activeEvent.placementId : null,
      dropHint: ctx.dropHint || null,
      onSelect: (id) => handleSelect(ctx, id),
      onMove: (id, patch) => handleMove(ctx, id, patch),
      onRotate: (id) => handleRotate(ctx, id),
      onDelete: (id) => handleDeleteOne(ctx, id),
      onDragHint: (hint) => handleDragHint(ctx, hint),
      onEventTap: (id) => handleEventTap(ctx, id),
    })
  );
  if (ctx.activeTask) {
    renderPhotoPanel(ctx);
  }
}

function renderTaskBar(ctx) {
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

/* ============ 格線操作 ============ */

async function handleSelect(ctx, id) {
  unlockAudio();
  ctx.selectedPlacementId = id;
  ctx.lastIdleAt = Date.now();
  if (id == null) {
    renderScene(ctx);
    return;
  }
  playTap();

  // 點擊隨機互動：泡泡 3 秒
  const p = ctx.placements.find((x) => x.id === id);
  const f = p ? ctx.furnitureMap[p.furnitureId] : null;
  if (f) {
    const result = rollClickInteraction(f);
    if (result.text) {
      ctx.bubbles[id] = { icon: '💬', text: result.text };
      renderScene(ctx);
      logInteraction({ placementId: id, furnitureId: f.id, kind: result.kind, text: result.text }).catch(() => {});
      setTimeout(() => {
        if (ctx.bubbles[id] && ctx.bubbles[id].text === result.text) {
          delete ctx.bubbles[id];
          renderScene(ctx);
        }
      }, 3200);
      buzz([20]);
      return;
    }
  }
  renderScene(ctx);
}

async function handleMove(ctx, id, patch) {
  const p = ctx.placements.find((x) => x.id === id);
  const f = p ? ctx.furnitureMap[p.furnitureId] : null;
  if (!p || !f) return;
  const plane = resolvePlane(p, f);
  const size = rotatedGridSize(f, p.rotation || 0);
  // 以角落座標重算中心，避免舊像素殘留
  const center = cornerCellToXY(plane, patch.gx, patch.gy, size.w, size.h);
  if (!isAreaFree(ctx.placements, ctx.furnitureMap, id, plane, center.gx, center.gy, size.w, size.h)) {
    flashHint('這格被佔走了，換個位置試試');
    ctx.dropHint = null;
    renderScene(ctx);
    return;
  }
  ctx.draggingPlacementId = id;
  await updatePlacement(id, { plane, gx: center.gx, gy: center.gy, x: center.x, y: center.y });
  ctx.placements = await getAllPlacements();
  ctx.draggingPlacementId = null;
  ctx.dropHint = null;
  ctx.selectedPlacementId = id;
  ctx.lastIdleAt = Date.now();
  playTap();
  renderScene(ctx);
}

/** 拖移中即時高亮（不整棵重渲染，避免中斷拖曳） */
function handleDragHint(ctx, hint) {
  if (!hint) {
    ctx.dropHint = null;
    const g = ctx.layers.sceneHost && ctx.layers.sceneHost.querySelector('.corner-drop');
    if (g) g.innerHTML = '';
    clearCellHot();
    return;
  }
  const sel = ctx.placements.find((p) => p.id === ctx.selectedPlacementId);
  // 用被拖家具的實際佔位檢查（優先用選取中的那件）
  let ok = true;
  if (sel) {
    const f = ctx.furnitureMap[sel.furnitureId];
    const size = rotatedGridSize(f, sel.rotation || 0);
    const plane = resolvePlane(sel, f);
    ok = isAreaFree(ctx.placements, ctx.furnitureMap, sel.id, plane, hint.gx, hint.gy, size.w, size.h);
    ctx.dropHint = { plane, gx: hint.gx, gy: hint.gy, gw: size.w, gh: size.h, ok };
  } else {
    ctx.dropHint = { ...hint, ok: true };
  }
  paintDropHint(ctx);
}

function clearCellHot() {
  document.querySelectorAll('.cell.is-hot-ok,.cell.is-hot-bad').forEach((c) => {
    c.classList.remove('is-hot-ok', 'is-hot-bad');
  });
}

function paintDropHint(ctx) {
  const h = ctx.dropHint;
  const svgG = ctx.layers.sceneHost && ctx.layers.sceneHost.querySelector('.corner-drop');
  if (!svgG) return;
  if (!h) {
    svgG.innerHTML = '';
    return;
  }
  const pts = [];
  for (let dx = 0; dx < (h.gw || 1); dx++) {
    for (let dy = 0; dy < (h.gh || 1); dy++) {
      pts.push(cornerCellToXY(h.plane, h.gx + dx, h.gy + dy, 1, 1));
    }
  }
  const cx = Math.round(pts.reduce((s, p) => s + p.x, 0) / pts.length);
  const cy = Math.round(pts.reduce((s, p) => s + p.y, 0) / pts.length);
  svgG.innerHTML = `<g class="${h.ok ? 'drop-ok' : 'drop-bad'}"><ellipse cx="${cx}" cy="${cy}" rx="52" ry="22"/><text x="${cx}" y="${cy + 5}">${h.ok ? '放這裡' : '被佔走了'}</text></g>`;
  // 對應格框高亮
  clearCellHot();
  for (let dx = 0; dx < (h.gw || 1); dx++) {
    for (let dy = 0; dy < (h.gh || 1); dy++) {
      const cell = ctx.layers.sceneHost.querySelector(`[data-cell="${h.plane}:${h.gx + dx},${h.gy + dy}"]`);
      if (cell) cell.classList.add(h.ok ? 'is-hot-ok' : 'is-hot-bad');
    }
  }
}

async function handleDeleteOne(ctx, id) {
  await stashPlacement(ctx, id);
}

async function handleRotate(ctx, id) {
  const p = ctx.placements.find((x) => x.id === id);
  const f = p ? ctx.furnitureMap[p.furnitureId] : null;
  if (!p || !f) return;
  const nextRot = ((p.rotation || 0) + 90) % 360;
  const size = rotatedGridSize(f, nextRot);
  const plane = resolvePlane(p, f);
  const gx = p.gx ?? 0;
  const gy = p.gy ?? 0;
  if (!isAreaFree(ctx.placements, ctx.furnitureMap, id, plane, gx, gy, size.w, size.h)) {
    flashHint('轉不過去，旁邊太擠了');
    return;
  }
  const pt = cornerCellToXY(plane, gx, gy, size.w, size.h);
  await updatePlacement(id, { rotation: nextRot, x: pt.x, y: pt.y });
  ctx.placements = await getAllPlacements();
  ctx.lastIdleAt = Date.now();
  playTap();
  buzz([20]);
  renderScene(ctx);
}

/* ============ 隨機事件 ============ */

function startIdleEvents(ctx) {
  // 每 20 秒檢查一次，閒置 60 秒以上才跳事件，全域冷卻 90 秒
  setInterval(() => {
    if (document.hidden) return;
    if (ctx.activeEvent) return;
    if (ctx.layers.modalHost && ctx.layers.modalHost.innerHTML) return;
    if (Date.now() - ctx.lastIdleAt < 60 * 1000) return;
    if (isCoolingDown(ctx.lastEventAt, 90 * 1000)) return;
    if (!ctx.placements.length) return;
    const evt = rollIdleEvent(ctx.placements, ctx.furnitureMap);
    if (!evt) return;
    ctx.activeEvent = evt;
    ctx.lastEventAt = Date.now();
    ctx.bubbles[evt.placementId] = { icon: evt.icon, text: evt.text };
    renderScene(ctx);
    buzz([60, 60, 60]);
  }, 20 * 1000);
}

async function handleEventTap(ctx, placementId) {
  const evt = ctx.activeEvent;
  unlockAudio();
  if (evt && evt.placementId === placementId) {
    const p = ctx.placements.find((x) => x.id === placementId);
    if (p) {
      await updatePlacement(p.id, { water: (p.water || 0) + (evt.water || 1) });
      ctx.placements = await getAllPlacements();
    }
    await logInteraction({
      placementId, furnitureId: evt.furnitureId, kind: 'event',
      text: `${evt.icon} ${evt.text}`,
    }).catch(() => {});
    ctx.activeEvent = null;
    delete ctx.bubbles[placementId];
    ctx.lastIdleAt = Date.now();
    celebrate();
    renderScene(ctx);
    flashSuccess({ title: evt.text });
    return;
  }
  // 非事件泡泡：當一般選取
  handleSelect(ctx, placementId);
}

/* ============ Task Picker ============ */

function openTaskPicker(ctx) {
  unlockAudio();
  playTap();
  buzz([20]);
  ctx.lastIdleAt = Date.now();

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

async function finishTask(ctx, moodFromModal) {
  const task = ctx.activeTask;
  if (!task) return;

  if (task.needsPhoto && !ctx.photoBlob) {
    alert('請先拍一張照片再完成任務');
    return;
  }

  // 先選心情（只問一次）
  if (!moodFromModal && !ctx.pendingMoodTask) {
    ctx.pendingMoodTask = task;
    ctx.layers.modalHost.innerHTML = '';
    ctx.layers.modalHost.appendChild(
      MoodModal({
        onPick: (mood) => {
          ctx.layers.modalHost.innerHTML = '';
          ctx.pendingMoodTask = null;
          finishTask(ctx, mood);
        },
        onSkip: () => {
          ctx.layers.modalHost.innerHTML = '';
          ctx.pendingMoodTask = null;
          finishTask(ctx, null);
        },
      })
    );
    return;
  }
  const mood = moodFromModal || null;

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
    mood: mood || undefined,
    completedAt: Date.now(),
  });

  if (mood) {
    await saveMood({ date: todayKey(), mood, taskId: task.id, note: task.title }).catch(() => {});
  }

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
  ctx.lastIdleAt = Date.now();

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
  ctx.lastIdleAt = Date.now();

  ctx.layers.modalHost.innerHTML = '';
  ctx.layers.modalHost.appendChild(
    FurnitureCatalog({
      furnitureCatalog: ctx.furnitureCatalog,
      furnitureMap: ctx.furnitureMap,
      warehouse: ctx.warehouse || [],
      onPick: async (furnitureId) => {
        const f = ctx.furnitureMap[furnitureId];
        if (!f) return;
        // 自動找空格（牆飾自動挑比較空的那面牆）
        const spot = findFreeCellAuto(ctx.placements, ctx.furnitureMap, f);
        if (!spot) {
          flashHint(f.placement === 'wall' ? '牆面滿了，先收回一件到倉庫吧' : '地板滿了，先收回一件到倉庫吧');
          return;
        }
        const size = rotatedGridSize(f, 0);
        const pt = cornerCellToXY(spot.plane, spot.gx, spot.gy, size.w, size.h);
        await addPlacement({
          furnitureId,
          plane: spot.plane,
          gx: pt.gx,
          gy: pt.gy,
          x: pt.x,
          y: pt.y,
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
      onTakeOut: (wid) => placeFromWarehouse(ctx, wid),
      onClose: () => { ctx.layers.modalHost.innerHTML = ''; },
    })
  );
}

/** 倉庫取出 → 放回房間空格（保留原本的 water/rotation） */
async function placeFromWarehouse(ctx, warehouseId) {
  const rec = await takeFromWarehouse(warehouseId);
  if (!rec) {
    flashHint('這件已經取出過了');
    await reloadAll(ctx);
    return;
  }
  const f = ctx.furnitureMap[rec.furnitureId];
  if (!f) {
    flashHint('型錄找不到這件家具');
    await reloadAll(ctx);
    return;
  }
  const size = rotatedGridSize(f, rec.rotation || 0);
  const spot = findFreeCellAuto(ctx.placements, ctx.furnitureMap, { ...f, gridSize: size });
  if (!spot) {
    // 放不回去：退回倉庫
    await stashToWarehouse({ furnitureId: rec.furnitureId, rotation: rec.rotation, water: rec.water });
    flashHint(f.placement === 'wall' ? '牆面滿了，先收回一件吧' : '地板滿了，先收回一件吧');
    await reloadAll(ctx);
    return;
  }
  const pt = cornerCellToXY(spot.plane, spot.gx, spot.gy, size.w, size.h);
  await addPlacement({
    furnitureId: rec.furnitureId,
    plane: spot.plane,
    gx: pt.gx,
    gy: pt.gy,
    x: pt.x,
    y: pt.y,
    rotation: rec.rotation || 0,
    water: rec.water || 0,
    createdAt: Date.now(),
  });
  await reloadAll(ctx);
  ctx.layers.modalHost.innerHTML = '';
  renderScene(ctx);
  renderTaskBar(ctx);
  celebrate();
  flashHint(`已取出「${f.label}」`);
}

/* ============ Memory Wall（舊） ============ */

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

/* ============ Diary（IG 式日記） ============ */

async function openDiary(ctx) {
  unlockAudio();
  playTap();
  ctx.lastIdleAt = Date.now();

  const polaroids = await getAllPolaroids();
  const polaroidsWithUrls = polaroids.map((p) => ({
    ...p,
    photoUrl: p.photoBlob ? URL.createObjectURL(p.photoBlob) : '',
  }));
  const tasks = await getRecentTasks(30);
  const moods = await getAllMoods(50);
  const interactions = await getRecentInteractions(50);
  const stats = computeStats(ctx, tasks);

  ctx.layers.modalHost.innerHTML = '';
  const wall = DiaryWall({
    polaroids: polaroidsWithUrls,
    tasks,
    moods,
    interactions,
    stats,
    onClose: () => {
      polaroidsWithUrls.forEach((p) => { try { URL.revokeObjectURL(p.photoUrl); } catch (_) {} });
      ctx.layers.modalHost.innerHTML = '';
    },
    onShareText: () => shareSummary(ctx, stats, tasks),
  });
  ctx.layers.modalHost.appendChild(wall);
}

function computeStats(ctx, tasks) {
  const totalTasks = tasks.length;
  const furnitureCount = ctx.placements.length;
  const interactionCount = 0; // 日記開啟時才查，這裡先顯示任務數為主
  // 連續天數：用任務日期倒推
  const dates = [...new Set(tasks.map((t) => {
    const d = new Date(t.completedAt || Date.now());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }))].sort().reverse();
  let streakDays = 0;
  if (dates.length) {
    const today = todayKey();
    let cursor = new Date();
    // 若今天還沒任務，從昨天開始算也算連續
    if (dates[0] !== today) cursor.setDate(cursor.getDate() - 1);
    for (const dk of dates) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (dk === key) {
        streakDays++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    if (!streakDays && dates.length) streakDays = 1;
  }
  return { totalTasks, furnitureCount, interactionCount, streakDays };
}

async function shareSummary(ctx, stats, tasks) {
  const recent = tasks.slice(0, 3).map((t) => `・${t.templateId || '完成一個任務'}`).join('\n');
  const text = `📖 我的暖窩日記\n連續 ${stats.streakDays} 天 · 共 ${stats.totalTasks} 個任務 · ${ctx.placements.length} 件家具\n最近：\n${recent || '・今天也要加油！'}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: '我的暖窩日記', text });
      return;
    }
    await navigator.clipboard.writeText(text);
    flashHint('已複製分享文字，可貼給家人看');
  } catch (_) {
    alert(text);
  }
}

/* ============ Delete → 收進倉庫（不斷捨） ============ */

async function stashPlacement(ctx, id) {
  const p = ctx.placements.find((x) => x.id === id);
  if (!p) return;
  await stashToWarehouse({
    furnitureId: p.furnitureId,
    rotation: p.rotation || 0,
    water: p.water || 0,
  });
  await deletePlacement(id);
  if (ctx.selectedPlacementId === id) ctx.selectedPlacementId = null;
  delete ctx.bubbles[id];
  if (ctx.activeEvent && ctx.activeEvent.placementId === id) ctx.activeEvent = null;
  await reloadAll(ctx);
  renderScene(ctx);
  renderTaskBar(ctx);
  const f = ctx.furnitureMap[p.furnitureId];
  flashHint(`「${f ? f.label : '家具'}」已收進倉庫，可從＋加家具取出`);
}

async function deleteSelected(ctx) {
  if (!ctx.selectedPlacementId) {
    flashHint('先點一件家具，再按 🗑️');
    return;
  }
  await stashPlacement(ctx, ctx.selectedPlacementId);
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
    await setMeta('phase', '0.5.0');
  }
}
