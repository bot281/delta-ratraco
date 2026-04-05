/**
 * Google Apps Script — Delta Trip Record Backend
 * Deploy as: Web App → Execute as: Me → Access: Anyone
 * v6 — nguoi_khai, column-oriented APP_CONFIG, bỏ lenh_vc
 */

const SHEET_ID = '1dQrANVJ6GABaRyhXkJrCreB1w3T8hjzIm3cqjl40hgY';
const SL_SHEET = 'SL';
const CONFIG_SHEET = 'APP_CONFIG';
const SL_DATA_START_ROW = 5;
const SL_MTC_COL = 8;      // Cột H = MTC
const SL_TOTAL_COLS = 25;  // A-Y (thêm col Y = nguoi_khai)

// Thứ tự cột A-Y trong sheet SL
const SL_HEADERS = [
  'nam','thang_vh','kl','khu_vuc','date','xe','container','mtc',
  'delta_ncc','cong_ty','loai_hang','noi_di','noi_den','nghiep_vu',
  'cuoc','phu_phi','ghi_chu','job_id','lenh_vc','lai_xe',
  'thang_hd','ghi_chu_nb','phan_loai','nam_hd',
  'nguoi_khai'   // col Y — thêm mới
];

const DEFAULT_DANH_MUC = {
  khu_vuc:   ['Đông Anh','Sóng Thần','Trảng Bom','Bình Minh','Cây Cầy','KA'],
  xe:        ['29H-984.14','15C-263.69','29E-104.07'],
  lai_xe:    ['Vũ Văn Ngọc','Nguyễn Tiến Nam'],
  nghiep_vu: ['Đóng hàng','Trả hàng','Kết hợp','Tăng bo'],
  phan_loai: ['Chở hàng','Chuyển vỏ'],
  loai_hang: ['Sữa','Bia','Giấy','Thực phẩm','Khác'],
  noi_di:    ['Ga Đông Anh','Tiên Sơn','Yên Phong','Khác'],
  noi_den:   ['Bãi ga Đông Anh','ICD Sóng Thần','Yên Phong','Khác'],
  nguoi_khai:[]
};

// ===== CACHE =====
let _ss = null;
function getSS() {
  if (!_ss) _ss = SpreadsheetApp.openById(SHEET_ID);
  return _ss;
}
function getSheet(name) {
  const sh = getSS().getSheetByName(name);
  if (!sh) throw new Error(`Không tìm thấy sheet: ${name}`);
  return sh;
}

// ===== ROUTING =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const result = upsertTripByMTC(data);
    return json({ status: 'ok', ...result });
  } catch (err) {
    return json({ status: 'error', message: err.message });
  }
}

