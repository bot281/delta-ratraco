/**
 * Google Apps Script — Backend nhận dữ liệu từ Web App
 * Deploy as: Web App → Execute as: Me → Access: Anyone
 */

const SHEET_ID = '1dQrANVJ6GABaRyhXkJrCreB1w3T8hjzIm3cqjl40hgY';
const SL_SHEET = 'SL';
const CONFIG_SHEET = 'APP_CONFIG';

const SL_HEADERS = [
  'nam','thang_vh','kl','khu_vuc','date','xe','container','mtc',
  'delta_ncc','cong_ty','loai_hang','noi_di','noi_den','nghiep_vu',
  'cuoc','phu_phi','ghi_chu','job_id','lenh_vc','lai_xe',
  'thang_hd','ghi_chu_nb','phan_loai','nam_hd'
];

const DEFAULT_DANH_MUC = {
  khu_vuc: ['Đông Anh','Sóng Thần','Trảng Bom','Bình Minh','Cây Cầy','KA'],
  xe: ['29H-984.14','15C-263.69','29E-104.07'],
  lai_xe: ['Vũ Văn Ngọc','Nguyễn Tiến Nam'],
  nghiep_vu: ['Đóng hàng','Trả hàng','Kết hợp','Tăng bo'],
  phan_loai: ['Chở hàng','Chuyển vỏ'],
  loai_hang: ['Sữa','Bia','Giấy','Thực phẩm','Khác'],
  noi_di: ['Ga Đông Anh','Tiên Sơn','Yên Phong','Khác'],
  noi_den: ['Bãi ga Đông Anh','ICD Sóng Thần','Yên Phong','Khác']
};

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
  if (action === 'ping') return json({ status: 'ok' });
  if (action === 'recent') return getRecentRows();
  if (action === 'config') return json({ status: 'ok', danh_muc: getConfigDanhMuc() });
  if (action === 'next_mtc') return json({ status: 'ok', mtc: generateNextMTC() });
  if (action === 'trip') return getTripByMTC(e?.parameter?.mtc || '');
  return ContentService.createTextOutput('Delta Ratraco API').setMimeType(ContentService.MimeType.TEXT);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== TRIP UPSERT THEO MTC =====
function upsertTripByMTC(data) {
  let mtc = String(data.mtc || '').trim();
  if (!mtc) {
    mtc = generateNextMTC();
    data.mtc = mtc;
  }

  const sheet = getSheet(SL_SHEET);
  const incoming = buildRowData(data);
  const foundRow = findRowByMTC(sheet, mtc);

  if (foundRow) {
    const oldRow = sheet.getRange(foundRow, 1, 1, 24).getValues()[0];
    const merged = mergeRow(oldRow, incoming);
    sheet.getRange(foundRow, 1, 1, 24).setValues([merged]);
    return { action: 'updated', row: foundRow, mtc };
  }

  sheet.appendRow(incoming);
  return { action: 'created', row: sheet.getLastRow(), mtc };
}

function buildRowData(data) {
  return [
    safe(data.nam),
    safe(data.thang_vh),
    1,
    safe(data.khu_vuc),
    safe(data.date),
    safe(data.xe),
    safe(data.container),
    safe(data.mtc),
    safe(data.delta_ncc),
    '',
    safe(data.loai_hang),
    safe(data.noi_di),
    safe(data.noi_den),
    safe(data.nghiep_vu),
    safe(data.cuoc),
    safe(data.phu_phi),
    safe(data.ghi_chu),
    safe(data.job_id),
    safe(data.lenh_vc),
    safe(data.lai_xe),
    safe(data.thang_hd),
    '',
    safe(data.phan_loai),
    safe(data.nam_hd),
  ];
}

function mergeRow(oldRow, newRow) {
  const keepBlankColumns = [8, 10, 15, 16, 18, 21]; // các cột cho phép rỗng
  return oldRow.map((oldVal, idx) => {
    const n = newRow[idx];
    if (n === null || n === undefined) return oldVal;
    if (`${n}`.trim() === '' && !keepBlankColumns.includes(idx)) return oldVal;
    return n;
  });
}

