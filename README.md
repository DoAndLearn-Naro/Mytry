# 每日小花園 Life Garden

> 為長者設計的 **PWA 認知保健 App**。  
> 點亮燈泡 → 完成任務 → 澆水裝飾 → 花園一起長大。  
> 2.5D 溫馨陽台場景，可安裝到手機主畫面，離線可用。

---

## 📱 給長者與家屬

### 如何加入主畫面（給長輩）

| 手機           | 步驟                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| **iPhone**   | 用 Safari 打開網址 → 點下方「分享」↑ →「加入主畫面」                       |
| **Android**   | 用 Chrome 打開網址 → 點右上「⋮」→「加到主畫面」或「安裝應用程式」           |

加入後就像一般 App 會有圖示，點開就直接進入，沒有網址列。
**資料完全保存在長者自己的手機裡，不會上傳到任何地方**。

### 怎麼玩

1. 開啟後會看到一個溫馨的陽台場景  
2. 右上方有 **會發光的燈泡** → 點下去就是今天的任務  
3. 任務可能是「拍照」、「散步」、「數東西」、「伸展」等  
4. 完成任務 → 對應的裝飾（植物、畫框、地毯、燈）會長大變化  

### 長者也可以自己換裝飾

- 點場景中的 **空位（+ 號）** → 從底部抽屜挑選
- 已完成的任務越多，能挑的裝飾也越多
- 不喜歡了可以 **收回抽屜** 再放別的

---

## 🔧 給開發者（你）

### 線上 Demo

> **https://DoAndLearn-Naro.github.io/Mytry/** （CI 自動部署）

### 你如何更新內容

依你之前說的「更新一律透過我這邊上傳進行更新」：

1. **改程式碼 → git push**（CI 會自動 build + deploy，約 1-2 分鐘後生效）
2. **改裝飾 → 在 App 內本（連點標題 5 次開管理員面板）拖放 JSON**  
   （內容包格式見 `src/modules/contentPack.js` 的 `DEFAULT_PACK`）

長者的手機不用重灌；下次開啟 App 會自動更新（Service Worker 背景更新）。

### 內容包範本

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
    }
  ],
  "slots": [],
  "tasks": []
}
```

### 專案結構（摘要）

```
src/
├── App.js                          主控制器
├── components/                     UI 元件
│   ├── GardenScene.js              2.5D 場景（perspective + 視差）
│   ├── Slot.js / Decoration.js     插槽 + 裝飾渲染
│   ├── DecorationDrawer.js         底部抽屜
│   ├── AdminPanel.js               隱藏管理員（拖放 JSON）
│   ├── Lightbulb.js                任務燈泡
│   ├── TaskModal.js / PhotoCapture.js
└── modules/
    ├── db.js                       IndexedDB（photos / placements / decorations / contentPack）
    ├── layout.js                   4 槽預設佈局
    ├── contentPack.js              內容包載入 / 合併
    ├── tasks.js                    4 個內建任務
    ├── camera.js / feedback.js / plant.js
```

### 本機開發（選用）

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 產出 dist/
```

> ⚠️ PWA / 相機需要 HTTPS（localhost 視為安全）；GitHub Pages 自動提供 HTTPS ✓

---

## 部署架構

```
git push (main)
   ↓
GitHub Actions (ubuntu-latest)
   ├─ npm ci
   ├─ npm run build  →  產出 dist/
   └─ actions/deploy-pages
         ↓
   gh-pages 分支
         ↓
   https://DoAndLearn-Naro.github.io/Mytry/
```

長者開啟該網址 → 「加入主畫面」→ 完成。

---

## 設計規範

| 規範         | 數值                                        |
| ------------ | ------------------------------------------ |
| 字體最小     | 20px（行動裝置 22px）                      |
| 主要按鈕     | 64 × 64px、陰影立體化                       |
| 對比         | 主要綠 `#5C8D4A` × 暖米 `#FFF8E7` ≥ 4.5:1 |
| 反饋         | 視覺 + 音效 + 震動 三者並用                 |
| 視差         | ≤6°，預設關閉，需使用者首次點擊才啟動       |

---

## Roadmap

- ✅ Phase 1：MVP + 單植物 + 拍照任務
- ✅ Phase 2：2.5D 場景 + 4 插槽 + 內容包
- 🚫 Phase 3（取消）：多長者 / 照顧者後台

### 未來可加
- 拍照日誌回顧頁
- 季節裝飾（端午、中秋）
- 「換佈局」功能（客廳 / 書房）
- 語音導讀（讓長者不必讀文字）