function doGet(e) {
  const action = e?.parameter?.action || '';
  if (action === 'ping')     return json({ status: 'ok', version: 6 });
  if (action === 'recent')   return getRecentRows();
  if (action === 'config')   return json({ status: 'ok', danh_muc: getConfigDanhMuc() });
  if (action === 'next_mtc') return json({ status: 'ok', mtc: generateNextMTC() });
  if (action === 'trip')     return getTripByMTC(e?.parameter?.mtc || '');
  return ContentService.createTextOutput('Delta Trip Record API v6').setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===== APP CONFIG — column-oriented format =====
// Row 1: tên trường | Row 2+: options
function getConfigDanhMuc() {
  const sheet = getSS().getSheetByName(CONFIG_SHEET);
  if (!sheet) return DEFAULT_DANH_MUC;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return DEFAULT_DANH_MUC;

  const headers = data[0];
  const result = {};

  headers.forEach((h, colIdx) => {
    const key = String(h || '').trim();
    if (!key) return;
    result[key] = [];
    for (let row = 1; row < data.length; row++) {
      const v = String(data[row][colIdx] || '').trim();
      if (v) result[key].push(v);
    }
  });

  // Fallback cho trường nào chưa có trong config
  Object.keys(DEFAULT_DANH_MUC).forEach(k => {
    if (!result[k] || result[k].length === 0) result[k] = DEFAULT_DANH_MUC[k];
  });

  return result;
}

// ===== TÌM KIẾM MTC (TextFinder — nhanh) =====
function findRowByMTC(sheet, mtc) {
  const finder = sheet.createTextFinder(mtc.trim()).matchCase(false).matchEntireCell(true);
  let lastMatchRow = null;
  for (const r of finder.findAll()) {
    if (r.getColumn() === SL_MTC_COL && r.getRow() >= SL_DATA_START_ROW) {
      if (!lastMatchRow || r.getRow() > lastMatchRow) lastMatchRow = r.getRow();
    }
  }
  return lastMatchRow;
}

// ===== SINH MTC TỰ ĐỘNG (standalone — dùng khi gọi riêng endpoint next_mtc) =====
function generateNextMTC() {
  const sheet = getSheet(SL_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < SL_DATA_START_ROW) return 'RTC01';
  const vals = sheet.getRange(SL_DATA_START_ROW, SL_MTC_COL, lastRow - SL_DATA_START_ROW + 1, 1).getValues().flat();
  return generateNextMTCFromVals(vals);
}

// ===== TRIP UPSERT THEO MTC =====
function upsertTripByMTC(data) {
  const sheet = getSheet(SL_SHEET);

  // Đọc toàn bộ cột H MỘT LẦN — dùng cho cả lookup, next_mtc, và last data row
  const lastSheetRow = sheet.getLastRow();
  const hVals = lastSheetRow >= SL_DATA_START_ROW
    ? sheet.getRange(SL_DATA_START_ROW, SL_MTC_COL, lastSheetRow - SL_DATA_START_ROW + 1, 1).getValues().flat()
    : [];

  let mtc = String(data.mtc || '').trim();
  if (!mtc) {
    mtc = generateNextMTCFromVals(hVals);
    data.mtc = mtc;
  }

  // Validate nguoi_khai
  const nguoiKhai = String(data.nguoi_khai || '').trim();
  if (nguoiKhai) {
    const dm = getConfigDanhMuc();
    const allowedList = dm.nguoi_khai || [];
    if (allowedList.length > 0 && !allowedList.includes(nguoiKhai)) {
      throw new Error(`Người khai báo "${nguoiKhai}" không có trong danh sách được phép`);
    }
  }

  const incoming = buildRowData(data);

  // Tìm row hiện có theo MTC
  const search = mtc.toUpperCase().trim();
  let foundRow = null;
  for (let i = hVals.length - 1; i >= 0; i--) {
    if (String(hVals[i] || '').trim().toUpperCase() === search) {
      foundRow = i + SL_DATA_START_ROW;
      break;
    }
  }

  if (foundRow) {
    const oldRow = sheet.getRange(foundRow, 1, 1, SL_TOTAL_COLS).getValues()[0];
    const merged = mergeRow(oldRow, incoming);

    // Xử lý nguoi_khai: ghép nhiều tên với " ,"
    if (nguoiKhai) {
      const names = String(oldRow[24] || '').split(' ,').map(s => s.trim()).filter(Boolean);
      if (!names.includes(nguoiKhai)) names.push(nguoiKhai);
      merged[24] = names.join(' ,');
    }

    // Chỉ update các cột thay đổi để tránh bị block bởi data validation ở cột không liên quan
    for (let i = 0; i < SL_TOTAL_COLS; i++) {
      const oldVal = String(oldRow[i] ?? '');
      const newVal = String(merged[i] ?? '');
      if (oldVal !== newVal) {
        sheet.getRange(foundRow, i + 1).setValue(merged[i]);
      }
    }
    return { action: 'updated', row: foundRow, mtc };
  }

  // Tìm row data cuối thực sự (last non-empty value trong cột H)
  let lastDataRow = SL_DATA_START_ROW - 1;
  for (let i = hVals.length - 1; i >= 0; i--) {
    if (String(hVals[i] || '').trim()) { lastDataRow = i + SL_DATA_START_ROW; break; }
  }
  const insertRow = lastDataRow + 1;

  // Ghi từng cell (giống update) để bypass data validation cũ trong sheet
  for (let i = 0; i < SL_TOTAL_COLS; i++) {
    const v = incoming[i];
    if (v !== '' && v !== null && v !== undefined) {
      sheet.getRange(insertRow, i + 1).setValue(v);
    }
  }
  return { action: 'created', row: insertRow, mtc };
}

// Tách riêng để dùng từ doGet (next_mtc endpoint)
function generateNextMTCFromVals(hVals) {
  const stats = {};
  hVals.forEach(v => {
    const m = String(v || '').trim().match(/^([A-Za-z]+)(\d+)$/);
    if (!m) return;
    const prefix = m[1].toUpperCase(), num = Number(m[2]), width = m[2].length;
    if (!stats[prefix]) stats[prefix] = { count: 0, max: 0, width };
    stats[prefix].count++;
    if (num > stats[prefix].max) stats[prefix].max = num;
    if (width > stats[prefix].width) stats[prefix].width = width;
  });
  if (!Object.keys(stats).length) return 'RTC01';
  const [prefix, info] = Object.entries(stats).sort((a,b) =>
    b[1].count !== a[1].count ? b[1].count - a[1].count : b[1].max - a[1].max)[0];
  return `${prefix}${String(info.max + 1).padStart(info.width, '0')}`;
}

function buildRowData(data) {
  return [
    safe(data.nam), safe(data.thang_vh), 1,
    safe(data.khu_vuc), safe(data.date), safe(data.xe),
    safe(data.container), safe(data.mtc), safe(data.delta_ncc), safe(data.cong_ty),
    safe(data.loai_hang), safe(data.noi_di), safe(data.noi_den),
    safe(data.nghiep_vu), safe(data.cuoc), safe(data.phu_phi),
    safe(data.ghi_chu), safe(data.job_id),
    '',                   // lenh_vc — giữ cột nhưng không dùng
    safe(data.lai_xe), safe(data.thang_hd), '',
    safe(data.phan_loai), safe(data.nam_hd),
    safe(data.nguoi_khai) // col Y
  ];
}

function mergeRow(oldRow, newRow) {
  const allowBlank = new Set([8, 10, 15, 16, 18, 21]);
  // nguoi_khai (idx 24) xử lý riêng ở upsertTripByMTC
  return oldRow.map((oldVal, idx) => {
    if (idx === 24) return oldVal; // handled separately
    const n = newRow[idx];
    if (n === null || n === undefined) return oldVal;
    if (`${n}`.trim() === '' && !allowBlank.has(idx)) return oldVal;
    return n;
  });
}

function getTripByMTC(mtc) {
  const query = String(mtc || '').trim();
  if (!query) return json({ status: 'ok', found: false });
  const sheet = getSheet(SL_SHEET);
  const rowNum = findRowByMTC(sheet, query);
  if (!rowNum) return json({ status: 'ok', found: false, mtc: query });
  const row = sheet.getRange(rowNum, 1, 1, SL_TOTAL_COLS).getValues()[0];
  const trip = Object.fromEntries(SL_HEADERS.map((h, i) => [h, row[i]]));
  return json({ status: 'ok', found: true, row: rowNum, trip });
}

// ===== DỮ LIỆU GẦN NHẤT =====
function getRecentRows() {
  const sheet = getSheet(SL_SHEET);
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(SL_DATA_START_ROW, lastRow - 19);
  const numRows = lastRow - startRow + 1;
  if (numRows <= 0) return json([]);
  const data = sheet.getRange(startRow, 1, numRows, SL_TOTAL_COLS).getValues();
  return json(data.reverse().map(row => Object.fromEntries(SL_HEADERS.map((h, i) => [h, row[i]]))));
}

function safe(v) { return v === undefined || v === null ? '' : v; }
