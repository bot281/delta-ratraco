"""
Cấu hình chung cho tất cả scripts
"""
import os
from dotenv import load_dotenv

load_dotenv()

SHEET_ID = '1dQrANVJ6GABaRyhXkJrCreB1w3T8hjzIm3cqjl40hgY'

# Tên các sheet
SHEETS = {
    'sl': 'SL',
    'check_debit': 'Check debit',
    'bang_ke': 'Bảng kê-1',
    'hoa_don': 'Hóa đơn',
    'bg': 'BG',
    'bao_cao': 'Bao cao',
    'bc_ngay': 'BC ngày',
    'bc_xe': 'BC xe',
    'thong_ke': 'Thống kê',
    'bc01_1': 'BC01-1',
    'bc01_th1': 'BC01-TH1',
    'bc01_2': 'BC01-2',
    'bc02_th1': 'BC02-TH1',
    'bc01_3': 'BC01-3',
    'bc03_th1': 'BC03-TH1',
}

# Cột SL (0-indexed)
SL_COLS = {
    'nam': 0, 'thang_vh': 1, 'kl': 2, 'khu_vuc': 3,
    'date': 4, 'xe': 5, 'container': 6, 'mtc': 7,
    'delta_ncc': 8, 'cong_ty': 9, 'loai_hang': 10,
    'noi_di': 11, 'noi_den': 12, 'nghiep_vu': 13,
    'cuoc': 14, 'phu_phi': 15, 'ghi_chu': 16,
    'job_id': 17, 'lenh_vc': 18, 'lai_xe': 19,
    'thang_hd': 20, 'ghi_chu_nb': 21, 'phan_loai': 22, 'nam_hd': 23,
}

# Google Service Account key (từ GitHub Secret)
SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE', 'service-account.json')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
