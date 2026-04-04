"""
thong_ke.py — Sinh sheet Thống kê + BC01-TH (tổng hợp tháng)
Thay thế: Thống kê, BC01-TH1/2/3, BC02-TH1, BC03-TH1

Chạy: python thong_ke.py
"""
import pandas as pd
from sheets_client import get_service, read_sheet, write_sheet
from config import SHEETS


def load_bc01(service, sheet_name: str) -> pd.DataFrame:
    """Đọc BC01-x từ PM Delta"""
    df = read_sheet(service, sheet_name, 'A3:Z')
    if df.empty:
        return df
    # Header chuẩn BC01
    expected = ['stt','ma_kh','khach_hang','chi_nhanh','so_invoice','lo_hang',
                'ngay_lap','to_khai','loai_hinh','kg','kien_hang','cbm',
                'so_cont','ma_tham_chieu','ngay','nguoi_lap','ma_phi','ten_phi',
                'nhom_tt','nhom_dt','tk_co','tk_no','mo_ta','dvt','sl','don_gia']
    df.columns = expected[:len(df.columns)]
    for col in ['don_gia','sl']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(',',''), errors='coerce').fillna(0)
    df['doanh_thu'] = df['don_gia'] * df['sl']
    return df


def load_sl(service) -> pd.DataFrame:
    """Đọc SL để lấy CP"""
    df = read_sheet(service, SHEETS['sl'], 'A4:X')
    df.columns = [
        'nam','thang_vh','kl','khu_vuc','date','xe','container','mtc',
        'delta_ncc','cong_ty','loai_hang','noi_di','noi_den','nghiep_vu',
        'cuoc','phu_phi','ghi_chu','job_id','lenh_vc','lai_xe',
        'thang_hd','ghi_chu_nb','phan_loai','nam_hd'
    ]
    df = df[df['job_id'].astype(str).str.strip() != ''].copy()
    for col in ['cuoc','phu_phi']:
        df[col] = pd.to_numeric(df[col].astype(str).str.replace(',',''), errors='coerce').fillna(0)
    df['chi_phi'] = df['cuoc'] + df['phu_phi']
    return df


def tong_hop_bc01_th(df_bc01: pd.DataFrame, df_sl: pd.DataFrame,
                     thang: int) -> list:
    """BC01-TH: tổng hợp DT+CP theo Khách hàng + Lô hàng + Mã tham chiếu"""
    if df_bc01.empty:
        return []

    # Tổng DT từ BC01
    dt_grp = df_bc01.groupby(['khach_hang','lo_hang','ma_tham_chieu'])\
                    .agg(tong_dt=('doanh_thu','sum')).reset_index()

    # Tổng CP từ SL theo lô hàng
    cp_grp = df_sl[df_sl['thang_vh'].astype(str) == str(thang)]\
                  .groupby('job_id')\
                  .agg(tong_cp=('chi_phi','sum')).reset_index()

    # Merge
    merged = dt_grp.merge(cp_grp, left_on='lo_hang', right_on='job_id', how='left')
    merged['tong_cp'] = merged['tong_cp'].fillna(0)

    # Lấy nơi đi/đến từ SL
    tuyen = df_sl[['job_id','noi_di','noi_den']].drop_duplicates('job_id')
    merged = merged.merge(tuyen, left_on='lo_hang', right_on='job_id', how='left')

    rows = [['Khách hàng','Lô hàng','Mã tham chiếu','SUM of DT','SUM of CP','Nơi đi','Nơi đến']]
    for _, r in merged.iterrows():
        rows.append([
            r.khach_hang, r.lo_hang, r.ma_tham_chieu,
            r.tong_dt, r.tong_cp,
            r.get('noi_di',''), r.get('noi_den','')
        ])
    return rows


def thong_ke_cung_duong(df_sl: pd.DataFrame) -> list:
    """Thống kê DT/CP trung bình theo cung đường"""
    grp = df_sl.groupby(['noi_di','noi_den'])\
               .agg(
                   avg_dt=('cuoc','mean'),
                   avg_cp=('chi_phi','mean'),
                   median_cp=('chi_phi','median'),
                   max_cp=('chi_phi','max'),
                   min_cp=('chi_phi','min'),
                   so_lo=('job_id','nunique')
               ).reset_index()

    rows = [['Nơi đi','Nơi đến','Số lô','AVG Doanh thu','AVG Chi phí','Median CP','Max CP','Min CP']]
    for _, r in grp.iterrows():
        rows.append([
            r.noi_di, r.noi_den, int(r.so_lo),
            round(r.avg_dt), round(r.avg_cp),
            round(r.median_cp), round(r.max_cp), round(r.min_cp)
        ])
    return rows


def main():
    print("🚀 Sinh Thống kê + BC01-TH...")
    svc = get_service()

    # Load SL
    df_sl = load_sl(svc)
    print(f"  SL: {len(df_sl)} chuyến")

    # Thống kê cung đường → sheet Thống kê
    data_cd = thong_ke_cung_duong(df_sl)
    write_sheet(svc, SHEETS['thong_ke'], 'R3', data_cd)

    # BC01-TH từng tháng (tháng 1, 2, 3)
    month_maps = [
        (1, 'bc01_1', 'bc01_th1'),
        (2, 'bc01_2', 'bc02_th1'),
        (3, 'bc01_3', 'bc03_th1'),
    ]
    for thang, bc01_key, th_key in month_maps:
        print(f"  BC01-TH tháng {thang}...")
        df_bc = load_bc01(svc, SHEETS[bc01_key])
        data_th = tong_hop_bc01_th(df_bc, df_sl, thang)
        if data_th:
            write_sheet(svc, SHEETS[th_key], 'A3', data_th)

    print("✅ Xong Thống kê!")


if __name__ == '__main__':
    main()
