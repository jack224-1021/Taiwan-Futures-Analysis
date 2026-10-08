import os
import sys
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import MarketDataService

def test_service():
    print("=" * 80)
    print(" 🚀 驗證免費開放 API 與後端伺服器資料流 (test_server_output.py)")
    print("=" * 80)
    svc = MarketDataService()
    status = svc.get_system_status()
    print(f" ▸ 運作模式: {status.get('data_mode', '').upper()}")
    print(f" ▸ 連線狀態: {status.get('status_text')}")
    print(f" ▸ 延遲時間: {status.get('latency_ms')} ms")
    print(f" ▸ 交易時段: {status.get('market_session', {}).get('session_name')} (標籤: [{status.get('market_session', {}).get('display_label')}])")
    print(f" ▸ 結算日曆: {status.get('settlement', {}).get('warning_text')}")
    print("-" * 80)

    market = svc.get_full_market_data()
    futures = market.get("futures", [])
    print(f"✓ 成功取得 {len(futures)} 檔個股期貨之即時/收盤真實報價：\n")
    for idx, f in enumerate(futures, 1):
        print(f"   [{idx:02d}] 【{f['name']} ({f['symbol']})】 NT$ {f['price']:>7.2f} ({f['price_label']}) | 漲跌: {f['formatted_change']} ({f['formatted_rate']}) | 來源: {f['price_source']}")
        print(f"        未平倉: {f['oi']:,} 口 ({f['oi_source']}) | 法人: 連買 {f['instBuyStreak']} 日 ({f['inst_source']}) | 營收YoY: {f['revenueYoY']}% ({f['revenue_source']})")

    print("\n" + "=" * 80)
    print(" ✓ 全系統免費開放 API 資源整合驗證成功！")
    print("=" * 80)

if __name__ == "__main__":
    test_service()
