#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
自動擷取證交所/期交所最新即時行情並更新 data/market-data.json
"""
import os
import sys
import json
import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server import market_service

def update_data():
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 正在從證交所/期交所獲取最新行情與結算資料...")
    data = market_service.get_full_market_data()
    
    os.makedirs('data', exist_ok=True)
    out_file = os.path.join('data', 'market-data.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    status = data.get('status', {})
    futures = data.get('futures', [])
    print(f"✓ 成功更新 {out_file}！模式: {status.get('data_mode')} | 標的數量: {len(futures)}")
    for f in futures[:3]:
        print(f"  • {f['name']} ({f['symbol']}): NT$ {f['price']} ({f.get('formatted_change', '+0.00')} / {f.get('formatted_rate', '+0.00%')}) [{f.get('price_source')}]")

if __name__ == '__main__':
    update_data()
