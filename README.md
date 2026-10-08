# 每日小花園 Life Garden（PWA · Phase 2）

> 為長者設計的認知保健 / 每日任務 App。
> 點亮燈泡 → 完成任務 → 澆水裝飾 → 花園一起長大。
> **2.5D 溫馨陽台場景**，正面透視與邊框傾斜帶出景深。

## 1. 技術棧

| 類別       | 選擇                                | 理由                          |
| ---------- | ----------------------------------- | ---------------------------- |
| Framework | Vanilla JS + ES Modules              | 最低硬體需求                 |
| 建置工具   | Vite 5                              | 快速 HMR                     |
| PWA        | vite-plugin-pwa + sw.js             | Manifest + 手寫離線快取      |
| 資料       | IndexedDB (v2 schema)               | 4 個 store + meta + content pack |
| 視覺       | CSS perspective + transform-style: preserve-3d | 2.5D 多層景深 |
| 相機       | `<input capture>`                   | Android/iOS 高相容           |
| 反饋       | `<audio>` + `navigator.vibrate`     | 多感官回饋                    |

## 2. 專案結構

```
life-garden/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── icons/{icon-192.png, icon-512.png}
│   └── sounds/{tap.wav, success.wav}
└── src/
    ├── main.js                        # 啟動 + 註冊 SW
    ├── App.js                         # 主控制器（場景路由）
    ├── components/
    │   ├── GardenScene.js             # 2.5D 場景（4 層景深 + 視差）
    │   ├── Slot.js                    # 插槽（位置 / 旋轉 / 水滴）
    │   ├── Decoration.js              # 4 種裝飾渲染（frame/plant/lamp/rug）
    │   ├── DecorationDrawer.js        # 底部抽屜選裝飾
    │   ├── AdminPanel.js              # 隱藏管理員面板
    │   ├── Lightbulb.js               # 漂浮燈泡
    │   ├── TaskModal.js               # 任務彈窗
    │   └── PhotoCapture.js            # 拍照預覽
    ├── modules/
    │   ├── db.js                      # IndexedDB（v2: 含 placements / decorations / contentPack）
    │   ├── layout.js                  # 4 槽預設佈局（溫馨陽台）
    │   ├── contentPack.js             # 內容包載入 / 合併 / 重置
    │   ├── tasks.js                   # 任務模板（每個綁定 slot）
    │   ├── plant.js                   # 各類別階段表
    │   ├── camera.js                  # 相機拍照 + 自動壓縮
    │   └── feedback.js                # 音效 + 震動
    └── styles/main.css                # 長者友善主題 + 2.5D perspective
```

### 關鍵模組位置

| 需求               | 看這支                                       |
| ------------------ | -------------------------------------------- |
| 安裝到桌面         | `public/manifest.webmanifest`、`vite.config.js` |
| 離線可開           | `public/sw.js`、`src/main.js`               |
| 每日任務怎麼選     | `src/modules/tasks.js` 的 `pickDailyTask()` |
| 4 個插槽長怎樣     | `src/modules/layout.js` 的 `DEFAULT_LAYOUT` |
| 2.5D 怎麼做出來    | `src/styles/main.css` 的 `.scene` + `.scene__layer` |
| 裝飾抽屜           | `src/components/DecorationDrawer.js`        |
| 上傳內容包         | `src/components/AdminPanel.js`               |
| 內容包 schema      | `src/modules/contentPack.js` 的 `DEFAULT_PACK` |
| 升級資料庫怎麼做   | `src/modules/db.js` 的 `onupgradeneeded`     |

## 3. 場景設計：溫馨陽台

```
        ┌──────────────────────────────────────┐
   Z=4  │                  [漂浮燈泡 💡]    │
        │                                      │
   Z=1  │              [窗台 🪴]              │
        │   [牆面 🖼️]            [立燈 🪔]  │
   Z=0  │                                      │
        │ ─── 地板 ─── [地毯 🟫] ─── 地板 ─── │
   Z=3  │                                      │
        └──────────────────────────────────────┘
```

- **Z=0 牆面**：天空漸層背景
- **Z=20px 牆體**：暖色牆
- **Z=40px 窗戶**：木質窗框，內部浮動植物盆栽
- **Z=60px 地板**：木紋重複線
- **Z=100px 漂浮層**：發光燈泡 + 任務彈窗

每個插槽自帶 `transform: translateZ(...)` 與 `rotate(var(--rot))` 微旋轉，按下時彈出 Z+24px。

