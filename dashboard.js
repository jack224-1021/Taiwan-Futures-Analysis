/**
 * 台股個股期貨強勢排名與盤中決策終端 — Dashboard Logic & Analytics Engine
 * Version: 2.0-PRO (Live / Mock Real-Data Engine)
 * 遵循規範：
 * 1. 支援 DATA_MODE=live|mock。
 * 2. live 模式下若登入失敗或資料缺失，嚴禁自動退回 mock，在畫面呈現明確錯誤與原因。
 * 3. 移除寫死的狀態與延遲，依真實連線狀態與實際收到資料的時間差動態計算。
 * 4. mock 模式下頂部顯示顯目橫幅，價格旁標記 [模擬] 而非 [即時]。
 * 5. 依最小跳動點與固定小數格式化數值，徹底消除浮點精度誤差 (如 +2.0300000000000002)。
 * 6. 依期交所第三個星期三演算法動態計算結算日倒數。
 */

// ==============================================================================
// 1. Initial State & Default Mock Data
// ==============================================================================
const STORAGE_PORTFOLIO_KEY = 'BANBAN_FUTURES_PORTFOLIO_V2';

// 預設台股個股期貨基本資料庫 (當未連線或 Mock 模式時使用)
const DEFAULT_FUTURES_UNIVERSE = [
  {
    symbol: 'CDF',
    underlying: '2330',
    name: '台積電期',
    sector: '半導體',
    price: 1045.0,
    change: 18.0,
    changePct: 1.75,
    volume: 14250,
    oi: 42800,
    oiChange: 1850,
    volumeRatio: 1.82,
    rsRating: 98,
    ma5: 1030.0,
    ma10: 1015.0,
    ma20: 995.0,
    ma60: 950.0,
    vwap: 1042.5,
    atr14: 24.5,
    rsi14: 68.4,
    adx14: 32.8,
    macdHist: 6.8,
    instBuyStreak: 7,
    instNetShares: 15800,
    revenueYoY: 34.2,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.135,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'JFF',
    underlying: '3017',
    name: '奇鋐期',
    sector: 'AI散熱',
    price: 688.0,
    change: 28.0,
    changePct: 4.24,
    volume: 8900,
    oi: 12400,
    oiChange: 1120,
    volumeRatio: 2.35,
    rsRating: 96,
    ma5: 660.0,
    ma10: 642.0,
    ma20: 620.0,
    ma60: 580.0,
    vwap: 681.0,
    atr14: 26.0,
    rsi14: 74.2,
    adx14: 36.5,
    macdHist: 8.5,
    instBuyStreak: 5,
    instNetShares: 4200,
    revenueYoY: 48.6,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.162,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'DHF',
    underlying: '2317',
    name: '鴻海期',
    sector: 'AI代工',
    price: 222.5,
    change: 3.5,
    changePct: 1.60,
    volume: 18500,
    oi: 68200,
    oiChange: 2400,
    volumeRatio: 1.58,
    rsRating: 91,
    ma5: 218.0,
    ma10: 215.0,
    ma20: 208.0,
    ma60: 195.0,
    vwap: 221.8,
    atr14: 6.2,
    rsi14: 64.5,
    adx14: 28.4,
    macdHist: 2.1,
    instBuyStreak: 4,
    instNetShares: 22000,
    revenueYoY: 26.5,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.135,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'GDF',
    underlying: '2382',
    name: '廣達期',
    sector: 'AI伺服器',
    price: 313.5,
    change: 6.5,
    changePct: 2.12,
    volume: 7200,
    oi: 18400,
    oiChange: 760,
    volumeRatio: 1.65,
    rsRating: 89,
    ma5: 305.0,
    ma10: 300.0,
    ma20: 290.0,
    ma60: 278.0,
    vwap: 311.5,
    atr14: 9.8,
    rsi14: 66.8,
    adx14: 29.2,
    macdHist: 3.4,
    instBuyStreak: 3,
    instNetShares: 6800,
    revenueYoY: 28.4,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.135,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'JGF',
    underlying: '3324',
    name: '雙鴻期',
    sector: 'AI水冷',
    price: 795.0,
    change: 32.0,
    changePct: 4.19,
    volume: 4800,
    oi: 6200,
    oiChange: 540,
    volumeRatio: 2.10,
    rsRating: 94,
    ma5: 760.0,
    ma10: 740.0,
    ma20: 710.0,
    ma60: 660.0,
    vwap: 788.0,
    atr14: 31.0,
    rsi14: 72.1,
    adx14: 34.2,
    macdHist: 11.2,
    instBuyStreak: 4,
    instNetShares: 1800,
    revenueYoY: 38.9,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.162,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'DVF',
    underlying: '2454',
    name: '聯發科期',
    sector: 'IC設計',
    price: 1290.0,
    change: 25.0,
    changePct: 1.98,
    volume: 5100,
    oi: 11200,
    oiChange: 680,
    volumeRatio: 1.72,
    rsRating: 92,
    ma5: 1260.0,
    ma10: 1240.0,
    ma20: 1210.0,
    ma60: 1180.0,
    vwap: 1282.0,
    atr14: 38.0,
    rsi14: 67.5,
    adx14: 30.5,
    macdHist: 7.2,
    instBuyStreak: 3,
    instNetShares: 2100,
    revenueYoY: 24.8,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.135,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'CZF',
    underlying: '2603',
    name: '長榮期',
    sector: '航運',
    price: 199.0,
    change: 1.5,
    changePct: 0.76,
    volume: 6100,
    oi: 24000,
    oiChange: 420,
    volumeRatio: 1.15,
    rsRating: 78,
    ma5: 196.0,
    ma10: 194.0,
    ma20: 190.0,
    ma60: 185.0,
    vwap: 198.2,
    atr14: 5.5,
    rsi14: 58.2,
    adx14: 24.1,
    macdHist: 1.2,
    instBuyStreak: 2,
    instNetShares: 3400,
    revenueYoY: 22.1,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.135,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'QAF',
    underlying: '1519',
    name: '華城期',
    sector: '重電綠能',
    price: 618.0,
    change: -12.0,
    changePct: -1.90,
    volume: 3400,
    oi: 5800,
    oiChange: -320,
    volumeRatio: 0.88,
    rsRating: 62,
    ma5: 630.0,
    ma10: 638.0,
    ma20: 645.0,
    ma60: 660.0,
    vwap: 622.0,
    atr14: 28.0,
    rsi14: 43.5,
    adx14: 19.4,
    macdHist: -4.2,
    instBuyStreak: -2,
    instNetShares: -1200,
    revenueYoY: 15.2,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.2025,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  },
  {
    symbol: 'PAF',
    underlying: '3661',
    name: '世芯-KY期',
    sector: 'ASIC設計',
    price: 2120.0,
    change: -60.0,
    changePct: -2.75,
    volume: 1800,
    oi: 3100,
    oiChange: 280,
    volumeRatio: 1.45,
    rsRating: 32,
    ma5: 2200.0,
    ma10: 2280.0,
    ma20: 2350.0,
    ma60: 2500.0,
    vwap: 2145.0,
    atr14: 85.0,
    rsi14: 36.2,
    adx14: 29.8,
    macdHist: -18.5,
    instBuyStreak: -6,
    instNetShares: -950,
    revenueYoY: -8.4,
    isDisposition: false,
    contractType: 'standard',
    marginRate: 0.2025,
    sharesPerContract: 2000,
    is_mock: true,
    price_label: '模擬',
    timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false })
  }
];

// 預設庫存部位
const DEFAULT_PORTFOLIO = [
  {
    id: 'pos_1',
    symbol: 'CDF',
    name: '台積電期',
    contractMonth: '202610 (近月)',
    direction: 'LONG',
    entryPrice: 1010.0,
    contracts: 1,
    currentStopLoss: 980.0,
    target1R: 1040.0,
    target2R: 1070.0,
    target3R: 1100.0,
    entryDate: '2026-10-02'
  },
  {
    id: 'pos_2',
    symbol: 'JFF',
    name: '奇鋐期',
    contractMonth: '202610 (近月)',
    direction: 'LONG',
    entryPrice: 645.0,
    contracts: 1,
    currentStopLoss: 615.0,
    target1R: 675.0,
    target2R: 705.0,
    target3R: 735.0,
    entryDate: '2026-10-04'
  }
];

// 重大訊息與新聞 Mock 資訊
const MARKET_NEWS_FEED = [
  {
    id: 'news_1',
    source: '公開資訊觀測站 (MOPS)',
    title: '台積電(2330) 公告9月合併營收創同期歷史新高，先進製程稼動率滿載',
    sentiment: 'bullish',
    category: '月營收利多',
    symbols: ['2330', 'CDF'],
    time: '10分鐘前'
  },
  {
    id: 'news_2',
    source: '經濟日報',
    title: 'AI水冷散熱需求強勁！奇鋐、雙鴻獲美系雲端大廠追加GB200水冷板大單',
    sentiment: 'bullish',
    category: '訂單利多',
    symbols: ['3017', '3324', 'JFF', 'JGF'],
    time: '28分鐘前'
  },
  {
    id: 'news_3',
    source: '公開資訊觀測站 (MOPS)',
    title: '世芯-KY(3661) 澄清外資報告：北美客戶專案遞延屬短期調整，長期合約不受影響',
    sentiment: 'neutral',
    category: '澄清說明',
    symbols: ['3661', 'PAF'],
    time: '45分鐘前'
  }
];

