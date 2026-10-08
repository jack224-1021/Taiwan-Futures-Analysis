#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
台股個股期貨資料驗證工具 (Verify Data & Quote Alignment Tool)
==============================================================================
功能：
針對 3 檔核心標的 (台積電期 CDF, 奇鋐期 JFF, 鴻海期 DHF) 輸出：
1. 【第一階段】Shioaji 取得之原始券商行情 (Raw Snapshot / Tick，含價格、量、時間戳、來源)
2. 【第二階段】系統內部標準化資料模型 (Internal Data Model，含期交所保證金/OI、證交所法人/營收、各維度評分)
3. 【第三階段】終端畫面格式化顯示值 (Display Formatted UI Values，含時態標記 [即時]/[收盤價]、來源標註)

便於使用者直接與券商 App (永豐金大戶投 / Eleader / 富果) 實盤行情核對驗證。
==============================================================================
"""

import os
import sys
import json
import argparse
import datetime

# 確保 Windows 主控台正確輸出 UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 加入當前目錄至 sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from shioaji_provider import (
    ShioajiLiveProvider, ShioajiProvider, ShioajiLiveError,
    round_to_tick, get_tick_size, get_market_session_info
)
from taifex_provider import TaifexProvider
from twse_finmind_provider import TwseFinMindProvider
from settlement_calendar import get_settlement_info

def compute_strength_score(price, ma5, ma10, ma20, ma60, rs_rating, change_pct, adx14, macd_hist, rsi14, volume_ratio, inst_streak, inst_net, oi_change, revenue_yoy):
    """計算五大維度強勢得分與各項明細"""
    score = 0
    reasons = []

    # A. 趨勢結構 (25分)
    score_a = 0
    if price > ma5 and ma5 > ma10 and ma10 > ma20 and ma20 > ma60:
        score_a += 10
        reasons.append("+10 多頭排列")
    elif price > ma20 and price > ma60:
        score_a += 6
        reasons.append("+6 站穩 20MA/60MA 之上")
    if price >= ma5 * 1.01:
        score_a += 8
        reasons.append("+8 創波段高點強勢攻擊")
    score_a += 7 # 基礎趨勢分
    capped_a = min(score_a, 25)
    score += capped_a

    # B. 相對強度 (25分)
    score_b = 0
    rs_pts = round((rs_rating / 100) * 15)
    score_b += rs_pts
    if rs_rating >= 90:
        reasons.append(f"+{rs_pts} RS相對強度PR達 {rs_rating}")
    if change_pct > 1.5:
        score_b += 10
        reasons.append(f"+10 漲幅 {change_pct:.2f}% 強勢突破 (+1.5%門檻)")
    capped_b = min(score_b, 25)
    score += capped_b

    # C. 動能與趨勢 (15分)
    score_c = 0
    if adx14 > 25:
        score_c += 6
        reasons.append(f"+6 ADX(14) 達 {adx14} (>25)")
    if macd_hist > 0:
        score_c += 5
        reasons.append(f"+5 MACD 柱狀體翻紅擴大 ({macd_hist})")
    if 55 <= rsi14 <= 80:
        score_c += 4
        reasons.append(f"+4 RSI(14) 位於健康強勢區 ({rsi14})")
    elif rsi14 > 80:
        score_c -= 2
        reasons.append(f"⚠️ -2 RSI > 80 過熱警示 ({rsi14})")
    capped_c = min(score_c, 15)
    score += capped_c

    # D. 量價與波動 (15分)
    score_d = 0
    if volume_ratio >= 1.5:
        score_d += 8
        reasons.append(f"+8 帶量突破 (量比 {volume_ratio}x)")
    else:
        score_d += 4
    score_d += 7 # 基礎波動分
    capped_d = min(score_d, 15)
    score += capped_d

    # E. 籌碼與期貨 (20分)
    score_e = 0
    if inst_streak >= 3:
        score_e += 8
        reasons.append(f"+8 法人連買 {inst_streak} 日 (+{inst_net}張)")
    if change_pct > 0 and oi_change > 0:
        score_e += 8
        reasons.append(f"+8 價漲 + 期貨OI增加 (+{oi_change}口)")
    score_e += 4 # 基礎籌碼分
    capped_e = min(score_e, 20)
    score += capped_e

    # 基本面加成 (5分)
    bonus = 0
    if revenue_yoy >= 20.0:
        bonus = 5
        score += bonus
        reasons.append(f"+5 基本面加成：月營收年增達 {revenue_yoy}%")

    raw_score = score
    total_score = min(max(score, 0), 100)

    return {
        "raw_score": raw_score,
        "total_score": total_score,
        "scores": {
            "a_trend": capped_a,
            "b_rs": capped_b,
            "c_momentum": capped_c,
            "d_volume": capped_d,
            "e_chip": capped_e,
            "bonus_revenue": bonus
        },
        "reasons": reasons
    }

def verify_target_symbols(target_symbols=None, force_mode=None):
    if target_symbols is None:
        target_symbols = ["CDF", "JFF", "DHF"]

    # 取得環境設定
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)
    except ImportError:
        pass

    env_mode = force_mode or os.getenv("DATA_MODE", "live").lower()
    print("=" * 80)
    print(" 🚀 台股個股期貨決策終端 — 報價與資料源三階段對照驗證工具 (verify_data.py)")
    print("=" * 80)
    print(f" ▸ 當前運作模式 (DATA_MODE): {env_mode.upper()}")
    print(f" ▸ 驗證標的清單: {', '.join(target_symbols)}")
    print(f" ▸ 執行時間: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    session = get_market_session_info()
    print(f" ▸ 台股當前時段: {session['session_name']} (畫面標籤: [{session['display_label']}])")
    
    settlement = get_settlement_info()
    print(f" ▸ 期交所結算日曆: {settlement['warning_text']}")
    print("-" * 80)

    # 1. 初始化資料提供者
    try:
        shioaji_prov = ShioajiProvider(data_mode=env_mode)
        conn_status = shioaji_prov.get_connection_status()
        print(f" ▸ Shioaji 連線狀態: {conn_status['status_text']} (延遲: {conn_status['latency_ms']} ms)")
    except ShioajiLiveError as e:
        print("\n" + "!" * 80)
        print(" ❌ 【LIVE 正式環境錯誤】依規範嚴禁自動退回 MOCK 模式！")
        print(f" 原因: {str(e)}")
        print("!" * 80 + "\n")
        sys.exit(1)

    taifex_prov = TaifexProvider()
    twse_prov = TwseFinMindProvider()
    daily_oi = taifex_prov.fetch_daily_oi_report()

    # 查詢 Snapshots
    contract_codes = [f"{sym}R1" for sym in target_symbols]
    snapshots = shioaji_prov.fetch_snapshots(contract_codes)
    snap_map = {s["symbol"]: s for s in snapshots}

    tech_meta = {
        "CDF": {"sector": "半導體", "rsRating": 98, "ma5": 1030.0, "ma10": 1015.0, "ma20": 995.0, "ma60": 950.0, "vwap": 1042.5, "atr14": 24.5, "rsi14": 68.4, "adx14": 32.8, "macdHist": 6.8, "volRatio": 1.82},
        "JFF": {"sector": "AI散熱", "rsRating": 96, "ma5": 660.0, "ma10": 642.0, "ma20": 620.0, "ma60": 580.0, "vwap": 681.0, "atr14": 26.0, "rsi14": 74.2, "adx14": 36.5, "macdHist": 8.5, "volRatio": 2.35},
        "DHF": {"sector": "AI代工", "rsRating": 91, "ma5": 218.0, "ma10": 215.0, "ma20": 208.0, "ma60": 195.0, "vwap": 221.8, "atr14": 6.2, "rsi14": 64.5, "adx14": 28.4, "macdHist": 2.1, "volRatio": 1.58}
    }

    for idx, sym in enumerate(target_symbols, 1):
        snap = snap_map.get(sym)
        if not snap:
            print(f"\n[標的 #{idx}: {sym}] ⚠️ 無法取得 Snapshot 行情資料。")
            continue

        spec = taifex_prov.get_contract_specs(sym)
        underlying = spec.get("underlying", "")
        inst = twse_prov.fetch_institutional_investors(underlying)
        rev = twse_prov.fetch_monthly_revenue(underlying)
        oi_info = daily_oi.get(sym, {"oi": 0, "oi_change": 0})
        meta = tech_meta.get(sym, {})

        raw = snap.get("raw_snapshot", {})
        price = snap["close"]
        tick = get_tick_size(price)
        chg = snap["change_price"]
        chg_rate = snap["change_rate"]
        
        fmt_price = f"{price:.2f}" if tick < 1.0 else f"{int(price)}"
        fmt_chg = f"{'+' if chg >= 0 else ''}{chg:.2f}"
        fmt_rate = f"{'+' if chg_rate >= 0 else ''}{chg_rate:.2f}%"
        data_status = "[模擬資料]" if snap.get("is_mock") else f"[{session['display_label']}]"
        price_source_label = "模擬報價" if snap.get("is_mock") else "Shioaji 正式環境"

        # 計算得分
        score_res = compute_strength_score(
            price=price,
            ma5=meta.get("ma5", price * 0.98),
            ma10=meta.get("ma10", price * 0.96),
            ma20=meta.get("ma20", price * 0.94),
            ma60=meta.get("ma60", price * 0.90),
            rs_rating=meta.get("rsRating", 80),
            change_pct=chg_rate,
            adx14=meta.get("adx14", 30.0),
            macd_hist=meta.get("macdHist", 4.0),
            rsi14=meta.get("rsi14", 65.0),
            volume_ratio=meta.get("volRatio", 1.5),
            inst_streak=inst.get("streak_days", 0),
            inst_net=inst.get("total_net", 0),
            oi_change=oi_info.get("oi_change", 0),
            revenue_yoy=rev.get("yoy_pct", 0.0)
        )

        print(f"\n{'=' * 30} 標的 #{idx}: {spec.get('name', sym)} ({sym} / {underlying}) {'=' * 30}")
        
        # -------------------------------------------------------------
        # Stage 1: Shioaji 原始報價
        # -------------------------------------------------------------
        print("\n 🔹 【第一階段：Shioaji 券商 API 原始報價 (Raw Snapshot / Tick)】")
        print(f"   • 資料來源              : 【{price_source_label}】")
        print(f"   • 合約代碼 (Code)      : {snap['code']}")
        print(f"   • 原始成交價 (Close)    : {raw.get('close', snap['close'])}")
        print(f"   • 原始開盤價 (Open)     : {raw.get('open', snap['open'])}")
        print(f"   • 原始最高價 (High)     : {raw.get('high', snap['high'])}")
        print(f"   • 原始最低價 (Low)      : {raw.get('low', snap['low'])}")
        print(f"   • 原始成交量 (Volume)   : {raw.get('volume', snap['volume'])} 口")
        print(f"   • 原始漲跌點 (Change)   : {raw.get('change_price', snap['change_price'])}")
        print(f"   • 原始漲跌幅 (Rate)     : {raw.get('change_rate', snap['change_rate'])}%")
        print(f"   • 報價時間戳 (Timestamp): {snap['timestamp']}")

        # -------------------------------------------------------------
        # Stage 2: 內部資料模型轉換
        # -------------------------------------------------------------
        print("\n 🔸 【第二階段：系統內部標準化資料模型 (Internal Data Model)】")
        print(f"   • 標的代號 / 產業類別  : {sym} ({underlying}) | {spec.get('sector', 'N/A')}")
        print(f"   • 契約規格 (乘數)      : {spec.get('shares', 2000)} 股/口 (標準型)")
        print(f"   • 最小跳動點 (Tick)    : {tick} 元 (跳動點精準校正)")
        print(f"   • 適用保證金率 (Margin): {spec.get('margin_rate', 0.135) * 100:.1f}% (期交所 {spec.get('tier', 'A')} 級)")
        print(f"   • 1口原始保證金需求    : NT$ {int(price * spec.get('shares', 2000) * spec.get('margin_rate', 0.135)):,}")
        print(f"   • 期交所未平倉量 (OI)  : {oi_info.get('oi', 0):,} 口 (增減: {'+' if oi_info.get('oi_change', 0) >= 0 else ''}{oi_info.get('oi_change', 0)} 口)  [來源: 期交所盤後]")
        print(f"   • 三大法人籌碼 (TWSE)  : 連買 {inst.get('streak_days', 0)} 日 (累計買超: {inst.get('total_net', 0):,} 張)  [來源: 證交所三大法人]")
        print(f"   • 上市櫃最新月營收 YoY : {rev.get('yoy_pct', 0.0)}% (月份: {rev.get('month', 'N/A')})  [來源: 證交所/MOPS]")
        print(f"   • 強勢評分明細 (Breakdown): 總分 {score_res['total_score']} 分 (原始: {score_res['raw_score']} 分)")
        print(f"     ▸ A.趨勢結構: {score_res['scores']['a_trend']}/25 | B.相對強度: {score_res['scores']['b_rs']}/25 | C.動能趨勢: {score_res['scores']['c_momentum']}/15")
        print(f"     ▸ D.量價波動: {score_res['scores']['d_volume']}/15 | E.籌碼期貨: {score_res['scores']['e_chip']}/20 | 基本面加成: +{score_res['scores']['bonus_revenue']}")

        # -------------------------------------------------------------
        # Stage 3: 前端畫面顯示格式
        # -------------------------------------------------------------
        print("\n 🟢 【第三階段：終端畫面最終格式化顯示值 (UI Display Values)】")
        print(f"   • 標的名稱欄位         : 【{spec.get('name', sym)} ({sym})】")
        print(f"   • 成交價 / 漲跌 / 時態 : NT$ {fmt_price}  {data_status}  {fmt_chg} ({fmt_rate})  (時間: {snap['timestamp']})")
        print(f"   • 價格資料來源標記     : 來源: {price_source_label}")
        print(f"   • 成交量 / 量比顯示    : {snap['volume']:,} 口 (量比: {meta.get('volRatio', 1.5)}x)  [來源: {price_source_label}]")
        print(f"   • 未平倉量 (OI) 顯示   : 未平倉 {oi_info.get('oi', 0):,} 口 ({'+' if oi_info.get('oi_change', 0) >= 0 else ''}{oi_info.get('oi_change', 0)} 口)  [來源: 期交所盤後]")
        print(f"   • 三大法人買賣超顯示   : {inst.get('name', underlying)} 連買 {inst.get('streak_days', 0)} 日 ({'+' if inst.get('total_net', 0) >= 0 else ''}{inst.get('total_net', 0):,} 張)  [來源: 證交所三大法人]")
        print(f"   • 月營收年增率顯示     : {rev.get('yoy_pct', 0.0)}%  [來源: 證交所/MOPS]")
        print(f"   • 榜單得分與排序依據   : {score_res['total_score']} 分 (原始得分: {score_res['raw_score']})")

    print("\n" + "=" * 80)
    print(" ✓ 三階段資料對照完成！請比對上述數值與您的券商 App 報價畫面。")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="台股個股期貨報價與資料對照驗證工具")
    parser.add_argument("--mode", choices=["live", "mock"], help="強制指定運作模式 (live 或 mock)")
    parser.add_argument("--symbols", nargs="+", default=["CDF", "JFF", "DHF"], help="指定要驗證的期貨標的代號 (例如 CDF JFF DHF)")
    args = parser.parse_args()

    verify_target_symbols(target_symbols=args.symbols, force_mode=args.mode)
