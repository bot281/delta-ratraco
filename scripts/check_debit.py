"""
check_debit.py — Đối chiếu SL vs BC01 (PM Delta)
Thay thế sheet: Check debit

Chạy: python check_debit.py
"""
import pandas as pd
from sheets_client import get_service, read_sheet, write_sheet
from config import SHEETS


def load_sl(service) -> pd.DataFrame:
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
    df['dt_sl'] = df['cuoc'] + df['phu_phi']
    return df


def load_bc01_all(service) -> pd.DataFrame:
    """Gộp BC01 tất cả tháng"""
    frames = []
    for key in ['bc01_1','bc01_2','bc01_3']:
        df = read_sheet(service, SHEETS[key], 'A3:Z')
        if df.empty:
            continue
        df.columns = ['stt','ma_kh','khach_hang','chi_nhanh','so_invoice','lo_hang',
                      'ngay_lap','to_khai','loai_hinh','kg','kien_hang','cbm',
                      'so_cont','ma_tham_chieu','ngay','nguoi_lap','ma_phi','ten_phi',
                      'nhom_tt','nhom_dt','tk_co','tk_no','mo_ta','dvt','sl','don_gia'
                      ][:len(df.columns)]
        for col in ['don_gia','sl']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col].astype(str).str.replace(',',''), errors='coerce').fillna(0)
        df['dt_bc01'] = df.get('don_gia', pd.Series(0)) * df.get('sl', pd.Series(1))
        frames.append(df)

    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def check_debit(df_sl: pd.DataFrame, df_bc01: pd.DataFrame) -> list:
    """
    Đối chiếu từng chuyến SL với BC01 PM Delta
    Output: bảng với cột Check + Chênh lệch
    """
    # Tổng DT BC01 theo mã tham chiếu = JOB ID
    if not df_bc01.empty and 'lo_hang' in df_bc01.columns:
        bc01_grp = df_bc01.groupby('lo_hang')\
                          .agg(dt_bc01=('dt_bc01','sum'))\
                          .reset_index()
        bc01_grp.columns = ['job_id','dt_bc01']
    else:
        bc01_grp = pd.DataFrame(columns=['job_id','dt_bc01'])

    # Merge SL + BC01
    merged = df_sl.merge(bc01_grp, on='job_id', how='left')
    merged['dt_bc01'] = merged['dt_bc01'].fillna(0)
    merged['chenh_lech'] = merged['dt_sl'] - merged['dt_bc01']
    merged['check'] = merged['chenh_lech'].apply(
        lambda x: '✅ Khớp' if abs(x) < 1 else f'⚠️ Lệch {x:,.0f}'
    )

    rows = [[
        'Mã Code','Khu vực','Ngày','Tháng VH','Năm VH',
        'Tháng HD','Năm HD','Loại hàng','Nơi đi','Nơi đến','Nghiệp vụ',
        'Số Container','Xe','Ghi chú',
        'Phụ phí SL','Doanh thu SL','Cước SL',
        'Check','Chênh lệch',
        'JOB ID','Lệnh VC','Lái xe','Phân loại',
        'DT BC01'
    ]]

    for _, r in merged.iterrows():
        rows.append([
            r.get('mtc',''),
            r.khu_vuc, r.date, int(r.thang_vh), int(r.nam),
            int(r.thang_hd) if r.thang_hd else '', int(r.nam_hd) if r.nam_hd else '',
            r.loai_hang, r.noi_di, r.noi_den, r.nghiep_vu,
            r.container, r.xe, r.ghi_chu,
            r.phu_phi, r.dt_sl, r.cuoc,
            r.check, r.chenh_lech,
            r.job_id, r.lenh_vc, r.lai_xe, r.phan_loai,
            r.dt_bc01
        ])
    return rows


def main():
    print("🚀 Chạy Check debit...")
    svc = get_service()

    df_sl = load_sl(svc)
    print(f"  SL: {len(df_sl)} chuyến")

    df_bc01 = load_bc01_all(svc)
    print(f"  BC01: {len(df_bc01)} dòng")

    data = check_debit(df_sl, df_bc01)
    print(f"  Kết quả: {len(data)-1} dòng đối chiếu")

    write_sheet(svc, SHEETS['check_debit'], 'A3', data)

    # Báo cáo tóm tắt
    df_result = pd.DataFrame(data[1:], columns=data[0])
    n_ok = df_result[df_result['Check'] == '✅ Khớp'].shape[0]
    n_err = df_result[df_result['Check'] != '✅ Khớp'].shape[0]
    print(f"\n📊 Kết quả đối chiếu:")
    print(f"  ✅ Khớp : {n_ok} chuyến")
    print(f"  ⚠️ Lệch : {n_err} chuyến")

    if n_err > 0 and n_err <= 20:
        print("\n⚠️ Các chuyến lệch (hiển thị tối đa 20):")
        lech = df_result[df_result['Check'] != '✅ Khớp'][['JOB ID','Xe','Doanh thu SL','DT BC01','Chênh lệch']]
        print(lech.head(20).to_string(index=False))
    elif n_err > 20:
        print(f"\n⚠️ Có {n_err} chuyến lệch (quá nhiều để hiển thị)")

    print("\n✅ Xong Check debit!")


if __name__ == '__main__':
    main()