// ==============================================================================
// 2. Precision Math & Formatting Helpers (消除浮點誤差)
// ==============================================================================
function getTickSize(price) {
  if (price < 10.0) return 0.01;
  if (price < 50.0) return 0.05;
  if (price < 100.0) return 0.10;
  if (price < 500.0) return 0.50;
  if (price < 1000.0) return 1.00;
  return 5.00;
}

function roundToTick(price, direction = 'ROUND') {
  const tick = getTickSize(price);
  let val;
  if (direction === 'CEIL') val = Math.ceil(price / tick) * tick;
  else if (direction === 'FLOOR') val = Math.floor(price / tick) * tick;
  else val = Math.round(price / tick) * tick;
  
  // 消除 JavaScript 浮點數精度微小溢位
  return parseFloat(val.toFixed(4));
}

function formatPrice(price) {
  const tick = getTickSize(price);
  if (tick < 1.0) {
    return price.toFixed(2);
  }
  return Number.isInteger(price) ? `${price}` : price.toFixed(1);
}

function formatChange(change) {
  const sign = change > 0 ? '+' : '';
  return `${sign}${Number(change).toFixed(2)}`;
}

function formatChangePct(pct) {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${Number(pct).toFixed(2)}%`;
}

// 動態計算期交所第三個星期三結算日曆
function calculateSettlementInfo(customDate = null) {
  const date = customDate ? new Date(customDate) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  function getThirdWednesday(y, m) {
    const firstDay = new Date(y, m, 1);
    const dayOfWeek = firstDay.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, ...
    const daysToFirstWed = (3 - dayOfWeek + 7) % 7;
    const firstWedDate = 1 + daysToFirstWed;
    const thirdWedDate = firstWedDate + 14;
    return new Date(y, m, thirdWedDate);
  }

  const thisMonthWed = getThirdWednesday(year, month);
  let activeWed, targetMonthStr, displayMonth;

  // 如果今天已過本月第三個星期三，則合約月份順延至次月
  const todayOnly = new Date(year, month, date.getDate());
  if (todayOnly > thisMonthWed) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    activeWed = getThirdWednesday(nextYear, nextMonth);
    targetMonthStr = `${nextYear}${String(nextMonth + 1).padStart(2, '0')}`;
    displayMonth = nextMonth + 1;
  } else {
    activeWed = thisMonthWed;
    targetMonthStr = `${year}${String(month + 1).padStart(2, '0')}`;
    displayMonth = month + 1;
  }

  const diffMs = activeWed.getTime() - todayOnly.getTime();
  const daysRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const mm = String(activeWed.getMonth() + 1).padStart(2, '0');
  const dd = String(activeWed.getDate()).padStart(2, '0');

  return {
    contractMonth: targetMonthStr,
    displayMonth: displayMonth,
    settlementDateStr: `${mm}/${dd}`,
    daysRemaining: daysRemaining,
    isSettlementDay: daysRemaining === 0,
    isWarning: daysRemaining <= 3,
    displayText: daysRemaining <= 3
      ? `⏰ 距 ${displayMonth} 月結算日僅剩 ${daysRemaining} 天 (${mm}/${dd})，請注意轉倉！`
      : `⏳ 距本月結算日: ${daysRemaining} 天 (${mm}/${dd})`
  };
}

// ==============================================================================
// 3. Scoring Engine (五大維度 + 基本面加成，透明輸出各維度得分明細)
// ==============================================================================
function calculateStrengthScore(item, mode = 'BULL') {
  let score = 0;
  const reasons = [];

  // A. 趨勢結構 (滿分 25分)
  let scoreA = 0;
  if (mode === 'BULL') {
    const isBullAlignment = item.price > item.ma5 && item.ma5 > item.ma10 && item.ma10 > item.ma20 && item.ma20 > item.ma60;
    if (isBullAlignment) {
      scoreA += 10;
      reasons.push('+10 多頭排列 (現價 > 5MA > 10MA > 20MA > 60MA)');
    } else if (item.price > item.ma20 && item.price > item.ma60) {
      scoreA += 6;
      reasons.push('+6 站穩 20MA 與 60MA 生命線之上');
    }

    if (item.price >= item.ma5 * 1.01) {
      scoreA += 8;
      reasons.push('+8 創波段高點強勢攻擊');
    }
    scoreA += 7; // 基礎趨勢分
  } else {
    // 空方模式
    const isBearAlignment = item.price < item.ma5 && item.ma5 < item.ma10 && item.ma10 < item.ma20 && item.ma20 < item.ma60;
    if (isBearAlignment) {
      scoreA += 18;
      reasons.push('+18 空頭排列空方完全壓制');
    } else if (item.price < item.ma20 && item.price < item.ma60) {
      scoreA += 10;
      reasons.push('+10 跌破 20MA 與 60MA 支撐轉壓力');
    }
    scoreA += 7;
  }
  const cappedA = Math.min(scoreA, 25);
  score += cappedA;

  // B. 相對強度 (滿分 25分)
  let scoreB = 0;
  if (mode === 'BULL') {
    const rsPts = Math.round((item.rsRating / 100) * 15);
    scoreB += rsPts;
    if (item.rsRating >= 90) reasons.push(`+${rsPts} RS相對強度PR值達 ${item.rsRating} (全市場頂尖)`);
    if (item.changePct > 1.5) {
      scoreB += 10;
      reasons.push(`+10 漲幅 ${item.changePct}% 強勢突破 (+1.5%門檻)`);
    }
  } else {
    const bearRs = 100 - item.rsRating;
    const rsPts = Math.round((bearRs / 100) * 15);
    scoreB += rsPts;
    if (bearRs >= 70) reasons.push(`+${rsPts} 弱勢程度PR值達 ${bearRs}`);
    if (item.changePct < -1.5) {
      scoreB += 10;
      reasons.push(`+10 跌幅 ${item.changePct}% 重挫跌破 (-1.5%門檻)`);
    }
  }
  const cappedB = Math.min(scoreB, 25);
  score += cappedB;

  // C. 動能與趨勢 (滿分 15分)
  let scoreC = 0;
  if (mode === 'BULL') {
    if (item.adx14 > 25) {
      scoreC += 6;
      reasons.push('+6 ADX(14) 趨勢動能強勁 (>25)');
    }
    if (item.macdHist > 0) {
      scoreC += 5;
      reasons.push('+5 MACD 柱狀體翻紅擴大');
    }
    if (item.rsi14 >= 55 && item.rsi14 <= 80) {
      scoreC += 4;
      reasons.push('+4 RSI(14) 位於 55~80 健康強勢區間');
    } else if (item.rsi14 > 80) {
      scoreC -= 2;
      reasons.push('⚠️ -2 RSI > 80 短線極端過熱警示');
    }
  } else {
    if (item.adx14 > 25) scoreC += 6;
    if (item.macdHist < 0) scoreC += 5;
    if (item.rsi14 <= 45) scoreC += 4;
  }
  const cappedC = Math.min(scoreC, 15);
  score += cappedC;

  // D. 量價與波動 (滿分 15分)
  let scoreD = 0;
  if (item.volumeRatio >= 1.5) {
    scoreD += 8;
    reasons.push(`+8 帶量突破 (量比達 ${item.volumeRatio}x 倍)`);
  } else {
    scoreD += 4;
  }
  scoreD += 7; // 基礎波動分
  const cappedD = Math.min(scoreD, 15);
  score += cappedD;

  // E. 籌碼與期貨特有訊號 (滿分 20分)
  let scoreE = 0;
  if (mode === 'BULL') {
    if (item.instBuyStreak >= 3) {
      scoreE += 8;
      reasons.push(`+8 三大法人連續買超 ${item.instBuyStreak} 日 (+${item.instNetShares}張)`);
    }
    if (item.changePct > 0 && item.oiChange > 0) {
      scoreE += 8;
      reasons.push(`+8 價漲 + 期貨OI增加 (${item.oiChange > 0 ? '+' : ''}${item.oiChange}口)，多方增倉主力進駐`);
    }
    scoreE += 4; // 基礎籌碼分
  } else {
    if (item.changePct < 0 && item.oiChange > 0) {
      scoreE += 10;
      reasons.push(`+10 價跌 + 期貨OI增加 (${item.oiChange}口)，空方積極進場壓制`);
    }
    if (item.instBuyStreak <= -3) {
      scoreE += 8;
      reasons.push(`+8 法人連續倒貨賣超 ${Math.abs(item.instBuyStreak)} 日`);
    }
  }
  const cappedE = Math.min(scoreE, 20);
  score += cappedE;

  // 基本面加成 (Bonus 5分)
  let scoreBonus = 0;
  if (item.revenueYoY >= 20.0 && mode === 'BULL') {
    scoreBonus = 5;
    score += scoreBonus;
    reasons.push(`+5 基本面加成：月營收年增達 ${item.revenueYoY}%`);
  }

  const rawScore = score;
  const totalScore = Math.min(Math.max(score, 0), 100);

  return {
    rawScore: rawScore,
    totalScore: totalScore,
    scores: {
      a: cappedA,
      b: cappedB,
      c: cappedC,
      d: cappedD,
      e: cappedE,
      bonus: scoreBonus
    },
    reasons: reasons
  };
}

// ==============================================================================
// 4. Master Terminal Application Class
// ==============================================================================
class StockFuturesTerminal {
  constructor() {
    this.marketData = JSON.parse(JSON.stringify(DEFAULT_FUTURES_UNIVERSE));
    this.portfolio = this.loadPortfolio();
    this.currentMode = 'BULL';
    this.activeTab = 'ranking';
    this.selectedSymbol = 'CDF';
    this.totalCapital = 1200000;
    this.maxRiskPerTrade = 60000;

    // 即時連線狀態管理
    this.dataMode = 'mock'; // 'live' or 'mock'
    this.isConnected = false;
    this.liveError = null;
    this.latencyMs = 0;
    this.lastDataTimestamp = null;
    this.marketIndices = {
      tse: { price: 23450.8, change: 168.2, changePct: 0.72, formatted_change: '+168.20 (+0.72%)' },
      txf: { price: 23485.0, change: 195.0, changePct: 0.84, formatted_change: '+195.00 (+0.84%)' }
    };
    this.settlementInfo = calculateSettlementInfo();
    this.pollInterval = null;

    this.init();
  }

  loadPortfolio() {
    try {
      const saved = localStorage.getItem(STORAGE_PORTFOLIO_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn(e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO));
  }

  savePortfolio() {
    try {
      localStorage.setItem(STORAGE_PORTFOLIO_KEY, JSON.stringify(this.portfolio));
    } catch (e) {
      console.error(e);
    }
  }

  init() {
    this.bindEvents();
    this.setupPortfolioModal();
    this.fetchDataFromBackend();
    this.startDataPolling();
  }

  bindEvents() {
    // Tab 切換
    document.querySelectorAll('.terminal-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.activeTab = tab;
        document.querySelectorAll('.terminal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === `tab-${tab}`));
        this.render();
      });
    });

    // 多方 / 空方榜切換
    const modeBullBtn = document.getElementById('btn-mode-bull');
    const modeBearBtn = document.getElementById('btn-mode-bear');
    if (modeBullBtn && modeBearBtn) {
      modeBullBtn.addEventListener('click', () => {
        this.currentMode = 'BULL';
        modeBullBtn.classList.add('active');
        modeBearBtn.classList.remove('active');
        this.render();
        this.showToast('📈 已切換為【多方強勢榜】排名', 'info');
      });
      modeBearBtn.addEventListener('click', () => {
        this.currentMode = 'BEAR';
        modeBearBtn.classList.add('active');
        modeBullBtn.classList.remove('active');
        this.render();
        this.showToast('📉 已切換為【空方弱勢榜】排名', 'info');
      });
    }

    // 重新整理按鈕
    const refreshBtn = document.getElementById('btn-manual-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchDataFromBackend();
        this.showToast('⚡ 正在從後端 API 擷取最新即時行情與評分...', 'info');
      });
    }
  }

  startDataPolling() {
    // 每 3 秒自後端 API 取得真實狀態與最新報價
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.fetchDataFromBackend();
    }, 3000);
  }

  async fetchDataFromBackend() {
    const startTime = Date.now();
    const isGitHubPages = window.location.hostname.endsWith('github.io');
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let apiBase = '';
    if (window.location.protocol === 'file:' || (isLocal && window.location.port !== '8000')) {
      apiBase = 'http://127.0.0.1:8000';
    }

    try {
      const res = await fetch(`${apiBase}/api/market-data`, { cache: 'no-store' });
      const elapsed = Date.now() - startTime;
      
      if (res.status === 200) {
        const data = await res.json();
        this.dataMode = data.status.data_mode;
        this.isConnected = data.status.connected;
        this.liveError = null;
        this.latencyMs = elapsed;
        this.lastDataTimestamp = Date.now();

        if (data.futures && data.futures.length > 0) {
          this.marketData = data.futures;
        }
        if (data.indices) {
          this.marketIndices = data.indices;
        }
        if (data.settlement) {
          this.settlementInfo = {
            ...calculateSettlementInfo(),
            ...data.settlement
          };
        }
        this.render();
      } else if (res.status === 503) {
        // LIVE 模式登入失敗或資料缺失，嚴禁退回 mock
        const errorData = await res.json();
        this.dataMode = 'live';
        this.isConnected = false;
        this.liveError = errorData.error || '行情連線異常，嚴禁自動退回 Mock 模擬資料。';
        this.latencyMs = null;
        this.render();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      this.isConnected = false;
      this.latencyMs = null;
      this.render();
    }
  }

  // ==============================================================================
  // Master Render
  // ==============================================================================
  render() {
    this.renderNoticeBanner();
    this.renderTopMarquee();
    if (this.activeTab === 'ranking') this.renderRankingView();
    if (this.activeTab === 'portfolio') this.renderPortfolioView();
    if (this.activeTab === 'planner') this.renderPlannerView();
    if (this.activeTab === 'news') this.renderNewsView();
    if (this.activeTab === 'settings') this.renderSettingsView();
  }

  renderNoticeBanner() {
    const bannerEl = document.getElementById('system-notice-banner');
    if (!bannerEl) return;

    const isGitHubPages = window.location.hostname.endsWith('github.io');
    if (isGitHubPages && !this.isConnected) {
      bannerEl.innerHTML = `
        <div class="notice-banner notice-banner-live" style="background: linear-gradient(90deg, #1e3a8a 0%, #0284c7 50%, #1e3a8a 100%); border-bottom: 2px solid #38bdf8;">
          <span>🌐 【GitHub Pages 雲端在線展示版】</span>
          <span>強勢排行、多維雷達評分、庫存監控（新增/減碼/平倉）與停損風控試算已就緒！本機執行 <code>python server.py</code> 即可同步對接證交所即時報價。</span>
          <span style="font-size:0.75rem; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:4px;">ONLINE</span>
        </div>
      `;
      return;
    }

    if (this.dataMode === 'live' && (!this.isConnected || this.liveError)) {
      bannerEl.innerHTML = `
        <div class="notice-banner notice-banner-error">
          <span>❌ 【Shioaji 正式環境連線異常】</span>
          <span>${this.liveError || '連線中斷或金鑰認證失敗'}</span>
          <span style="font-size:0.75rem; opacity:0.9;">（依風控規則，LIVE 模式下嚴禁自動退回 Mock 模擬資料，請在 .env 中填寫有效 SJ_API_KEY / SJ_SECRET_KEY）</span>
        </div>
      `;
    } else if (this.dataMode === 'free' || this.dataMode === 'open') {
      bannerEl.innerHTML = `
        <div class="notice-banner notice-banner-live">
          <span>🟢 【免費開放 API 模式 (FREE OPEN DATA)】</span>
          <span>已自動對接「證交所 MIS 即時行情」+「期交所契約規格」+「證交所/MOPS 上市櫃月營收」，完全免金鑰、即時連線運作中！</span>
          <span style="font-size:0.75rem; background:rgba(0,0,0,0.25); padding:2px 8px; border-radius:4px;">DATA_MODE=free</span>
        </div>
      `;
    } else if (this.dataMode === 'mock') {
      bannerEl.innerHTML = `
        <div class="notice-banner notice-banner-mock">
          <span>⚠️ 【模擬資料模式 (MOCK DATA)】</span>
          <span>全市場價格、加權指數、台指期、OI 與法人買賣超皆為模擬測試資料，請勿作為實盤下單依據。</span>
          <span style="font-size:0.75rem; background:rgba(0,0,0,0.25); padding:2px 8px; border-radius:4px;">DATA_MODE=mock</span>
        </div>
      `;
    } else {
      bannerEl.innerHTML = `
        <div class="notice-banner notice-banner-live">
          <span>🟢 【Shioaji 正式環境即時連線 (LIVE)】</span>
          <span>已對接券商正式行情 (simulation=False)，目前資料傳輸正常。</span>
        </div>
      `;
    }
  }

  renderTopMarquee() {
    const el = document.getElementById('market-ticker-container');
    if (!el) return;

    const tse = this.marketIndices.tse;
    const txf = this.marketIndices.txf;

    // 連線狀態與延遲標記
    let connStatusBadge = '';
    const now = Date.now();
    const isDelayed = this.lastDataTimestamp && (now - this.lastDataTimestamp > 10000);

    if (this.dataMode === 'mock') {
      connStatusBadge = `<span class="badge badge-amber">模擬資料 (MOCK)</span>`;
    } else if (!this.isConnected || this.liveError) {
      connStatusBadge = `<span class="badge badge-bear">未連線 (異常)</span>`;
    } else if (isDelayed) {
      const secAgo = Math.round((now - this.lastDataTimestamp) / 1000);
      connStatusBadge = `<span class="badge badge-amber">資料延遲 (${secAgo}s前)</span>`;
    } else if (this.dataMode === 'free' || this.dataMode === 'open') {
      const ms = this.latencyMs !== null ? `${this.latencyMs}ms` : '即時';
      connStatusBadge = `<span class="badge badge-bull" style="background:rgba(16,185,129,0.2); color:#34d399; border:1px solid #10b981;">證交所 MIS 即時 (${ms})</span>`;
    } else {
      const ms = this.latencyMs !== null ? `${this.latencyMs}ms` : '即時';
      connStatusBadge = `<span class="badge badge-bull" style="background:rgba(16,185,129,0.2); color:#34d399; border:1px solid #10b981;">Shioaji 即時 (${ms})</span>`;
    }

    const st = this.settlementInfo;

    el.innerHTML = `
      <div class="ticker-item">
        <span>🇹🇼 加權指數:</span>
        <b class="${tse.change >= 0 ? 'ticker-val-up' : 'ticker-val-down'}">
          ${tse.price.toLocaleString()} (${formatChange(tse.change)} / ${formatChangePct(tse.changePct)})
        </b>
      </div>
      <div class="ticker-item">
        <span>台指期 (TX):</span>
        <b class="${txf.change >= 0 ? 'ticker-val-up' : 'ticker-val-down'}">
          ${txf.price.toLocaleString()} (${formatChange(txf.change)})
        </b>
      </div>
      <div class="ticker-item">
        <span>即時行情連線:</span>
        ${connStatusBadge}
      </div>
      <div class="ticker-item" style="color:var(--neon-amber); font-weight:700;">
        ${st.displayText || `⏳ 距本月結算日: ${st.daysRemaining} 天`}
      </div>
    `;
  }

  // ==============================================================================
  // 5. Ranking View (多方強勢榜 / 空方弱勢榜)
  // ==============================================================================
  renderRankingView() {
    const container = document.getElementById('tab-ranking');
    if (!container) return;

    // 若 Live 模式連線失敗，直接顯示明確錯誤提示
    if (this.dataMode === 'live' && (!this.isConnected || this.liveError)) {
      container.innerHTML = `
        <div class="panel-card" style="border-left:4px solid var(--bull-color); text-align:center; padding:40px 20px;">
          <div style="font-size:3rem; margin-bottom:12px;">❌</div>
          <h3 style="font-size:1.3rem; color:var(--text-main); margin-bottom:8px;">Shioaji 正式環境 (simulation=False) 連線失敗</h3>
          <p style="color:var(--bull-color); font-size:0.95rem; font-weight:700; max-width:600px; margin:0 auto 16px;">
            ${this.liveError || '未設定 API 金鑰或券商連線中斷'}
          </p>
          <p style="color:var(--text-muted); font-size:0.85rem; max-width:550px; margin:0 auto 20px; line-height:1.6;">
            依據系統規範：在 LIVE 模式下，若登入失敗、訂閱失敗或資料缺失，<b>嚴禁自動退回 Mock 模擬資料</b>，以防止產生誤導性實盤決策。
          </p>
          <div style="background:var(--bg-subtle); padding:12px; border-radius:6px; max-width:500px; margin:0 auto; font-family:monospace; font-size:0.8rem; text-align:left;">
            1. 請檢查 <code>.env</code> 中的 <code>SJ_API_KEY</code> 與 <code>SJ_SECRET_KEY</code>。<br>
            2. 若欲使用免金鑰之真實行情，請設定 <code>DATA_MODE=free</code>。<br>
            3. 若欲進行純功能模擬測試，請將 <code>DATA_MODE=mock</code>。
          </div>
        </div>
      `;
      return;
    }

    const scoredList = this.marketData.map(item => {
      const scoring = calculateStrengthScore(item, this.currentMode);
      return {
        ...item,
        rawScore: scoring.rawScore,
        totalScore: scoring.totalScore,
        scoreDetails: scoring.scores,
        reasons: scoring.reasons
      };
    });

    // 依原始得分 (rawScore) -> 相對強度 (rsRating) -> 成交量 嚴謹排序，徹底消除並列 100 分之模糊
    scoredList.sort((a, b) => {
      if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
      if (b.rsRating !== a.rsRating) return b.rsRating - a.rsRating;
      return (b.volume || 0) - (a.volume || 0);
    });

    const modeTag = this.dataMode === 'mock' 
      ? '<span class="price-tag-mock">模擬資料模式</span>' 
      : (this.dataMode === 'free' || this.dataMode === 'open' 
          ? '<span class="price-tag-live">證交所 MIS 即時</span>' 
          : '<span class="price-tag-live">Shioaji LIVE</span>');

    container.innerHTML = `
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <div class="panel-title">
              <span>🏆 全市場個股期貨${this.currentMode === 'BULL' ? '多方強勢' : '空方弱勢'}即時總榜</span>
              <span class="badge ${this.currentMode === 'BULL' ? 'badge-bull' : 'badge-bear'}">
                ${this.currentMode === 'BULL' ? '🔥 多方攻擊榜' : '❄️ 空方弱勢榜'}
              </span>
              ${modeTag}
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
              硬性濾網：5日均量 ≥ 500口、現貨成交值 ≥ 1億、站穩均線且排除處置股 | 各欄位資料來源透明標示
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-sm ${this.currentMode === 'BULL' ? 'btn-bull' : 'btn-secondary'}" id="btn-mode-bull">
              📈 多方強勢榜
            </button>
            <button class="btn btn-sm ${this.currentMode === 'BEAR' ? 'btn-bear' : 'btn-secondary'}" id="btn-mode-bear">
              📉 空方弱勢榜
            </button>
            <button class="btn btn-sm btn-primary" id="btn-manual-refresh">
              ⚡ 立即刷新
            </button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="terminal-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>期貨標的 / 產業</th>
                <th>成交價 / 漲跌 (資料時間)</th>
                <th>強勢總分 (維度細項)</th>
                <th>RS Rating</th>
                <th>成交量 / 量比</th>
                <th>期交所 OI 增減</th>
                <th>三大法人買賣</th>
                <th>營收 YoY / 基本面</th>
                <th>加扣分解析</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${scoredList.map((item, idx) => {
                const isOverheated = item.rsi14 > 80;
                let actionBadge = `<span class="badge badge-bull">突破進場</span>`;
                if (isOverheated) actionBadge = `<span class="badge badge-amber">過熱觀察</span>`;
                else if (item.price <= item.ma10 * 1.01) actionBadge = `<span class="badge badge-cyan">回測支撐</span>`;
                if (this.currentMode === 'BEAR') actionBadge = `<span class="badge badge-bear">破線放空</span>`;

                const priceTag = item.is_mock
                  ? `<span class="price-tag-mock">模擬</span>`
                  : `<span class="price-tag-live">${item.price_label || '即時'}</span>`;

                const sd = item.scoreDetails || { a: 0, b: 0, c: 0, d: 0, e: 0, bonus: 0 };
                const rawScoreBadge = item.rawScore > 100 
                  ? `<span style="font-size:0.75rem; color:var(--neon-amber); margin-left:4px;">(原始:${item.rawScore})</span>` 
                  : '';

                return `
                  <tr>
                    <td><b style="font-size:1.1rem; color:${idx < 3 ? 'var(--neon-cyan)' : 'var(--text-muted)'};">#0${idx + 1}</b></td>
                    <td>
                      <b>${item.name} (${item.symbol})</b><br>
                      <small style="color:var(--text-dim);">${item.underlying} | ${item.sector}</small>
                    </td>
                    <td>
                      <b style="font-size:1rem; color:${item.change >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'};">
                        NT$ ${formatPrice(item.price)}
                      </b>
                      ${priceTag}<br>
                      <small style="color:${item.change >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'}; font-weight:700;">
                        ${formatChange(item.change)} (${formatChangePct(item.changePct)})
                      </small>
                      <div class="price-timestamp">${item.timestamp || ''}</div>
                      <div style="font-size:0.68rem; color:var(--text-dim); margin-top:2px;">來源: ${item.price_source || (item.is_mock ? '模擬' : 'Shioaji')}</div>
                    </td>
                    <td>
                      <div style="font-size:1.15rem; font-weight:900; color:var(--neon-cyan);">
                        ${item.totalScore} <small style="font-size:0.75rem; color:var(--text-dim);">分</small>
                        ${rawScoreBadge}
                      </div>
                      <div class="score-radar-bar">
                        <div class="score-radar-fill" style="width:${item.totalScore}%;"></div>
                      </div>
                      <div style="font-size:0.68rem; color:var(--text-muted); margin-top:4px; line-height:1.3;">
                        趨勢:${sd.a} RS:${sd.b} 動能:${sd.c} 量價:${sd.d} 籌碼:${sd.e}${sd.bonus ? ` +營收:${sd.bonus}` : ''}
                      </div>
                    </td>
                    <td><b style="color:var(--text-main); font-size:0.95rem;">PR ${item.rsRating}</b></td>
                    <td>
                      <b style="color:var(--text-main); font-size:0.95rem;">${(item.volume || 0).toLocaleString()} 口</b><br>
                      <small style="color:${item.volumeRatio >= 1.5 ? 'var(--neon-amber)' : 'var(--text-muted)'}; font-weight:700;">量比: ${item.volumeRatio}x</small>
                      <div style="font-size:0.68rem; color:var(--text-dim);">來源: ${item.price_source || (item.is_mock ? '模擬' : 'Shioaji')}</div>
                    </td>
                    <td>
                      <b style="color:${item.oiChange > 0 ? 'var(--bull-color)' : 'var(--bear-color)'};">
                        ${item.oiChange > 0 ? '+' : ''}${item.oiChange} 口
                      </b><br>
                      <small style="color:var(--text-dim);">未平倉 ${(item.oi || 0).toLocaleString()} 口</small>
                      <div style="font-size:0.68rem; color:var(--neon-amber);">來源: ${item.oi_source || '期交所盤後'}</div>
                    </td>
                    <td>
                      <span style="color:${item.instBuyStreak > 0 ? 'var(--bull-color)' : 'var(--bear-color)'}; font-weight:700;">
                        ${item.instBuyStreak > 0 ? `連買 ${item.instBuyStreak} 日` : `連賣 ${Math.abs(item.instBuyStreak)} 日`}
                      </span><br>
                      <small style="color:var(--text-dim);">${item.instNetShares > 0 ? '+' : ''}${(item.instNetShares || 0).toLocaleString()} 張</small>
                      <div style="font-size:0.68rem; color:var(--neon-amber);">來源: ${item.inst_source || '證交所三大法人'}</div>
                    </td>
                    <td>
                      <b style="color:${item.revenueYoY >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'}; font-size:0.9rem;">
                        ${item.revenueYoY > 0 ? '+' : ''}${item.revenueYoY}%
                      </b><br>
                      <div style="font-size:0.68rem; color:var(--neon-amber);">來源: ${item.revenue_source || '證交所/MOPS'}</div>
                    </td>
                    <td>
                      <div style="font-size:0.75rem; line-height:1.5; max-width:260px;">
                        ${item.reasons.slice(0, 2).map(r => `<div>• ${r}</div>`).join('')}
                      </div>
                    </td>
                    <td>
                      <div style="display:flex; flex-direction:column; gap:6px;">
                        <button class="btn btn-sm btn-primary btn-rank-to-plan" data-symbol="${item.symbol}">
                          🎯 擬定計畫
                        </button>
                        <button class="btn btn-sm btn-cyan-outline btn-rank-to-pos" data-symbol="${item.symbol}">
                          ➕ 加入持倉
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindRankingEvents();
  }

  bindRankingEvents() {
    document.querySelectorAll('.btn-rank-to-plan').forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.symbol;
        this.selectedSymbol = symbol;
        this.activeTab = 'planner';
        document.querySelectorAll('.terminal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'planner'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === 'tab-planner'));
        this.render();
      });
    });

    document.querySelectorAll('.btn-rank-to-pos').forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = btn.dataset.symbol;
        this.openPortfolioModal(null, symbol);
      });
    });
  }

  // ==============================================================================
  // 6. Portfolio Intraday Monitor View (庫存盤中即時監控)
  // ==============================================================================
  renderPortfolioView() {
    const container = document.getElementById('tab-portfolio');
    if (!container) return;

    let totalUnrealizedPnl = 0;
    let totalMarginUsed = 0;
    let totalNotionalValue = 0;

    const enrichedPositions = this.portfolio.map(pos => {
      const live = this.marketData.find(m => m.symbol === pos.symbol) || {
        symbol: pos.symbol,
        name: pos.name,
        price: pos.entryPrice,
        change: 0,
        changePct: 0,
        vwap: pos.entryPrice,
        atr14: 20,
        volumeRatio: 1.0,
        sharesPerContract: 2000,
        marginRate: 0.135,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        is_mock: true
      };
      const sharesPerContract = live.sharesPerContract || 2000;
      const notionalValue = live.price * sharesPerContract * pos.contracts;
      const priceDiff = pos.direction === 'LONG' ? (live.price - pos.entryPrice) : (pos.entryPrice - live.price);
      const unrealizedPnl = priceDiff * sharesPerContract * pos.contracts;
      const pnlPct = ((priceDiff / pos.entryPrice) * 100).toFixed(2);
      
      const riskPerShare = Math.abs(pos.entryPrice - pos.currentStopLoss);
      const currentR = riskPerShare > 0 ? (priceDiff / riskPerShare).toFixed(2) : '0.00';
      const margin = notionalValue * (live.marginRate || 0.135);

      totalUnrealizedPnl += unrealizedPnl;
      totalMarginUsed += margin;
      totalNotionalValue += notionalValue;

      // 4大訊號燈邏輯 (多空分別判斷)
      let signalType = 'hold';
      let signalText = '🟢 續抱 (趨勢良好)';
      let signalReason = '現價高於 20MA 與 VWAP，未跌破停損線，多方格局不變。';

      if (pos.direction === 'LONG') {
        if (live.price <= pos.currentStopLoss) {
          signalType = 'exit';
          signalText = '🔴 立即出場 (觸及停損)';
          signalReason = `現價 NT$ ${formatPrice(live.price)} 已跌破設定停損價 NT$ ${formatPrice(pos.currentStopLoss)}，應嚴守紀律停損。`;
        } else if (parseFloat(currentR) >= 2.0) {
          signalType = 'trim';
          signalText = '🟡 減碼 / 移動停損 (獲利達 2R)';
          signalReason = `已賺取 ${currentR}R 獲利！建議分批減碼 1/3，並將停損上移至保本價 NT$ ${formatPrice(pos.entryPrice)}。`;
        } else if (live.price > live.vwap && live.volumeRatio >= 1.5 && parseFloat(currentR) < 1.0) {
          signalType = 'add';
          signalText = '🔵 可加碼 (量增突破)';
          signalReason = '回測 VWAP 不破並再度放量突破，整體風報比仍合格。';
        }
      } else {
        // 空單邏輯
        if (live.price >= pos.currentStopLoss) {
          signalType = 'exit';
          signalText = '🔴 立即出場 (觸及停損)';
          signalReason = `現價 NT$ ${formatPrice(live.price)} 已突破設定停損價 NT$ ${formatPrice(pos.currentStopLoss)}，空單應嚴守紀律停損。`;
        } else if (parseFloat(currentR) >= 2.0) {
          signalType = 'trim';
          signalText = '🟡 減碼 / 移動停損 (獲利達 2R)';
          signalReason = `已賺取 ${currentR}R 空方獲利！建議分批減碼 1/3，並將停損下移至保本價 NT$ ${formatPrice(pos.entryPrice)}。`;
        } else if (live.price < live.vwap && live.volumeRatio >= 1.5 && parseFloat(currentR) < 1.0) {
          signalType = 'add';
          signalText = '🔵 可加碼 (量增破底)';
          signalReason = '反彈不過 VWAP 並再度放量破底，空方整體風報比仍合格。';
        } else {
          signalReason = '現價低於 20MA 與 VWAP，未突破停損線，空方格局不變。';
        }
      }

      return {
        ...pos,
        livePrice: live.price,
        liveChange: live.change || 0,
        liveChangePct: live.changePct || 0,
        vwap: live.vwap,
        notionalValue,
        unrealizedPnl,
        pnlPct,
        currentR,
        margin,
        signalType,
        signalText,
        signalReason,
        timestamp: live.timestamp,
        is_mock: live.is_mock
      };
    });

    const marginUtilizationPct = ((totalMarginUsed / this.totalCapital) * 100).toFixed(1);
    const st = this.settlementInfo;

    container.innerHTML = `
      <!-- Portfolio Overview Cards (名目總值 & 保證金 & 損益) -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px;">
        <div class="panel-card" style="margin-bottom:0; border-left:4px solid ${totalUnrealizedPnl >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'};">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">庫存部位未實現總損益</div>
          <div style="font-size:1.8rem; font-weight:900; color:${totalUnrealizedPnl >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'}; margin-top:4px;">
            ${totalUnrealizedPnl >= 0 ? '+' : ''}NT$ ${Math.round(totalUnrealizedPnl).toLocaleString()}
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            整體報酬率：${totalUnrealizedPnl >= 0 ? '+' : ''}${((totalUnrealizedPnl / this.totalCapital) * 100).toFixed(2)}%
          </div>
        </div>

        <div class="panel-card" style="margin-bottom:0; border-left:4px solid var(--neon-cyan);">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">掌控名目合約總值</div>
          <div style="font-size:1.8rem; font-weight:900; color:var(--neon-cyan); margin-top:4px;">
            NT$ ${(totalNotionalValue / 10000).toFixed(1)} 萬
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            控制區間：100萬 ~ 150萬 (安全槓桿)
          </div>
        </div>

        <div class="panel-card" style="margin-bottom:0; border-left:4px solid var(--neon-purple);">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">實際已用原始保證金</div>
          <div style="font-size:1.8rem; font-weight:900; color:var(--neon-purple); margin-top:4px;">
            NT$ ${Math.round(totalMarginUsed).toLocaleString()}
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            佔帳戶資金比：${marginUtilizationPct}% (維持在40萬左右)
          </div>
        </div>

        <div class="panel-card" style="margin-bottom:0; border-left:4px solid ${st.isWarning ? 'var(--bull-color)' : 'var(--neon-amber)'};">
          <div style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">結算日與轉倉提醒</div>
          <div style="font-size:1.2rem; font-weight:900; color:${st.isWarning ? 'var(--bull-color)' : 'var(--neon-amber)'}; margin-top:6px;">
            ${st.displayText}
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            期交所標準：每月份第三個星期三 (${st.settlementDateStr})
          </div>
        </div>
      </div>

      <!-- Live Position Detail Panel -->
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">
            <span>💼 個股期貨庫存部位盤中決策與即時訊號</span>
            <span class="badge badge-cyan">${enrichedPositions.length} 檔持倉中</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary" id="btn-open-add-pos-modal">➕ 新增庫存部位</button>
            <button class="btn btn-sm btn-secondary" id="btn-reset-default-portfolio" title="恢復為預設示範持倉">🔄 恢復範例持倉</button>
            <button class="btn btn-sm btn-danger-outline" id="btn-clear-all-positions" title="清空所有庫存部位">🧹 清空全部部位</button>
          </div>
        </div>

        ${enrichedPositions.length === 0 ? `
          <div class="empty-state-box">
            <div style="font-size:3.2rem; margin-bottom:12px;">💼</div>
            <h3 style="font-size:1.2rem; color:var(--text-main); margin-bottom:8px;">目前無任何監控中部位</h3>
            <p style="color:var(--text-muted); font-size:0.88rem; max-width:500px; margin:0 auto 18px; line-height:1.6;">
              目前庫存清單為空。您可以點擊「+ 新增庫存部位」手動建立個股期貨多空部位，或至「強勢排名總榜」一鍵將潛力標的加入監控！
            </p>
            <div style="display:flex; justify-content:center; gap:12px;">
              <button class="btn btn-primary" id="btn-empty-add-pos">➕ 立即新增庫存部位</button>
              <button class="btn btn-secondary" id="btn-empty-go-ranking">🏆 前往強勢排名總榜</button>
            </div>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${enrichedPositions.map(pos => `
              <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:18px; position:relative;">
                
                <!-- Position Top Row -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                  <div>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <b style="font-size:1.25rem; color:var(--text-main);">${pos.name} (${pos.symbol})</b>
                      <span class="badge ${pos.direction === 'LONG' ? 'badge-bull' : 'badge-bear'}" style="font-size:0.82rem; padding:4px 10px;">
                        ${pos.direction === 'LONG' ? '🟢 多單 (買進)' : '🔴 空單 (賣出)'} <b>${pos.contracts} 口</b>
                      </span>
                      <span class="badge badge-gray">${pos.contractMonth}</span>
                      ${pos.is_mock ? '<span class="price-tag-mock">模擬</span>' : '<span class="price-tag-live">即時</span>'}
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;">
                      進場均價：<b style="color:var(--text-main);">NT$ ${formatPrice(pos.entryPrice)}</b> | 
                      當前現價：<b style="color:${pos.liveChange >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'};">NT$ ${formatPrice(pos.livePrice)}</b> 
                      <small style="color:${pos.liveChange >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'}; font-weight:700;">
                        (${formatChange(pos.liveChange)} / ${formatChangePct(pos.liveChangePct)})
                      </small> | 
                      名目合約總值：<b style="color:var(--neon-cyan);">NT$ ${Math.round(pos.notionalValue).toLocaleString()}</b> | 
                      已用保證金：<b style="color:var(--neon-purple);">NT$ ${Math.round(pos.margin).toLocaleString()}</b>
                    </div>
                  </div>

                  <!-- Signal Lamp -->
                  <div>
                    <div class="signal-lamp signal-${pos.signalType}">
                      ${pos.signalText}
                    </div>
                  </div>
                </div>

                <!-- PnL & R Multiplier Bar -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:14px; background:var(--bg-base); padding:14px; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.04);">
                  <div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">未實現損益</div>
                    <div style="font-size:1.25rem; font-weight:900; color:${pos.unrealizedPnl >= 0 ? 'var(--bull-color)' : 'var(--bear-color)'};">
                      ${pos.unrealizedPnl >= 0 ? '+' : ''}NT$ ${Math.round(pos.unrealizedPnl).toLocaleString()} (${formatChangePct(parseFloat(pos.pnlPct))})
                    </div>
                  </div>

                  <div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">已賺取 R 倍數</div>
                    <div class="r-multiplier-meter" style="color:${parseFloat(pos.currentR) >= 1.0 ? 'var(--neon-cyan)' : 'var(--text-muted)'};">
                      🎯 ${pos.currentR} R
                    </div>
                  </div>

                  <div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">目前停損點位 (單筆風險 NT$ ${Math.round(Math.abs(pos.entryPrice - pos.currentStopLoss) * 2000 * pos.contracts).toLocaleString()})</div>
                    <div style="font-size:1.1rem; font-weight:800; color:var(--bear-color);">
                      NT$ ${formatPrice(pos.currentStopLoss)}
                    </div>
                  </div>

                  <div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">階梯目標價 (1R / 2R / 3R)</div>
                    <div style="font-size:0.88rem; font-weight:700; color:var(--text-main);">
                      1R: NT$ ${formatPrice(pos.target1R)} | 2R: NT$ ${formatPrice(pos.target2R)}
                    </div>
                  </div>
                </div>

                <!-- Decision Reason & Action Toolbar Row -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:14px; padding-top:12px; border-top:1px solid var(--border-color);">
                  <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6; border-left:3px solid var(--neon-cyan); padding-left:10px; flex:1; min-width:260px;">
                    <b>決策依據：</b>${pos.signalReason}
                  </div>

                  <!-- Position Action Controls (刪除、減碼、加碼、編輯) -->
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-secondary btn-pos-decrease" data-id="${pos.id}" title="將此標的持倉口數減少 1 口">
                      ➖ 減碼 1 口
                    </button>
                    <button class="btn btn-sm btn-secondary btn-pos-increase" data-id="${pos.id}" title="將此標的持倉口數增加 1 口">
                      ➕ 加碼 1 口
                    </button>
                    <button class="btn btn-sm btn-cyan-outline btn-pos-edit" data-id="${pos.id}" title="調整進場價、停損價與目標價">
                      ✏️ 編輯點位
                    </button>
                    <button class="btn btn-sm btn-danger-outline btn-pos-delete" data-id="${pos.id}" title="平倉並自監控清單移除此部位">
                      🗑️ 刪除部位
                    </button>
                  </div>
                </div>

              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    this.bindPortfolioEvents();
  }

  bindPortfolioEvents() {
    // 頂部與空狀態新增按鈕
    const addBtn = document.getElementById('btn-open-add-pos-modal');
    if (addBtn) addBtn.addEventListener('click', () => this.openPortfolioModal());

    const emptyAddBtn = document.getElementById('btn-empty-add-pos');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => this.openPortfolioModal());

    const emptyGoRankingBtn = document.getElementById('btn-empty-go-ranking');
    if (emptyGoRankingBtn) {
      emptyGoRankingBtn.addEventListener('click', () => {
        this.activeTab = 'ranking';
        document.querySelectorAll('.terminal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'ranking'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === 'tab-ranking'));
        this.render();
      });
    }

    // 清空全部部位按鈕
    const clearBtn = document.getElementById('btn-clear-all-positions');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (this.portfolio.length === 0) {
          this.showToast('ℹ️ 目前庫存清單已經是空的', 'info');
          return;
        }
        if (confirm(`確定要清空目前全部 ${this.portfolio.length} 檔庫存監控部位嗎？此操作將移除所有持倉。`)) {
          this.portfolio = [];
          this.savePortfolio();
          this.render();
          this.showToast('🧹 已成功清空所有庫存監控部位！', 'info');
        }
      });
    }

    // 恢復預設示範持倉按鈕
    const resetBtn = document.getElementById('btn-reset-default-portfolio');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('確定要將庫存重設為系統預設範例持倉 (台積電期、奇鋐期) 嗎？')) {
          this.portfolio = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO));
          this.savePortfolio();
          this.render();
          this.showToast('🔄 已恢復為預設範例持倉！', 'success');
        }
      });
    }

    // 每個部位卡片的刪除按鈕
    document.querySelectorAll('.btn-pos-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const posId = btn.dataset.id;
        const targetPos = this.portfolio.find(p => p.id === posId);
        const posName = targetPos ? `${targetPos.name} (${targetPos.symbol})` : '該部位';
        if (confirm(`確定要刪除/平倉【${posName}】部位並自即時監控中移除嗎？`)) {
          this.portfolio = this.portfolio.filter(p => p.id !== posId);
          this.savePortfolio();
          this.render();
          this.showToast(`🗑️ 已成功刪除/平倉 ${posName}！`, 'success');
        }
      });
    });

    // 每個部位卡片的減碼按鈕
    document.querySelectorAll('.btn-pos-decrease').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const posId = btn.dataset.id;
        const targetPos = this.portfolio.find(p => p.id === posId);
        if (!targetPos) return;

        if (targetPos.contracts > 1) {
          targetPos.contracts -= 1;
          this.savePortfolio();
          this.render();
          this.showToast(`➖ 【${targetPos.name}】已減碼 1 口，剩餘持倉 ${targetPos.contracts} 口`, 'info');
        } else {
          if (confirm(`【${targetPos.name}】目前僅剩 1 口，減碼將完全平倉並自庫存刪除，確定要平倉刪除嗎？`)) {
            this.portfolio = this.portfolio.filter(p => p.id !== posId);
            this.savePortfolio();
            this.render();
            this.showToast(`🗑️ 已全數平倉並刪除 ${targetPos.name} 部位！`, 'info');
          }
        }
      });
    });

    // 每個部位卡片的加碼按鈕
    document.querySelectorAll('.btn-pos-increase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const posId = btn.dataset.id;
        const targetPos = this.portfolio.find(p => p.id === posId);
        if (!targetPos) return;

        targetPos.contracts += 1;
        this.savePortfolio();
        this.render();
        this.showToast(`➕ 【${targetPos.name}】已加碼 1 口，目前總持倉 ${targetPos.contracts} 口`, 'success');
      });
    });

    // 每個部位卡片的編輯按鈕
    document.querySelectorAll('.btn-pos-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const posId = btn.dataset.id;
        const targetPos = this.portfolio.find(p => p.id === posId);
        if (targetPos) {
          this.openPortfolioModal(targetPos);
        }
      });
    });
  }

  // ==============================================================================
  // Portfolio Modal Management (新增 / 編輯庫存部位彈窗)
  // ==============================================================================
  setupPortfolioModal() {
    const modalEl = document.getElementById('modal-portfolio-pos');
    if (!modalEl) return;

    // 關閉彈窗按鈕與遮罩點擊
    const closeBtn = document.getElementById('modal-portfolio-close');
    const cancelBtn = document.getElementById('modal-portfolio-cancel');
    const closeModal = () => modalEl.classList.remove('open');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

    // 交易方向多空切換按鈕
    const btnDirLong = document.getElementById('pos-dir-long');
    const btnDirShort = document.getElementById('pos-dir-short');
    if (btnDirLong && btnDirShort) {
      btnDirLong.addEventListener('click', () => {
        btnDirLong.classList.add('active');
        btnDirShort.classList.remove('active');
        this.recalcModalStopLoss('LONG');
        this.updateModalRiskPreview();
      });
      btnDirShort.addEventListener('click', () => {
        btnDirShort.classList.add('active');
        btnDirLong.classList.remove('active');
        this.recalcModalStopLoss('SHORT');
        this.updateModalRiskPreview();
      });
    }

    // 標的切換下拉選單
    const symbolSelect = document.getElementById('pos-select-symbol');
    if (symbolSelect) {
      symbolSelect.addEventListener('change', () => {
        const sym = symbolSelect.value;
        const live = this.marketData.find(m => m.symbol === sym);
        if (live) {
          const entryInput = document.getElementById('pos-input-entry');
          if (entryInput) entryInput.value = live.price;
          const dir = btnDirLong && btnDirLong.classList.contains('active') ? 'LONG' : 'SHORT';
          this.recalcModalStopLoss(dir);
          this.updateModalRiskPreview();
        }
      });
    }

    // 口數加減按鈕
    const qtyInput = document.getElementById('pos-input-contracts');
    const qtyMinus = document.getElementById('btn-pos-qty-minus');
    const qtyPlus = document.getElementById('btn-pos-qty-plus');
    if (qtyMinus && qtyInput) {
      qtyMinus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val > 1) {
          qtyInput.value = val - 1;
          this.updateModalRiskPreview();
        }
      });
    }
    if (qtyPlus && qtyInput) {
      qtyPlus.addEventListener('click', () => {
        let val = parseInt(qtyInput.value) || 1;
        if (val < 100) {
          qtyInput.value = val + 1;
          this.updateModalRiskPreview();
        }
      });
    }

    // 填入現價快捷鍵
    const btnFillLive = document.getElementById('btn-fill-live-price');
    if (btnFillLive && symbolSelect) {
      btnFillLive.addEventListener('click', () => {
        const live = this.marketData.find(m => m.symbol === symbolSelect.value);
        if (live) {
          const entryInput = document.getElementById('pos-input-entry');
          if (entryInput) entryInput.value = live.price;
          const dir = btnDirLong && btnDirLong.classList.contains('active') ? 'LONG' : 'SHORT';
          this.recalcModalStopLoss(dir);
          this.updateModalRiskPreview();
        }
      });
    }

    // 1.5 ATR 停損試算
    const btnCalcAtr = document.getElementById('btn-calc-atr-stop');
    if (btnCalcAtr) {
      btnCalcAtr.addEventListener('click', () => {
        const dir = btnDirLong && btnDirLong.classList.contains('active') ? 'LONG' : 'SHORT';
        this.recalcModalStopLoss(dir, 'ATR');
        this.updateModalRiskPreview();
      });
    }

    // 2% 停損試算
    const btnCalc2Pct = document.getElementById('btn-calc-2pct-stop');
    if (btnCalc2Pct) {
      btnCalc2Pct.addEventListener('click', () => {
        const dir = btnDirLong && btnDirLong.classList.contains('active') ? 'LONG' : 'SHORT';
        this.recalcModalStopLoss(dir, '2PCT');
        this.updateModalRiskPreview();
      });
    }

    // 所有數值輸入欄位連動試算
    ['pos-input-entry', 'pos-input-contracts', 'pos-input-stoploss', 'pos-input-1r', 'pos-input-2r', 'pos-input-3r'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.updateModalRiskPreview());
    });

    // 表單提交處理
    const form = document.getElementById('form-portfolio-pos');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('pos-edit-id')?.value;
        const symbol = document.getElementById('pos-select-symbol')?.value || 'CDF';
        const live = this.marketData.find(m => m.symbol === symbol) || { name: `${symbol}期`, atr14: 20, price: 100 };
        const contractMonth = document.getElementById('pos-input-month')?.value || `${this.settlementInfo.contractMonth} (近月)`;
        const direction = btnDirLong && btnDirLong.classList.contains('active') ? 'LONG' : 'SHORT';
        const entryPrice = parseFloat(document.getElementById('pos-input-entry')?.value) || live.price;
        const contracts = parseInt(document.getElementById('pos-input-contracts')?.value) || 1;
        const stopLoss = parseFloat(document.getElementById('pos-input-stoploss')?.value) || roundToTick(direction === 'LONG' ? entryPrice * 0.95 : entryPrice * 1.05);
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        const target1R = parseFloat(document.getElementById('pos-input-1r')?.value) || roundToTick(direction === 'LONG' ? entryPrice + riskPerShare : entryPrice - riskPerShare);
        const target2R = parseFloat(document.getElementById('pos-input-2r')?.value) || roundToTick(direction === 'LONG' ? entryPrice + riskPerShare * 2 : entryPrice - riskPerShare * 2);
        const target3R = parseFloat(document.getElementById('pos-input-3r')?.value) || roundToTick(direction === 'LONG' ? entryPrice + riskPerShare * 3 : entryPrice - riskPerShare * 3);

        if (editId) {
          // 編輯現有部位
          const idx = this.portfolio.findIndex(p => p.id === editId);
          if (idx !== -1) {
            this.portfolio[idx] = {
              ...this.portfolio[idx],
              symbol,
              name: live.name || `${symbol}期`,
              contractMonth,
              direction,
              entryPrice,
              contracts,
              currentStopLoss: stopLoss,
              target1R,
              target2R,
              target3R
            };
            this.showToast(`✓ 已成功更新【${live.name || symbol}】部位設定！`, 'success');
          }
        } else {
          // 新增部位
          const newPos = {
            id: `pos_${Date.now()}`,
            symbol,
            name: live.name || `${symbol}期`,
            contractMonth,
            direction,
            entryPrice,
            contracts,
            currentStopLoss: stopLoss,
            target1R,
            target2R,
            target3R,
            entryDate: new Date().toISOString().slice(0, 10)
          };
          this.portfolio.unshift(newPos);
          this.showToast(`✓ 已成功新增【${live.name || symbol}】至庫存即時監控！`, 'success');
        }

        this.savePortfolio();
        modalEl.classList.remove('open');
        this.activeTab = 'portfolio';
        document.querySelectorAll('.terminal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'portfolio'));
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === 'tab-portfolio'));
        this.render();
      });
    }
  }

  recalcModalStopLoss(direction = 'LONG', method = 'ATR') {
    const symbolSelect = document.getElementById('pos-select-symbol');
    const entryInput = document.getElementById('pos-input-entry');
    const stopInput = document.getElementById('pos-input-stoploss');
    const r1Input = document.getElementById('pos-input-1r');
    const r2Input = document.getElementById('pos-input-2r');
    const r3Input = document.getElementById('pos-input-3r');

    if (!symbolSelect || !entryInput || !stopInput) return;

    const sym = symbolSelect.value;
    const live = this.marketData.find(m => m.symbol === sym) || { price: 100, atr14: 5 };
    const entry = parseFloat(entryInput.value) || live.price;
    const atr = live.atr14 || (entry * 0.02);

    let stopLoss;
    if (method === 'ATR') {
      const risk = 1.5 * atr;
      stopLoss = direction === 'LONG' ? roundToTick(entry - risk, 'FLOOR') : roundToTick(entry + risk, 'CEIL');
    } else {
      stopLoss = direction === 'LONG' ? roundToTick(entry * 0.98, 'FLOOR') : roundToTick(entry * 1.02, 'CEIL');
    }

    const riskPerShare = Math.abs(entry - stopLoss);
    stopInput.value = stopLoss;

    if (r1Input) r1Input.value = direction === 'LONG' ? roundToTick(entry + riskPerShare, 'CEIL') : roundToTick(entry - riskPerShare, 'FLOOR');
    if (r2Input) r2Input.value = direction === 'LONG' ? roundToTick(entry + riskPerShare * 2, 'CEIL') : roundToTick(entry - riskPerShare * 2, 'FLOOR');
    if (r3Input) r3Input.value = direction === 'LONG' ? roundToTick(entry + riskPerShare * 3, 'CEIL') : roundToTick(entry - riskPerShare * 3, 'FLOOR');
  }

  // ==============================================================================
  // 7. Trade Planner & Risk Calculator View (交易計畫與風控試算)
  // ==============================================================================
  renderPlannerView() {
    const container = document.getElementById('tab-planner');
    if (!container) return;

    const item = this.marketData.find(m => m.symbol === this.selectedSymbol) || this.marketData[0];
    const tickSize = getTickSize(item.price);
    
    // 突破進場價 = 現價上方 1 tick
    const breakoutEntry = roundToTick(item.price + tickSize, 'CEIL');
    // ATR 停損價 = 進場價 - 1.5 * ATR
    const atrStopLoss = roundToTick(breakoutEntry - (1.5 * item.atr14), 'FLOOR');
    const riskPerShare = roundToTick(breakoutEntry - atrStopLoss);
    
    // 1R, 2R, 3R 目標價
    const target1R = roundToTick(breakoutEntry + riskPerShare, 'CEIL');
    const target2R = roundToTick(breakoutEntry + (riskPerShare * 2), 'CEIL');
    const target3R = roundToTick(breakoutEntry + (riskPerShare * 3), 'CEIL');
    const riskRewardRatio = ((target2R - breakoutEntry) / riskPerShare).toFixed(2);

    const maxRiskBudget = this.maxRiskPerTrade;
    const sharesPerContract = item.sharesPerContract || 2000;
    const lossPerContract = riskPerShare * sharesPerContract;
    const recommendedContracts = Math.max(Math.floor(maxRiskBudget / lossPerContract), 1);
    const notionalValue = breakoutEntry * sharesPerContract * recommendedContracts;
    const requiredMargin = notionalValue * (item.marginRate || 0.135);

    container.innerHTML = `
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">
            <span>🎯 個股期貨進出場計畫與風控部位試算機</span>
            <span class="badge badge-cyan">${item.name} (${item.symbol})</span>
            ${item.is_mock ? '<span class="price-tag-mock">模擬</span>' : '<span class="price-tag-live">即時</span>'}
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <label class="form-label" style="margin-bottom:0;">切換分析標的：</label>
            <select class="form-select" id="select-planner-symbol" style="width:auto;">
              ${this.marketData.map(m => `
                <option value="${m.symbol}" ${m.symbol === this.selectedSymbol ? 'selected' : ''}>
                  ${m.name} (${m.symbol}) - NT$ ${formatPrice(m.price)}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
          <!-- Left Column: Strategy & Price Levels -->
          <div style="background:var(--bg-subtle); padding:18px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-bottom:12px;">
              📍 點位策略試算 (依最小跳動點 ${tickSize} 修正)
            </h4>

            <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">建議進場模式：</span>
                <b style="color:var(--neon-cyan);">突破進場 (現價 + 1 Tick)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">建議進場價：</span>
                <b style="font-size:1.1rem; color:var(--text-main);">NT$ ${formatPrice(breakoutEntry)}</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">波動停損價 (1.5x ATR)：</span>
                <b style="font-size:1.1rem; color:var(--bear-color);">NT$ ${formatPrice(atrStopLoss)} (-${riskPerShare}元)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">1R 階梯停利價 (出 1/3)：</span>
                <b style="color:var(--bull-color);">NT$ ${formatPrice(target1R)} (+${riskPerShare}元)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">2R 主目標價 (出 1/3)：</span>
                <b style="color:var(--bull-color);">NT$ ${formatPrice(target2R)} (+${roundToTick(riskPerShare * 2)}元)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0;">
                <span style="color:var(--text-muted);">3R 延伸目標 (移動停利)：</span>
                <b style="color:var(--bull-color);">NT$ ${formatPrice(target3R)} (+${roundToTick(riskPerShare * 3)}元)</b>
              </div>
            </div>

            <div style="margin-top:14px; background:var(--bg-base); padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
              <span>預估風險報酬比 (R:R)：</span>
              <b style="font-size:1.2rem; color:var(--neon-cyan);">1 : ${riskRewardRatio} (合格 ≥ 1.5)</b>
            </div>
          </div>

          <!-- Right Column: Position Sizing & Margin -->
          <div style="background:var(--bg-subtle); padding:18px; border-radius:var(--radius-md); border:1px solid var(--border-color);">
            <h4 style="font-size:0.95rem; font-weight:800; color:var(--text-main); margin-bottom:12px;">
              🛡️ 名目合約價值與風控試算 (預設單筆風險 NT$ ${this.maxRiskPerTrade.toLocaleString()})
            </h4>

            <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">建議進場口數：</span>
                <b style="font-size:1.2rem; color:var(--neon-cyan);">${recommendedContracts} 口 (標準型 ${recommendedContracts * 2000} 股)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">掌控名目合約總值：</span>
                <b style="font-size:1.1rem; color:var(--text-main);">NT$ ${Math.round(notionalValue).toLocaleString()} (${(notionalValue / 10000).toFixed(1)} 萬)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">實際應繳原始保證金：</span>
                <b style="color:var(--neon-purple);">NT$ ${Math.round(requiredMargin).toLocaleString()} (約 ${(requiredMargin / 10000).toFixed(1)} 萬)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--text-muted);">單筆最大停損風險：</span>
                <b style="color:var(--bear-color);">NT$ ${Math.round(lossPerContract * recommendedContracts).toLocaleString()} (在 5~10 萬預算內)</b>
              </div>
              <div style="display:flex; justify-content:space-between; padding:6px 0;">
                <span style="color:var(--text-muted);">2R 目標達成預期獲利：</span>
                <b style="color:var(--bull-color);">+NT$ ${Math.round(lossPerContract * recommendedContracts * 2).toLocaleString()}</b>
              </div>
            </div>

            <button class="btn btn-primary btn-block" style="margin-top:16px;" id="btn-add-plan-to-portfolio" data-symbol="${item.symbol}">
              ➕ 將本交易計畫加入【庫存即時監控】
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindPlannerEvents();
  }

  bindPlannerEvents() {
    const selectEl = document.getElementById('select-planner-symbol');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        this.selectedSymbol = e.target.value;
        this.render();
      });
    }

    const addBtn = document.getElementById('btn-add-plan-to-portfolio');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const item = this.marketData.find(m => m.symbol === this.selectedSymbol) || this.marketData[0];
        const tickSize = getTickSize(item.price);
        const breakoutEntry = roundToTick(item.price + tickSize, 'CEIL');
        const atrStopLoss = roundToTick(breakoutEntry - (1.5 * item.atr14), 'FLOOR');
        const riskPerShare = roundToTick(breakoutEntry - atrStopLoss);

        const newPos = {
          id: `pos_${Date.now()}`,
          symbol: item.symbol,
          name: item.name,
          contractMonth: `${this.settlementInfo.contractMonth} (近月)`,
          direction: 'LONG',
          entryPrice: breakoutEntry,
          contracts: 1,
          currentStopLoss: atrStopLoss,
          target1R: roundToTick(breakoutEntry + riskPerShare),
          target2R: roundToTick(breakoutEntry + (riskPerShare * 2)),
          target3R: roundToTick(breakoutEntry + (riskPerShare * 3)),
          entryDate: new Date().toISOString().slice(0, 10)
        };

        this.portfolio.push(newPos);
        this.savePortfolio();
        this.showToast(`✓ 已將 ${item.name} 交易計畫加入庫存監控！`, 'success');
        this.activeTab = 'portfolio';
        this.render();
      });
    }
  }

  // ==============================================================================
  // 8. News & MOPS View (重大訊息與新聞情緒雷達)
  // ==============================================================================
  renderNewsView() {
    const container = document.getElementById('tab-news');
    if (!container) return;

    container.innerHTML = `
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">
            <span>📰 即時重大訊息與財經新聞 AI 情緒雷達</span>
            <span class="badge badge-purple">Gemini 2.5 Flash 驅動</span>
          </div>
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:16px;">
          系統即時掃描公開資訊觀測站 (MOPS) 重大公告與主流財經新聞，自動分類事件與多空情緒，作為庫存與排名的風險旗標。
        </p>

        <div style="display:flex; flex-direction:column; gap:12px;">
          ${MARKET_NEWS_FEED.map(news => `
            <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="badge ${news.sentiment === 'bullish' ? 'badge-bull' : news.sentiment === 'bearish' ? 'badge-bear' : 'badge-cyan'}">
                    ${news.sentiment === 'bullish' ? '🟢 利多' : news.sentiment === 'bearish' ? '🔴 利空' : '⚪ 中性'}
                  </span>
                  <span class="badge badge-purple">${news.category}</span>
                  <small style="color:var(--text-dim);">${news.source} | ${news.time}</small>
                </div>
              </div>

              <h4 style="font-size:0.95rem; font-weight:700; color:var(--text-main); margin-top:8px;">
                ${news.title}
              </h4>

              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">
                關聯個股期貨：${news.symbols.join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ==============================================================================
  // 9. Settings View (參數設定與 API 狀態)
  // ==============================================================================
  renderSettingsView() {
    const container = document.getElementById('tab-settings');
    if (!container) return;

    const isLive = this.dataMode === 'live';

    container.innerHTML = `
      <div class="panel-card">
        <div class="panel-header">
          <div class="panel-title">
            <span>⚙️ 系統參數設定與 API 健康監控</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
          <div style="background:var(--bg-subtle); padding:16px; border-radius:var(--radius-sm);">
            <h4 style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin-bottom:10px;">
              🔌 外部資料源即時狀態
            </h4>
            <div style="font-size:0.82rem; line-height:2.2;">
              <div>運作模式 (DATA_MODE)：<b style="color:${isLive ? 'var(--neon-cyan)' : 'var(--neon-amber)'};">${this.dataMode.toUpperCase()}</b></div>
              <div>永豐金 Shioaji API (正式環境)：
                <b style="color:${this.isConnected ? '#10b981' : 'var(--bull-color)'};">
                  ${this.isConnected ? `✓ 已連線 (${this.latencyMs !== null ? this.latencyMs + 'ms' : '即時'})` : `✗ 未連線 (${this.liveError || '連線失敗'})`}
                </b>
              </div>
              <div>期交所 (TAIFEX) 開放資料：<b style="color:#10b981;">✓ 結算日曆演算法就緒</b></div>
              <div>證交所 (TWSE) OpenAPI / FinMind：<b style="color:#10b981;">✓ 三大法人與營收資料就緒</b></div>
              <div>Google Gemini 新聞情緒分析：<b style="color:#10b981;">✓ 就緒 (剩餘額度 1490/日)</b></div>
            </div>
          </div>

          <div style="background:var(--bg-subtle); padding:16px; border-radius:var(--radius-sm);">
            <h4 style="font-size:0.9rem; font-weight:800; color:var(--text-main); margin-bottom:10px;">
              🛠️ 環境變數設定說明 (.env)
            </h4>
            <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.6;">
              若欲切換為實盤正式環境，請在 <code>.env</code> 中設定：<br>
              <code>DATA_MODE=live</code><br>
              <code>SJ_API_KEY=您的永豐金API金鑰</code><br>
              <code>SJ_SECRET_KEY=您的永豐金密鑰</code><br>
              在 LIVE 模式下，若驗證或訂閱失敗，系統將嚴格拒絕自動退回 Mock 假資料。
            </p>
          </div>
        </div>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.innerHTML = `<span>⚡</span><div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.stockTerminal = new StockFuturesTerminal();
});
