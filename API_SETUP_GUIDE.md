# 台股個股期貨分析系統 — API 申請與設定清單 (API Onboarding Guide)

> 本文件依據 `antigravity_stock_futures_prompt.md` 規範彙整，列出所有外部資料來源之官方文件、申請步驟、所需憑證、頻率限制、授權條款與主要/備援方案建議。

---

## 1. 資料來源與主要 / 備援組合建議

| 用途類別 | 推薦主要來源 (Primary) | 推薦備援來源 (Fallback) | 離線/非交易時段模式 |
| :--- | :--- | :--- | :--- |
| **個股期貨即時報價 & 分K** | **永豐金證券 Shioaji API** | **富果 Fugle Marketdata API** | 內建 Mock Engine / 歷史回放 |
| **現貨即時報價 (算基差)** | **永豐金 Shioaji / Fugle** | 證交所 MIS 即時行情 (網頁查詢) | 內建現貨模擬報價 |
| **個股期貨契約與日行情** | **期交所 (TAIFEX) 開放資料** | FinMind 台股期貨資料集 | 本地快取 DuckDB / SQLite |
| **現貨日K、三大法人、融資券** | **證交所 / 櫃買 OpenAPI** | **FinMind API** / yfinance | 本地歷史日K庫 |
| **公司月營收、財報 EPS** | **公開資訊觀測站 (MOPS)** | 證交所 OpenAPI 上市櫃營收 | 本地財報資料表 |
| **新聞與重大訊息情緒** | **MOPS 重大訊息 + Google News RSS** | 鉅亨網 / 經濟日報 RSS | **Gemini 2.5 Flash API** 分析 |

---

## 2. 各 API 詳細申請與設定說明

### 2.1 永豐金證券 Shioaji API (主要券商報價源)
- **官方文件**：[https://sinotrade.github.io/](https://sinotrade.github.io/)
- **適用範圍**：台股現貨與個股期貨即時 Tick、1/5分K、買賣五檔、歷史K棒、OI（僅讀取行情，不執行下單）。
- **申請步驟**：
  1. 需擁有永豐金證券/期貨交易帳戶並開通 API 交易權限。
  2. 登入永豐金「Python API 申請專區」，簽署 API 風險預告書。
  3. 下載 CA 憑證檔 (`Sinopac.pfx`) 並取得 `API_KEY` 與 `SECRET_KEY`。
- **需要準備的金鑰**：
  - `SHIOAJI_API_KEY`: 永豐 API 金鑰
  - `SHIOAJI_SECRET_KEY`: 永豐密鑰
  - `SHIOAJI_CERT_PATH`: 憑證檔本機路徑
  - `SHIOAJI_CERT_PASSWORD`: 憑證密碼
- **頻率限制**：WebSocket 連線即時推播，連線數上限 1~2 條；REST API 頻率每秒 10~20 次。
- **費用與授權**：永豐開戶客戶免費使用；個人研究與輔助看盤用途。

---

### 2.2 富果 Fugle Marketdata API (備援券商報價源)
- **官方文件**：[https://developer.fugle.tw/docs/marketdata/intro](https://developer.fugle.tw/docs/marketdata/intro)
- **適用範圍**：台股現貨即時與歷史行情（REST + WebSocket）。
- **申請步驟**：
  1. 前往富果開發者中心（[https://developer.fugle.tw/](https://developer.fugle.tw/)）註冊帳號。
  2. 建立專案並申請 API Token。
- **需要準備的金鑰**：
  - `FUGLE_API_TOKEN`: 富果 API 金鑰
- **頻率限制與免費額度**：
  - 個人免費方案：每分鐘 60 次 REST API 請求，WebSocket 支援 5 檔訂閱。
- **費用與授權**：基本功能免費，商業大量訂閱需付費方案。

---

### 2.3 期交所 (TAIFEX) 開放資料平台
- **官方平台**：[https://www.taifex.com.tw/cht/index](https://www.taifex.com.tw/cht/index) 與政府資料開放平台 (data.gov.tw)
- **適用範圍**：個股期貨商品清單、標準/小型契約代號、每日結算價、未平倉量 (OI)、三大法人期貨未平倉、保證金標準。
- **申請方式**：**完全免費、無須 API Key**（直接抓取每日盤後 14:30 產出之 CSV / JSON）。
- **更新時點**：每日交易日 14:30~15:00 盤後更新。

---

### 2.4 證交所 (TWSE) & 櫃買中心 (TPEx) OpenAPI
- **官方文件**：[https://openapi.twse.com.tw/](https://openapi.twse.com.tw/)
- **適用範圍**：每日現貨收盤行情、三大法人買賣超、融資融券餘額、注意及處置股票公告、上市櫃月營收。
- **申請方式**：**完全免費、無須 API Key**（提供標準 Swagger OpenAPI 規範）。
- **頻率限制**：建議單 IP 請求間隔 ≥ 1 秒，並實作本地快取。

---

### 2.5 FinMind 財經資料庫 (整合備援)
- **官方文件**：[https://finmind.github.io/](https://finmind.github.io/)
- **適用範圍**：還原日K、三大法人、融資融券、借券、月營收、財務報表。
- **申請步驟**：
  1. 至 [FinMind 官網](https://finmindtrade.com/) 註冊帳號。
  2. 在使用者後台複製個人 Token。
- **需要準備的金鑰**：
  - `FINMIND_API_TOKEN`: FinMind 存取金鑰
- **免費額度**：免費會員每小時 600 次請求。

---

### 2.6 Google Gemini API (新聞情緒與重大訊息事件分類)
- **官方文件**：[https://ai.google.dev/](https://ai.google.dev/)
- **適用範圍**：盤中/盤後對個股重大訊息、法說會、財報新聞進行「利多/利空/中性」情緒評分與事件分類（如處置風險、擴產、減資）。
- **申請步驟**：
  1. 前往 Google AI Studio ([https://aistudio.google.com/](https://aistudio.google.com/))。
  2. 點擊「Get API key」並建立金鑰。
- **需要準備的金鑰**：
  - `GEMINI_API_KEY`: Google Gemini API 金鑰
- **免費額度**：Gemini 2.5 Flash 提供每日高達 1,500 次免費呼叫額度，完全滿足即時新聞分類需求。

---

## 3. 環境變數填寫步驟

1. 複製專案根目錄之 `.env.example` 為 `.env`：
   ```bash
   cp .env.example .env
   ```
2. 使用文字編輯器開啟 `.env`，填入您申請到的金鑰。若尚未申請，系統會自動切換為 **模擬與公開免金鑰模式 (Mock & Open Data Mode)**，所有功能均可正常運行並進行測試！
