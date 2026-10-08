import urllib.request
import json
import ssl
import sys
import datetime

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# 1. 測試 TWSE MIS 即時行情
url = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_2330.tw|tse_3017.tw|tse_2317.tw|tse_2382.tw|tse_3324.tw|tse_2454.tw|tse_2603.tw|tse_1519.tw|tse_3661.tw|tse_t00.tw'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)

print("=" * 80)
print(" 🚀 測試免費開放 API (1. 證交所 MIS 即時行情)")
print("=" * 80)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        msg_array = data.get('msgArray', [])
        print(f"✓ TWSE MIS 成功回應！共取得 {len(msg_array)} 檔標的之即時現貨報價：")
        for item in msg_array:
            code = item.get('c', '')
            name = item.get('n', code)
            last_price = item.get('z') or item.get('y') or '-'
            prev_close = item.get('y', '-')
            vol = item.get('v', '0')
            t = item.get('t', '')
            print(f"   • [{code:<5}] {str(name):<6} | 現價/昨收: {last_price} / {prev_close} | 累積量: {vol} | 時間戳: {t}")
except Exception as e:
    print(f"❌ TWSE MIS 錯誤: {e}")

print("\n" + "=" * 80)
print(" 🚀 測試免費開放 API (2. 證交所 OpenAPI 三大法人 / 月營收)")
print("=" * 80)

# 2. 測試 TWSE OpenAPI
try:
    req_inst = urllib.request.Request('https://openapi.twse.com.tw/v1/fund/T86', headers=headers)
    with urllib.request.urlopen(req_inst, context=ctx, timeout=10) as resp:
        inst_data = json.loads(resp.read().decode('utf-8'))
        print(f"✓ 證交所三大法人 (T86) 成功回應！共取得 {len(inst_data)} 檔標的數據。")
        # 示範 2330
        t2330 = next((x for x in inst_data if x.get('Code') == '2330'), None)
        if t2330:
            print(f"   • 台積電 (2330) 外資買賣超: {t2330.get('ForeignInvestorsBuySellDiff', '0')} 股 | 投信: {t2330.get('InvestmentTrustBuySellDiff', '0')} 股")
except Exception as e:
    print(f"⚠️ 證交所三大法人 T86: {e}")

try:
    req_rev = urllib.request.Request('https://openapi.twse.com.tw/v1/opendata/t187ap05_L', headers=headers)
    with urllib.request.urlopen(req_rev, context=ctx, timeout=10) as resp:
        rev_data = json.loads(resp.read().decode('utf-8'))
        print(f"✓ 證交所上市月營收成功回應！共取得 {len(rev_data)} 檔公司營收數據。")
except Exception as e:
    print(f"⚠️ 證交所月營收: {e}")

print("=" * 80)
