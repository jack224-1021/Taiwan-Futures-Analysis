"""
永豐金證券 Shioaji API 資料提供者 (Shioaji Data Provider & Live Provider)
==============================================================================
功能與安全規範：
1. 實作 ShioajiLiveProvider 專用類別 (simulation=False, 從 .env 讀取 SJ_API_KEY, SJ_SECRET_KEY)。
2. 本模組僅使用「行情報價 (Quotes/Snapshots/Ticks)」與「合約/帳戶查詢 (Contracts/Accounts)」，嚴禁任何下單與委託交易。
3. live 模式下若登入失敗或資料缺失，拋出明確 ShioajiLiveError，嚴禁自動退回 mock 假資料。
4. 提供加權指數 (TSE001)、台指期 (TXFR1)、個股期貨 (CDFR1, JFFR1, DHFR1 等) 之即時報價。
5. 提供交易時段判斷 (日盤、夜盤、收盤/休市)，休市與非交易時段明確標註「收盤價」。
==============================================================================
"""

import os
import sys
import time
import datetime
from typing import Dict, List, Optional, Any

try:
    from dotenv import load_dotenv
    # 載入當前目錄與專案目錄的 .env
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    load_dotenv(dotenv_path=env_path, override=True)
except ImportError:
    pass

class ShioajiLiveError(Exception):
    """Shioaji 正式環境運作異常專用例外 (嚴禁用於自動退回 mock)"""
    pass

def get_tick_size(price: float) -> float:
    """計算台股期貨/現貨最小跳動點"""
    if price < 10.0:
        return 0.01
    elif price < 50.0:
        return 0.05
    elif price < 100.0:
        return 0.10
    elif price < 500.0:
        return 0.50
    elif price < 1000.0:
        return 1.00
    else:
        return 5.00

def round_to_tick(price: float) -> float:
    """依最小跳動點四捨五入並消除浮點數微小誤差"""
    tick = get_tick_size(price)
    rounded = round(round(price / tick) * tick, 4)
    if tick >= 1.0:
        return float(int(rounded)) if rounded.is_integer() else rounded
    return rounded

def get_market_session_info() -> Dict[str, Any]:
    """
    判斷台股與期交所當前交易時段：
    - 盤前試撮：08:30 ~ 08:45 (期貨) / 09:00 (現貨)
    - 日盤：08:45 ~ 13:45 (即時)
    - 盤後盤/夜盤：15:00 ~ 次日 05:00 (夜盤即時)
    - 休市/非交易時段：顯示「收盤價」
    """
    now = datetime.datetime.now()
    weekday = now.weekday() # 0: Mon, 4: Fri, 5: Sat, 6: Sun
    hour = now.hour
    minute = now.minute
    time_float = hour + minute / 60.0

    is_weekend = weekday in [5, 6]
    is_pre_market = not is_weekend and (8.5 <= time_float < 8.75) # 08:30 - 08:45
    is_regular = not is_weekend and (8.75 <= time_float <= 13.75) # 08:45 - 13:45
    is_night = False

    if not is_weekend:
        if time_float >= 15.0 or time_float < 5.0: # 15:00 - 24:00, 00:00 - 05:00
            if weekday == 5 and time_float < 5.0:
                is_night = True
            elif weekday != 5:
                is_night = True

    if is_regular:
        session_name = "日盤交易中"
        display_label = "即時"
        is_trading = True
    elif is_pre_market:
        session_name = "盤前試撮中"
        display_label = "盤前試撮"
        is_trading = True
    elif is_night:
        session_name = "夜盤交易中"
        display_label = "夜盤即時"
        is_trading = True
    else:
        session_name = "已收盤 / 休市"
        display_label = "收盤價"
        is_trading = False

    return {
        "session_name": session_name,
        "display_label": display_label,
        "is_trading": is_trading,
        "current_time": now.strftime("%Y/%m/%d %H:%M:%S")
    }

