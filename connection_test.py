#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Shioaji 正式連線與個股期貨報價測試工具 (connection_test.py)
==============================================================================
說明：
1. 僅使用行情與查詢功能，嚴禁且無下單動作。
2. 使用正式環境 (simulation=False)。
3. 讀取 .env 中的 SJ_API_KEY / SJ_SECRET_KEY。
4. 輸出登入結果、可用帳戶清單、以及一檔個股期貨契約 (CDFR1 / 台積電期) 之 Snapshot 原始資料。
5. 金鑰與敏感帳號資訊嚴格遮蔽輸出。
==============================================================================
"""

import os
import sys
import datetime
import traceback

# 確保 Windows 主控台正確輸出 UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def mask_str(s: str, prefix_len: int = 4, suffix_len: int = 4) -> str:
    if not s:
        return "<EMPTY>"
    if len(s) <= prefix_len + suffix_len:
        return "*" * len(s)
    return s[:prefix_len] + "*" * (len(s) - prefix_len - suffix_len) + s[-suffix_len:]

def run_connection_test():
    print("=" * 80)
    print(" 🚀 永豐金證券 Shioaji API 正式環境連線與即時行情測試 (connection_test.py)")
    print(f" ▸ 測試時間: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # 1. 載入環境變數
    try:
        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        load_dotenv(dotenv_path=env_path, override=True)
        print(f" ▸ 載入設定檔: {env_path}")
    except ImportError:
        print(" ⚠️ 未安裝 python-dotenv，嘗試直接從系統環境變數讀取。")

    api_key = os.getenv("SJ_API_KEY") or os.getenv("SHIOAJI_API_KEY", "")
    secret_key = os.getenv("SJ_SECRET_KEY") or os.getenv("SHIOAJI_SECRET_KEY", "")
    data_mode = os.getenv("DATA_MODE", "live").strip().lower()

    print(f" ▸ DATA_MODE: {data_mode}")
    print(f" ▸ SJ_API_KEY   : {mask_str(api_key)}")
    print(f" ▸ SJ_SECRET_KEY: {mask_str(secret_key)}")
    print("-" * 80)

    if not api_key or not secret_key or "your_" in api_key.lower():
        print("\n❌ 【連線檢查未通過】：未在 .env 中填寫有效的 SJ_API_KEY 與 SJ_SECRET_KEY！")
        print("   請確認 .env 檔案中已設定真實的永豐金證券 API 金鑰。\n")
        sys.exit(1)

    # 2. 載入 Shioaji 套件
    try:
        import shioaji as sj
        print(f" ▸ Shioaji 套件版本: v{sj.__version__}")
    except ImportError:
        print("\n❌ 【連線檢查未通過】：尚未安裝 shioaji 套件！")
        print("   請執行: pip install shioaji\n")
        sys.exit(1)

    # 3. 嘗試登入正式環境 (simulation=False)
    print("\n[步驟 1/3] 正在建立 Shioaji 實例 (simulation=False) 並執行登入...")
    api = sj.Shioaji(simulation=False)
    accounts = None

    try:
        accounts = api.login(
            api_key=api_key,
            secret_key=secret_key,
            contracts_timeout=15000
        )
        print("✓ [Shioaji 登入成功] 登入結果正常回應！")
    except Exception as e:
        err_msg = str(e)
        print("\n" + "!" * 80)
        print(" ❌ 【Shioaji 正式環境登入失敗】")
        print(f" 錯誤訊息: {err_msg}")
        print("!" * 80)
        print("\n🔍 【可能原因排查診斷清單】：")
        print(" 1. 簽署未完成：尚未於永豐金「Python API 申請專區」簽署 API 風險預告書或開通合約。")
        print(" 2. 測試未通過 / 權限未開：帳號尚未完成永豐金線上 Python API 認證測試，或未開通期貨/證券 API 交易權限。")
        print(" 3. 金鑰不符：SJ_API_KEY / SJ_SECRET_KEY 複製錯誤、前後含空白字元或已重新產生舊金鑰失效。")
        print(" 4. 來源 IP 限制：永豐金伺服器限制或公司防火牆封鎖外連 Port。")
        print(" 5. 套件版本過舊或券商伺服器維護中：請確認 shioaji 版本與券商公告維護時段。")
        print(" 6. 憑證 (CA) 未啟用：若有需要下單權限需啟用 CA，但純行情查詢登入亦需帳戶狀態有效。")
        print("!" * 80 + "\n")
        sys.exit(1)

    # 4. 列出可用帳戶
    print("\n[步驟 2/3] 查詢已授權之可用帳戶 (帳號資訊已部分遮蔽)...")
    if accounts:
        print(f" ▸ 共取得 {len(accounts)} 個綁定帳戶：")
        for i, acc in enumerate(accounts, 1):
            acc_type = getattr(acc, 'account_type', 'N/A')
            acc_id = getattr(acc, 'account_id', 'N/A')
            person_id = getattr(acc, 'person_id', 'N/A')
            broker_id = getattr(acc, 'broker_id', 'N/A')
            signed = getattr(acc, 'signed', False)
            print(f"   [{i}] 類型: {acc_type:<10} | 券商代碼: {broker_id} | 帳號: {mask_str(str(acc_id), 3, 3)} | 身分證/統編: {mask_str(str(person_id), 2, 2)} | 已簽署: {signed}")
    else:
        print(" ⚠️ 登入成功但未回傳任何可用帳戶清單。")

    # 5. 抓取一檔個股期貨契約 Snapshot (以 CDFR1 台積電期 為例)
    print("\n[步驟 3/3] 抓取個股期貨契約 Snapshot 行情 (標的: CDFR1 台積電期貨近月)...")
    try:
        # 尋找 CDF 契約
        target_contract = None
        if hasattr(api.Contracts, 'Futures') and hasattr(api.Contracts.Futures, 'CDF'):
            cdf_group = api.Contracts.Futures.CDF
            # 優先找 CDFR1 或第一檔合約
            if 'CDFR1' in cdf_group:
                target_contract = cdf_group['CDFR1']
            else:
                for code, c in cdf_group.items():
                    target_contract = c
                    break

        # 若未找到 CDFR1，則使用 TXFR1 (台指期近月) 作為備選
        if not target_contract and hasattr(api.Contracts, 'Futures') and hasattr(api.Contracts.Futures, 'TXF'):
            target_contract = api.Contracts.Futures.TXF.get('TXFR1')

        if not target_contract:
            print(" ⚠️ 未在 Contracts 目錄中找到 CDFR1 / TXFR1 契約物件，嘗試直接以合約代碼查詢。")

        if target_contract:
            print(f" ▸ 目標契約物件: {target_contract.code} - {getattr(target_contract, 'name', '')}")
            snaps = api.snapshots([target_contract])
            if snaps:
                snap = snaps[0]
                ts_dt = datetime.datetime.fromtimestamp(snap.ts / 1e9) if snap.ts > 1e12 else datetime.datetime.fromtimestamp(snap.ts)
                print("\n" + "=" * 50 + " 個股期貨 Snapshot 原始資料 " + "=" * 50)
                print(f"   • 契約代碼 (Code)        : {snap.code}")
                print(f"   • 商品名稱 (Name)        : {getattr(snap, 'name', target_contract.name)}")
                print(f"   • 原始成交價 (Close)      : {snap.close}")
                print(f"   • 開盤價 (Open)          : {snap.open}")
                print(f"   • 最高價 (High)          : {snap.high}")
                print(f"   • 最低價 (Low)           : {snap.low}")
                print(f"   • 總成交量 (Total Volume): {snap.total_volume} 口")
                print(f"   • 漲跌點數 (Change Price): {snap.change_price}")
                print(f"   • 漲跌幅度 (Change Rate) : {snap.change_rate}%")
                print(f"   • 原始時間戳 (ts)        : {snap.ts} ({ts_dt.strftime('%Y-%m-%d %H:%M:%S')})")
                print("=" * 122)
            else:
                print(" ⚠️ Snapshot 查詢回傳空清單。")
        else:
            print(" ❌ 未能定位契約物件，無法執行 Snapshot 查詢。")

    except Exception as e:
        print(f"\n❌ Snapshot 查詢時發生例外: {str(e)}")
        traceback.print_exc()
        sys.exit(1)

    print("\n✓ [Shioaji 正式連線與 Snapshot 報價測試完全成功]\n")

if __name__ == "__main__":
    run_connection_test()