function findRowByMTC(sheet, mtc) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 5) return null;
  const values = sheet.getRange(5, 8, lastRow - 4, 1).getValues(); // col H = MTC
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0] || '').trim().toUpperCase() === mtc.toUpperCase()) {
      return i + 5;
    }
  }
  return null;
}

function generateNextMTC() {
  const sheet = getSheet(SL_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 5) return 'RTC01';

  const values = sheet.getRange(5, 8, lastRow - 4, 1).getValues().flat().map(v => String(v || '').trim()).filter(Boolean);
  const stats = {};

  values.forEach(v => {
    const m = v.match(/^([A-Za-z]+)(\d+)$/);
    if (!m) return;
    const prefix = m[1].toUpperCase();
    const num = Number(m[2]);
    const width = m[2].length;
    if (!stats[prefix]) stats[prefix] = { count: 0, max: 0, width: width };
    stats[prefix].count += 1;
    if (num > stats[prefix].max) stats[prefix].max = num;
    if (width > stats[prefix].width) stats[prefix].width = width;
  });

  if (!Object.keys(stats).length) return 'RTC01';

  const sorted = Object.entries(stats).sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return b[1].max - a[1].max;
  });

  const [prefix, info] = sorted[0];
  const nextNum = info.max + 1;
  const numText = String(nextNum).padStart(info.width, '0');
  return `${prefix}${numText}`;
}

function getTripByMTC(mtc) {
  const query = String(mtc || '').trim();
  if (!query) return json({ status: 'ok', found: false });

  const sheet = getSheet(SL_SHEET);
  const rowNum = findRowByMTC(sheet, query);
  if (!rowNum) return json({ status: 'ok', found: false, mtc: query });

  const row = sheet.getRange(rowNum, 1, 1, 24).getValues()[0];
  const trip = Object.fromEntries(SL_HEADERS.map((h, i) => [h, row[i]]));
  return json({ status: 'ok', found: true, row: rowNum, trip });
}

// ===== APP CONFIG =====
function getConfigDanhMuc() {
  const sheet = ensureConfigSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return DEFAULT_DANH_MUC;

  const rows = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const result = {};

  rows.forEach(r => {
    const key = String(r[0] || '').trim();
    const value = String(r[1] || '').trim();
    const active = String(r[2] || 'TRUE').toUpperCase() !== 'FALSE';
    if (!key || !value || !active) return;
    if (!result[key]) result[key] = [];
    result[key].push(value);
  });

  // fallback key nào thiếu
  Object.keys(DEFAULT_DANH_MUC).forEach(k => {
    if (!result[k] || result[k].length === 0) result[k] = DEFAULT_DANH_MUC[k];
  });

  return result;
}

function ensureConfigSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG_SHEET);
  if (sheet) return sheet;

  sheet = ss.insertSheet(CONFIG_SHEET);
  sheet.getRange(1, 1, 1, 5).setValues([['field_key', 'option_value', 'is_active', 'sort_order', 'note']]);

  const rows = [];
  Object.keys(DEFAULT_DANH_MUC).forEach(key => {
    DEFAULT_DANH_MUC[key].forEach((val, idx) => {
      rows.push([key, val, true, idx + 1, '']);
    });
  });
  if (rows.length) sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  return sheet;
}

// ===== DỮ LIỆU GẦN NHẤT =====
function getRecentRows() {
  const sheet = getSheet(SL_SHEET);
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(5, lastRow - 19);
  const numRows = lastRow - startRow + 1;

  if (numRows <= 0) return json([]);

  const data = sheet.getRange(startRow, 1, numRows, 24).getValues();
  const result = data.reverse().map(row => Object.fromEntries(SL_HEADERS.map((h, i) => [h, row[i]])));
  return json(result);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Không tìm thấy sheet: ${name}`);
  return sh;
}

function safe(v) {
  return v === undefined || v === null ? '' : v;
}