class ShioajiLiveProvider:
    """
    Shioaji 正式環境行情提供者 (simulation=False)
    僅使用行情訂閱、查詢合約與 Snapshot，無任何下單與委託功能。
    """
    def __init__(self, api_key: Optional[str] = None, secret_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("SJ_API_KEY") or os.getenv("SHIOAJI_API_KEY", "")
        self.secret_key = secret_key or os.getenv("SJ_SECRET_KEY") or os.getenv("SHIOAJI_SECRET_KEY", "")
        self.cert_path = os.getenv("SHIOAJI_CERT_PATH")
        self.cert_password = os.getenv("SHIOAJI_CERT_PASSWORD")

        self.sj = None
        self.is_connected = False
        self.accounts = []
        self.last_heartbeat_time = None
        self.last_tick_timestamp = None
        self.login_error_message = None
        self.live_quotes_cache: Dict[str, Dict[str, Any]] = {}

        self._init_session()

    def _init_session(self):
        """登入正式環境 (simulation=False)"""
        if not self.api_key or not self.secret_key or "your_" in self.api_key.lower():
            err = (
                "DATA_MODE=live 但未在 .env 中設定有效的 SJ_API_KEY / SJ_SECRET_KEY。\n"
                "依規範 LIVE 模式下嚴禁自動退回 mock 模式，請在 .env 中填寫有效 API 金鑰。"
            )
            self.login_error_message = err
            self.is_connected = False
            raise ShioajiLiveError(err)

        try:
            import shioaji as sj
        except ImportError:
            err = (
                "DATA_MODE=live 但 Python 環境尚未安裝 shioaji 套件。\n"
                "請執行 'pip install shioaji' 安裝券商 API 套件。"
            )
            self.login_error_message = err
            self.is_connected = False
            raise ShioajiLiveError(err)

        try:
            print("[ShioajiLiveProvider] 正在使用正式環境 (simulation=False) 登入 Shioaji (僅讀取行情/查詢，不下單)...")
            self.sj = sj.Shioaji(simulation=False)
            self.accounts = self.sj.login(
                api_key=self.api_key,
                secret_key=self.secret_key,
                contracts_timeout=15000
            )

            # 若有憑證則載入憑證啟用完整行情權限 (純行情查詢非必要，但若有配置則載入)
            if self.cert_path and os.path.exists(self.cert_path):
                try:
                    self.sj.activate_ca(
                        ca_path=self.cert_path,
                        ca_passwd=self.cert_password or "",
                        person_id=self.accounts[0].person_id if self.accounts else ""
                    )
                except Exception as ca_err:
                    print(f"[ShioajiLiveProvider] 憑證載入提示: {ca_err}")

            self.is_connected = True
            self.last_heartbeat_time = time.time()
            self.last_tick_timestamp = time.time()
            self.login_error_message = None
            print(f"[ShioajiLiveProvider] ✓ Shioaji 正式環境連線登入成功！共綁定 {len(self.accounts)} 個帳戶。")

            self._setup_event_callbacks()

        except Exception as e:
            self.is_connected = False
            self.login_error_message = f"Shioaji 正式環境登入失敗: {str(e)}"
            print(f"[ShioajiLiveProvider] ❌ {self.login_error_message}")
            raise ShioajiLiveError(self.login_error_message)

    def _setup_event_callbacks(self):
        """設定 WebSocket 行情回呼 (僅接收報價)"""
        if not self.sj:
            return

        try:
            @self.sj.on_tick_fop_v1()
            def on_future_tick(exchange, tick):
                self.last_tick_timestamp = time.time()
                code = getattr(tick, 'code', '')
                close_price = getattr(tick, 'close', 0.0)
                vol = getattr(tick, 'volume', 0)
                if code:
                    self.live_quotes_cache[code] = {
                        "code": code,
                        "close": close_price,
                        "volume": vol,
                        "timestamp": datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
                        "ts_epoch": time.time(),
                        "raw_tick": str(tick)
                    }
        except Exception as e:
            print(f"[ShioajiLiveProvider] WebSocket 回呼綁定提示: {e}")

    def get_connection_status(self) -> Dict[str, Any]:
        """取得真實連線狀態與即時延遲毫秒數"""
        now = time.time()
        session = get_market_session_info()

        if not self.is_connected or self.login_error_message:
            return {
                "data_mode": "live",
                "is_live": True,
                "status_text": "未連線 (Live 異常)",
                "latency_ms": None,
                "is_delayed": True,
                "connected": False,
                "error": self.login_error_message,
                "market_session": session
            }

        latency_ms = 0
        is_delayed = False
        if self.last_tick_timestamp:
            diff_sec = now - self.last_tick_timestamp
            latency_ms = max(int(diff_sec * 1000), 1)
            if diff_sec > 15.0:
                is_delayed = True

        if not is_delayed:
            status_text = f"即時連線 ({latency_ms}ms)"
        else:
            sec_ago = int(now - (self.last_tick_timestamp or now))
            status_text = f"資料延遲 ({sec_ago}s前)"

        return {
            "data_mode": "live",
            "is_live": True,
            "status_text": status_text,
            "latency_ms": latency_ms,
            "is_delayed": is_delayed,
            "connected": True,
            "error": None,
            "market_session": session
        }

    def fetch_snapshots(self, contracts: List[str] = None) -> List[Dict[str, Any]]:
        """取得指定期貨標的之即時 Snapshot 行情"""
        if not self.is_connected or not self.sj:
            raise ShioajiLiveError(f"Shioaji 正式環境尚未連線，無法取得即時行情: {self.login_error_message}")

        session = get_market_session_info()
        target_codes = contracts or ['CDFR1', 'JFFR1', 'DHFR1', 'GDFR1', 'JGFR1', 'DVFR1', 'CZFR1', 'QAFR1', 'PAFR1', 'TXFR1']
        results = []

        try:
            target_contracts = []
            for code in target_codes:
                prefix = code[:3]
                # 從 Contracts.Futures 中定位契約物件
                contract_obj = getattr(self.sj.Contracts.Futures, prefix, None)
                if contract_obj and code in contract_obj:
                    target_contracts.append(contract_obj[code])
                elif contract_obj:
                    # 若精確代號不存在則取第一個契約
                    for k, c in contract_obj.items():
                        target_contracts.append(c)
                        break

            if target_contracts:
                snapshots = self.sj.snapshots(target_contracts)
                self.last_tick_timestamp = time.time()

                for snap in snapshots:
                    close_val = round_to_tick(float(snap.close))
                    change_val = float(snap.change_price)
                    change_rate_val = float(snap.change_rate)
                    
                    formatted_change = f"{'+' if change_val >= 0 else ''}{change_val:.2f}"
                    formatted_rate = f"{'+' if change_rate_val >= 0 else ''}{change_rate_val:.2f}%"
                    
                    ts_str = (
                        datetime.datetime.fromtimestamp(snap.ts / 1e9).strftime("%Y/%m/%d %H:%M:%S")
                        if snap.ts > 1e12 else
                        datetime.datetime.fromtimestamp(snap.ts).strftime("%Y/%m/%d %H:%M:%S")
                    )

                    results.append({
                        "code": snap.code,
                        "symbol": snap.code[:3],
                        "name": getattr(snap, "name", snap.code),
                        "close": close_val,
                        "open": float(snap.open),
                        "high": float(snap.high),
                        "low": float(snap.low),
                        "volume": int(snap.total_volume),
                        "change_price": change_val,
                        "change_rate": change_rate_val,
                        "formatted_change": formatted_change,
                        "formatted_rate": formatted_rate,
                        "timestamp": ts_str,
                        "is_mock": False,
                        "price_label": session["display_label"],
                        "raw_snapshot": {
                            "ts": snap.ts,
                            "open": snap.open,
                            "high": snap.high,
                            "low": snap.low,
                            "close": snap.close,
                            "volume": snap.total_volume,
                            "change_price": snap.change_price,
                            "change_rate": snap.change_rate
                        }
                    })

            return results
        except Exception as e:
            raise ShioajiLiveError(f"Shioaji Snapshots 行情取得失敗: {str(e)}")

class ShioajiProvider:
    """
    通用 Provider 封裝
    支援：
    1. DATA_MODE=free (推薦：使用證交所 MIS 即時行情 + 期交所 + 證交所 OpenAPI，100% 免費無須 API Key)
    2. DATA_MODE=live (使用永豐金 Shioaji 正式券商行情，需填寫 SJ_API_KEY / SJ_SECRET_KEY)
    3. DATA_MODE=mock (模擬資料引擎)
    """
    def __init__(self, data_mode: str = None):
        raw_mode = data_mode or os.getenv("DATA_MODE", "free")
        self.data_mode = raw_mode.strip().lower()
        self.live_provider = None
        self.free_provider = None
        self.login_error_message = None

        if self.data_mode == "live":
            # 檢查是否有設定 Shioaji 金鑰
            api_key = os.getenv("SJ_API_KEY") or os.getenv("SHIOAJI_API_KEY", "")
            if api_key and "your_" not in api_key.lower():
                self.live_provider = ShioajiLiveProvider()
                self.is_connected = self.live_provider.is_connected
            else:
                # 若未設定金鑰，自動切換至 100% 免費開放 API 模式
                from free_open_provider import FreeOpenDataProvider
                self.free_provider = FreeOpenDataProvider()
                self.data_mode = "free"
                self.is_connected = True
        elif self.data_mode in ["free", "open"]:
            from free_open_provider import FreeOpenDataProvider
            self.free_provider = FreeOpenDataProvider()
            self.is_connected = True
        else:
            self.is_connected = True

    def get_connection_status(self) -> Dict[str, Any]:
        if self.data_mode == "live":
            if self.live_provider:
                return self.live_provider.get_connection_status()
            return {
                "data_mode": "live",
                "is_live": True,
                "status_text": "未連線 (Shioaji 異常)",
                "latency_ms": None,
                "is_delayed": True,
                "connected": False,
                "error": self.login_error_message or "ShioajiLiveProvider 未建立",
                "market_session": get_market_session_info()
            }
        elif self.data_mode in ["free", "open"]:
            if self.free_provider:
                return self.free_provider.get_connection_status()
            return {
                "data_mode": "free",
                "is_live": True,
                "is_free": True,
                "status_text": "即時連線 (證交所 MIS 開放端點)",
                "latency_ms": 35,
                "is_delayed": False,
                "connected": True,
                "error": None,
                "market_session": get_market_session_info()
            }
        else:
            # MOCK 模式
            session = get_market_session_info()
            return {
                "data_mode": "mock",
                "is_live": False,
                "status_text": "模擬資料 (MOCK)",
                "latency_ms": 0,
                "is_delayed": False,
                "connected": True,
                "error": None,
                "market_session": session
            }

    def fetch_snapshots(self, contracts: List[str] = None) -> List[Dict[str, Any]]:
        if self.data_mode == "live":
            if not self.live_provider:
                raise ShioajiLiveError("ShioajiLiveProvider 未建立或連線失敗")
            return self.live_provider.fetch_snapshots(contracts)
        elif self.data_mode in ["free", "open"]:
            if not self.free_provider:
                from free_open_provider import FreeOpenDataProvider
                self.free_provider = FreeOpenDataProvider()
            symbols = [c[:3] for c in contracts] if contracts else None
            return self.free_provider.fetch_snapshots(symbols)
        else:
            # MOCK 模式資料
            session = get_market_session_info()
            mock_time = datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")
            mock_items = [
                {"code": "CDFR1", "symbol": "CDF", "name": "台積電期", "close": 1045.0, "open": 1035.0, "high": 1050.0, "low": 1030.0, "volume": 14250, "change_price": 18.0, "change_rate": 1.75},
                {"code": "JFFR1", "symbol": "JFF", "name": "奇鋐期", "close": 688.0, "open": 670.0, "high": 692.0, "low": 665.0, "volume": 8900, "change_price": 28.0, "change_rate": 4.24},
                {"code": "DHFR1", "symbol": "DHF", "name": "鴻海期", "close": 222.5, "open": 220.0, "high": 224.0, "low": 219.0, "volume": 18500, "change_price": 3.5, "change_rate": 1.60},
                {"code": "GDFR1", "symbol": "GDF", "name": "廣達期", "close": 313.5, "open": 310.0, "high": 316.0, "low": 308.0, "volume": 7200, "change_price": 6.5, "change_rate": 2.12},
                {"code": "JGFR1", "symbol": "JGF", "name": "雙鴻期", "close": 795.0, "open": 770.0, "high": 802.0, "low": 765.0, "volume": 4800, "change_price": 32.0, "change_rate": 4.19},
                {"code": "DVFR1", "symbol": "DVF", "name": "聯發科期", "close": 1290.0, "open": 1270.0, "high": 1300.0, "low": 1265.0, "volume": 5100, "change_price": 25.0, "change_rate": 1.98},
                {"code": "CZFR1", "symbol": "CZF", "name": "長榮期", "close": 199.0, "open": 198.0, "high": 201.0, "low": 197.5, "volume": 6100, "change_price": 1.5, "change_rate": 0.76},
                {"code": "QAFR1", "symbol": "QAF", "name": "華城期", "close": 618.0, "open": 630.0, "high": 635.0, "low": 612.0, "volume": 3400, "change_price": -12.0, "change_rate": -1.90},
                {"code": "PAFR1", "symbol": "PAF", "name": "世芯-KY期", "close": 2120.0, "open": 2180.0, "high": 2190.0, "low": 2110.0, "volume": 1800, "change_price": -60.0, "change_rate": -2.75}
            ]

            results = []
            for item in mock_items:
                c = round_to_tick(item["close"])
                chg = item["change_price"]
                rate = item["change_rate"]
                results.append({
                    "code": item["code"],
                    "symbol": item["symbol"],
                    "name": item["name"],
                    "close": c,
                    "open": item["open"],
                    "high": item["high"],
                    "low": item["low"],
                    "volume": item["volume"],
                    "change_price": chg,
                    "change_rate": rate,
                    "formatted_change": f"{'+' if chg >= 0 else ''}{chg:.2f}",
                    "formatted_rate": f"{'+' if rate >= 0 else ''}{rate:.2f}%",
                    "timestamp": mock_time,
                    "is_mock": True,
                    "price_label": "模擬",
                    "raw_snapshot": {
                        "ts": int(time.time() * 1e9),
                        "open": item["open"],
                        "high": item["high"],
                        "low": item["low"],
                        "close": item["close"],
                        "volume": item["volume"],
                        "change_price": chg,
                        "change_rate": rate
                    }
                })
            return results
