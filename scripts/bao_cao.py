"""
bao_cao.py — Tự động sinh báo cáo từ SL
Thay thế toàn bộ sheet: Bao cao, BC ngày, BC xe

Chạy: python bao_cao.py
"""
import pandas as pd
import sys
from sheets_client import get_service, read_sheet, write_sheet
from config import SHEETS


def load_sl(service) -> pd.DataFrame:
    print("📥 Đọc SL...")
    df = read_sheet(service, SHEETS['sl'], 'A4:X')
    df.columns = [
        'nam','thang_vh','kl','khu_vuc','date','xe','container','mtc',
        'delta_ncc','cong_ty','loai_hang','noi_di','noi_den','nghiep_vu',
        'cuoc','phu_phi','ghi_chu','job_id','lenh_vc','lai_xe',
        'thang_hd','ghi_chu_nb','phan_loai','nam_hd'
    ]
    # Bỏ dòng trống
    df = df[df['job_id'].astype(str).str.strip() != ''].copy()
    # Convert types
    for col in ['cuoc','phu_phi','thang_vh','nam']:
        df[col] = pd.to_numeric(df[col].astype(str).str.replace(',',''), errors='coerce').fillna(0)
    df['doanh_thu'] = df['cuoc'] + df['phu_phi']
    print(f"  → {len(df)} chuyến hàng")
    return df


def bao_cao_doanh_thu_khu_vuc(df: pd.DataFrame) -> list:
    """Báo cáo DT theo khu vực + tháng"""
    grp = df.groupby(['khu_vuc','nam','thang_vh','nam_hd','thang_hd'])\
            .agg(so_chuyen=('kl','count'), doanh_thu=('doanh_thu','sum'))\
            .reset_index()
    grp = grp.sort_values(['khu_vuc','nam','thang_vh'])
    rows = [['Khu vực','Năm VH','Tháng VH','Năm HD','Tháng HD','Số chuyến','Doanh thu']]
    for _, r in grp.iterrows():
        rows.append([r.khu_vuc, int(r.nam), int(r.thang_vh),
                     int(r.nam_hd) if r.nam_hd else '', int(r.thang_hd) if r.thang_hd else '',
                     int(r.so_chuyen), r.doanh_thu])
    return rows


def bao_cao_theo_ngay(df: pd.DataFrame) -> list:
    """Báo cáo SL vận hành theo ngày"""
    grp = df.groupby(['date','khu_vuc'])\
            .agg(so_chuyen=('kl','count'), doanh_thu=('doanh_thu','sum'))\
            .reset_index()
    grp = grp.sort_values('date')
    rows = [['Ngày','Khu vực','Số chuyến','Doanh thu']]
    for _, r in grp.iterrows():
        rows.append([r.date, r.khu_vuc, int(r.so_chuyen), r.doanh_thu])
    return rows


def bao_cao_theo_xe(df: pd.DataFrame) -> list:
    """Báo cáo SL vận hành theo xe"""
    grp = df.groupby(['xe','lai_xe','nam','thang_vh'])\
            .agg(so_chuyen=('kl','count'), doanh_thu=('doanh_thu','sum'),
                 cuoc_tb=('cuoc','mean'))\
            .reset_index()
    grp = grp.sort_values(['xe','nam','thang_vh'])
    rows = [['Xe','Lái xe','Năm','Tháng','Số chuyến','Doanh thu','Cước TB']]
    for _, r in grp.iterrows():
        rows.append([r.xe, r.lai_xe, int(r.nam), int(r.thang_vh),
                     int(r.so_chuyen), r.doanh_thu, round(r.cuoc_tb)])
    return rows


def bao_cao_job_id(df: pd.DataFrame) -> list:
    """Báo cáo DT theo JOB ID"""
    grp = df.groupby(['job_id','khu_vuc','nam','thang_vh'])\
            .agg(so_chuyen=('kl','count'), doanh_thu=('doanh_thu','sum'))\
            .reset_index()
    rows = [['JOB ID','Khu vực','Năm VH','Tháng VH','Số chuyến','Doanh thu']]
    for _, r in grp.iterrows():
        rows.append([r.job_id, r.khu_vuc, int(r.nam), int(r.thang_vh),
                     int(r.so_chuyen), r.doanh_thu])
    return rows


def main():
    print("🚀 Sinh báo cáo doanh thu...")
    svc = get_service()
    df = load_sl(svc)

    # 1. Bao cao — DT theo khu vực
    data_kv = bao_cao_doanh_thu_khu_vuc(df)
    write_sheet(svc, SHEETS['bao_cao'], 'A3', data_kv)

    # 2. BC ngày
    data_ngay = bao_cao_theo_ngay(df)
    write_sheet(svc, SHEETS['bc_ngay'], 'A3', data_ngay)

    # 3. BC xe
    data_xe = bao_cao_theo_xe(df)
    write_sheet(svc, SHEETS['bc_xe'], 'A3', data_xe)

    print("✅ Xong báo cáo doanh thu!")


if __name__ == '__main__':
    main()
