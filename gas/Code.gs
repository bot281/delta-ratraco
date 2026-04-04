/**
 * Google Apps Script — Backend nhận dữ liệu từ Web App
 * Deploy as: Web App → Execute as: Me → Access: Anyone
 *
 * SHEET_ID: 1dQrANVJ6GABaRyhXkJrCreB1w3T8hjzIm3cqjl40hgY
 */

const SHEET_ID = '1dQrANVJ6GABaRyhXkJrCreB1w3T8hjzIm3cqjl40hgY';
const SL_SHEET = 'SL';

// ===== NHẬN DỮ LIỆU TỪ WEB APP =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = appendToSL(data);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', row: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// CORS preflight
function doGet(e) {
  if (e.parameter.action === 'ping') {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Trả về dữ liệu gần nhất nếu cần
  if (e.parameter.action === 'recent') {
    return getRecentRows();
  }
  return ContentService
    .createTextOutput('Delta Ratraco API')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ===== GHI VÀO SHEET SL =====
function appendToSL(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SL_SHEET);

  // Thứ tự cột theo SL (row 4 = header thực):
  // A=Năm, B=Tháng VH, C=KL, D=Khu vực, E=Date, F=Xe, G=Container,
  // H=MTC, I=Delta/NCC, J=Công ty, K=Loại hàng, L=Nơi đi, M=Nơi đến,
  // N=Nghiệp vụ, O=Cước, P=Phụ phí, Q=Ghi chú, R=JOB ID,
  // S=Lệnh VC, T=Lái xe, U=Tháng HD, V=Ghi chú NB, W=Phân loại, X=Năm HD

  const row = [
    data.nam,
    data.thang_vh,
    1,                    // KL luôn = 1 (1 chuyến)
    data.khu_vuc,
    data.date,            // dd/mm/yyyy
    data.xe,
    data.container,
    data.mtc,
    data.delta_ncc || '',
    '',                   // Công ty (để trống, map sau)
    data.loai_hang,
    data.noi_di,
    data.noi_den,
    data.nghiep_vu,
    data.cuoc,
    data.phu_phi || 0,
    data.ghi_chu || '',
    data.job_id,
    data.lenh_vc || '',
    data.lai_xe,
    data.thang_hd,
    '',                   // Ghi chú nội bộ
    data.phan_loai,
    data.nam_hd,
  ];

  sheet.appendRow(row);
  return sheet.getLastRow();
}

// ===== LẤY DỮ LIỆU GẦN NHẤT =====
function getRecentRows() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(SL_SHEET);
  const lastRow = sheet.getLastRow();
  const startRow = Math.max(5, lastRow - 19); // Lấy 20 dòng cuối
  const numRows = lastRow - startRow + 1;

  if (numRows <= 0) {
    return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getRange(startRow, 1, numRows, 24).getValues();
  const headers = ['nam','thang_vh','kl','khu_vuc','date','xe','container','mtc',
                   'delta_ncc','cong_ty','loai_hang','noi_di','noi_den','nghiep_vu',
                   'cuoc','phu_phi','ghi_chu','job_id','lenh_vc','lai_xe',
                   'thang_hd','ghi_chu_nb','phan_loai','nam_hd'];

  const result = data.reverse().map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
