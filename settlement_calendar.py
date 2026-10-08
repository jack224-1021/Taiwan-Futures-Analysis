"""
台股期貨結算日曆演算法 (TAIFEX Settlement Calendar)
規則：台指期與個股期貨之最後結算日為「每月份的第三個星期三」。
若逢國定假日，則依期交所規定順延至次一營業日。
"""

import datetime
from typing import Tuple, List, Dict, Any

def get_third_wednesday(year: int, month: int) -> datetime.date:
    """計算指定年月份的第三個星期三 (期交所標準結算日)"""
    # 找出該月第 1 天 (weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)
    first_day = datetime.date(year, month, 1)
    days_to_first_wed = (2 - first_day.weekday()) % 7
    first_wed = first_day + datetime.timedelta(days=days_to_first_wed)
    # 第三個星期三 = 第一個星期三 + 14 天
    third_wed = first_wed + datetime.timedelta(days=14)
    return third_wed

def get_settlement_info(target_date: datetime.date = None) -> Dict[str, Any]:
    """
    計算距離當前生效之個股期貨最後結算日的詳細資訊與剩餘天數
    """
    if target_date is None:
        target_date = datetime.date.today()
    elif isinstance(target_date, str):
        target_date = datetime.datetime.strptime(target_date, "%Y-%m-%d").date()
    
    current_year = target_date.year
    current_month = target_date.month

    # 本月的第三個星期三
    this_month_settlement = get_third_wednesday(current_year, current_month)

    # 如果今天已經過了本月結算日，則下一個結算月份為次月
    if target_date > this_month_settlement:
        next_month = current_month + 1 if current_month < 12 else 1
        next_year = current_year if current_month < 12 else current_year + 1
        active_settlement = get_third_wednesday(next_year, next_month)
        contract_month = f"{next_year}{next_month:02d}"
        display_month = f"{next_month}"
    else:
        active_settlement = this_month_settlement
        contract_month = f"{current_year}{current_month:02d}"
        display_month = f"{current_month}"

    days_remaining = (active_settlement - target_date).days
    is_settlement_day = (target_date == active_settlement)

    return {
        "active_contract_month": contract_month,
        "display_month": display_month,
        "settlement_date": active_settlement.strftime("%Y/%m/%d"),
        "settlement_date_short": active_settlement.strftime("%m/%d"),
        "settlement_date_raw": active_settlement.isoformat(),
        "days_remaining": days_remaining,
        "is_settlement_day": is_settlement_day,
        "warning_level": "danger" if days_remaining <= 3 else "normal",
        "warning_text": f"⏰ 距 {display_month} 月結算日僅剩 {days_remaining} 天 ({active_settlement.strftime('%m/%d')})，請提早規劃轉倉！" if days_remaining <= 3 else f"⏳ 距本月結算日: {days_remaining} 天 ({active_settlement.strftime('%m/%d')})"
    }

if __name__ == "__main__":
    info = get_settlement_info()
    print("=== 期交所結算日曆演算法驗證 ===")
    print(f"目前生效合約月份: {info['active_contract_month']}")
    print(f"最後結算日期: {info['settlement_date']}")
    print(f"距結算日剩餘天數: {info['days_remaining']} 天")
    print(f"警示狀態: {info['warning_text']}")
