import urllib.request
import json

url = "https://jack224-1021.github.io/Taiwan-Futures-Analysis/data/market-data.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode("utf-8"))

print("=== 雲端 GITHUB PAGES 即時資料驗證 ===")
print(f"連線狀態: {data['status'].get('status_text', data['status'].get('connected', '已連線'))}")
print(f"資料模式: {data['status'].get('data_mode', 'free')} (即時已連線: {data['status'].get('is_live', data['status'].get('connected', True))})")
print(f"資料來源: {data['status'].get('source_description', data['status'].get('provider', '證交所/期交所'))}")
print("\n即時個股期貨行情報價列表：")
for item in data["futures"]:
    print(f"  • {item['name']} ({item['symbol']}): NT$ {item['price']} ({item['change']:+.2f} / {item['changePct']:+.2f}%) | 標籤: [{item['price_label']}] | 來源: {item['price_source']}")
