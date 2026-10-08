# Mytry — 兩個長者友善 PWA 專案

| 專案 | 用途 |
|---|---|
| [life-garden/](./life-garden/) | 每日小花園：燈泡任務 + 拍照 + 植物 |
| [warm-home/](./warm-home/) | 暖窩：3/4 視角房間 + 拖移家具 + 拍立得回憶 |

兩個都是給長者用的 **PWA**（可加入主畫面、離線可用）。

---

## 線上 Demo

啟用 Pages（Source = GitHub Actions）後：

| 專案 | 網址 |
|---|---|
| 每日小花園 | `https://DoAndLearn-Naro.github.io/Mytry/life-garden/` |
| 暖窩       | `https://DoAndLearn-Naro.github.io/Mytry/warm-home/` |

---

## 共同特色

- 📱 PWA：可加入手機主畫面（iOS Safari / Android Chrome）
- 🎯 長者友善：≥20px 字、≥60px 按鈕、高對比、視覺/震動/音效三合一反饋
- 💾 100% 本機：資料存 IndexedDB，不上傳任何 server
- 🔧 隱藏管理員：標題連點 5 次 → 拖放 JSON 內容包
- 🆓 GitHub Pages：自動 HTTPS + 免費

---

## 各專案文件

- 每日小花園 → [life-garden/README.md](./life-garden/README.md)
- 暖窩       → [warm-home/README.md](./warm-home/README.md)

---

## 更新流程

兩種方式：

1. **改程式碼 / 加裝飾** → 編輯檔案 → `git push` → CI 自動 build + deploy
2. **純內容更新**（加新家具 / 新任務 / 新裝飾）→ 進入管理員面板（標題連點5 次）→ 拖放 JSON

---

## 維護者

`Develop Me Only` — 透過 npm 旗子與 git push 進行更新。