## 4. 插槽 ↔ 任務 對應

| 插槽 ID          | 預設裝飾       | 綁定任務 ID    | 任務內容                |
| ---------------- | ------------- | -------------- | ----------------------- |
| `wall.frame-xl`  | 空畫框 🖼️   | `photo-sky`    | 拍天空 → 自動入框        |
| `window.sill`    | 多肉 🌵       | `photo-plant`  | 拍植物 → 植物成長       |
| `corner.lamp`    | 復古燈 🪔    | `stretch-arms` | 伸展 → 燈光變亮         |
| `floor.rug`      | 條紋地毯 🟫   | `walk-around`  | 散步 → 地毯長花         |

每日從 4 個任務中以日期 hash 抽 1 個，完成後對應插槽獲得水分。

## 5. 管理員入口（你上傳內容包用）

### 觸發
主畫面標題 `每日小花園` **連點 5 次**（1.5 秒內）。

### 功能
- 拖放或點選 `.json` 內容包 → 自動合併進現有裝飾庫
- 重置為預設內容包（保留自訂任務記錄）
- 顯示目前內容包版本與裝飾數

### 內容包 Schema

```json
{
  "version": "2026.10.8",
  "decorations": [
    {
      "id": "plant-rose",
      "label": "玫瑰花",
      "emoji": "🌹",
      "category": "plant",
      "fitsSlots": ["window.sill"],
      "unlockAfter": 3
    },
    {
      "id": "lamp-paper",
      "label": "紙燈籠",
      "emoji": "🏮",
      "category": "lamp",
      "fitsSlots": ["corner.lamp"],
      "unlockAfter": 1
    }
  ],
  "slots": [],
  "tasks": []
}
```

### 你日後更新時
1. 改 `src/.../*.js` 或上傳新內容包 JSON
2. 重新打包 `npm run build`
4. 將 `dist/` 部署到原位置（HTTPS）
5. 長者手機重啟 App 即可看到新內容

> 📦 內容包更新是「合併」非「覆蓋」，所以長者既有的 `placements` 不會被洗掉。

## 6. 開發指令

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 產出 dist/
npm run preview  # 預覽打包後
```

> ⚠️ PWA / 相機 / Service Worker 需 HTTPS 或 localhost 才能跑。

## 7. Phase Roadmap

### ✅ Phase 1（MVP）
- [x] PWA Manifest + SW
- [x] 長者友善 UI（≥20px / ≥64px 按鈕）
- [x] 每日單一任務 + 拍照 + IndexedDB 儲存
- [x] 單植物成長

### ✅ Phase 2（目前）
- [x] 2.5D 場景（多層景深 / perspective / 視差）
- [x] 4 插槽固定佈局（牆面/窗台/角落/地板）
- [x] 裝飾抽屜（底部滑出 / 解鎖門檻）
- [x] 任務 ↔ 插槽綁定（自動派生）
- [x] 內容包上傳（隱藏管理員入口）
- [x] 視差背景（deviceorientation，須授權）

### 🚫 Phase 3（已取消）
- ❌ 多長者切換（單機單人）
- ❌ 照顧者後台（改由內容包更新）

### 🔮 未來可加（你決定）
- 拍照日誌檢視頁（看自己每天拍的照片）
- 任務歷史曲線（鼓勵持續性）
- 季節性裝飾（端午、中秋、聖誕）
- 語音導讀（讓長者不用讀文字也能聽任務）
- 「換佈局」功能：客廳、書房、陽台切換

## 8. 設計規範（節錄）

| 規範         | 數值/做法                                          |
| ------------- | ------------------------------------------------- |
| 字體最小       | 20px（行動裝置 22px）                              |
| 主要按鈕       | 64 × 64px、陰影立體化                             |
| 一頁一動作     | 單一主要按鈕，輔助為「等一下」「關閉」             |
| 對比           | 主要綠 `#5C8D4A` × 暖米 `#FFF8E7`（對比 ≥ 4.5:1） |
| 反饋           | 視覺 + 音效 + 震動 三者並用                       |
| 操作等待       | 拍照後彈出確認鈕才上傳，避免一鍵完成               |
| 視差           | ≤6°，預設關閉，首次點擊場景才啟動（須授權）        |

## 9. 部署

`npm run build` 後將 `dist/` 部署到任何靜態主機即可（GitHub Pages / Netlify / Vercel / Nginx）。

⚠️ 必須 HTTPS，否則 PWA 安裝、相機、SW 都會失效。