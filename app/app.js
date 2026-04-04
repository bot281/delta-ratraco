/**
 * Delta Ratraco — Web App JS
 * Nhập Shipment List → Google Apps Script → Ghi vào Google Sheets
 */

// ===== CONFIG =====
// URL này sẽ được cập nhật sau khi deploy Apps Script
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzNHBYiWFBmu7gJ85lhM_g3JL9ZxvrB1pxwctPlYEr35_Z0W_Edp3rvWjVbO28fN0xfIg/exec';

// ===== DANH MỤC =====
let DANH_MUC = {};

async function loadDanhMuc() {
  try {
    const resp = await fetch('../data/master/danh-muc.json');
    DANH_MUC = await resp.json();
  } catch {
    // fallback khi chạy local không có server
    DANH_MUC = {
      khu_vuc: ['Đông Anh','Sóng Thần','Trảng Bom','Bình Minh','Cây Cầy','KA'],
      xe: ['29H-984.14','15C-263.69','29E-104.07'],
      lai_xe: ['Vũ Văn Ngọc','Nguyễn Tiến Nam'],
      nghiep_vu: ['Đóng hàng','Trả hàng','Kết hợp','Tăng bo'],
      phan_loai: ['Chở hàng','Chuyển vỏ'],
      loai_hang: ['Sữa','Bia','Giấy','Thực phẩm','Khác'],
      noi_di: ['Ga Đông Anh','Tiên Sơn','Yên Phong','Khác'],
      noi_den: ['Bãi ga Đông Anh','ICD Sóng Thần','Yên Phong','Khác']
    };
  }
  populateDropdowns();
}

function populateDropdowns() {
  const map = {
    khu_vuc: 'khu_vuc',
    xe: 'xe',
    lai_xe: 'lai_xe',
    noi_di: 'noi_di',
    noi_den: 'noi_den',
    nghiep_vu: 'nghiep_vu',
    loai_hang: 'loai_hang',
    phan_loai: 'phan_loai'
  };
  for (const [key, id] of Object.entries(map)) {
    const sel = document.getElementById(id);
    if (!sel || !DANH_MUC[key]) continue;
    DANH_MUC[key].forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      sel.appendChild(opt);
    });
  }
}

// ===== FORM =====
function initForm() {
  // Mặc định ngày hôm nay
  const dateInput = document.getElementById('date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  // Format số tiền khi blur
  ['cuoc', 'phu_phi'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => {
      if (el.value) el.value = Math.round(parseFloat(el.value) / 1000) * 1000;
    });
  });

  // Auto uppercase container
  document.getElementById('container').addEventListener('input', function() {
    this.value = this.value.toUpperCase();
  });

  // Submit
  document.getElementById('slForm').addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  showStatus('⏳ Đang lưu dữ liệu...', 'loading');

  const payload = collectFormData();

  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script yêu cầu no-cors
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // no-cors không đọc được response → lưu local và thông báo
    saveToLocalHistory(payload);
    renderRecentList();

    showStatus(`✅ Đã lưu chuyến: ${payload.xe} | ${payload.noi_di} → ${payload.noi_den} | ${formatMoney(payload.cuoc)}`, 'success');
    document.getElementById('slForm').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

  } catch (err) {
    showStatus(`❌ Lỗi kết nối: ${err.message}. Dữ liệu đã được lưu tạm cục bộ.`, 'error');
    saveToLocalHistory(payload);
    renderRecentList();
  } finally {
    btn.disabled = false;
  }
}

function collectFormData() {
  const date = document.getElementById('date').value;
  const [year, month] = date.split('-').map(Number);
  const thangHD = document.getElementById('thang_hd').value || month;

  return {
    nam: year,
    thang_vh: month,
    khu_vuc: val('khu_vuc'),
    date: formatDateVN(date),
    xe: val('xe'),
    container: val('container'),
    mtc: val('mtc'),
    delta_ncc: val('delta_ncc'),
    loai_hang: val('loai_hang'),
    noi_di: val('noi_di'),
    noi_den: val('noi_den'),
    nghiep_vu: val('nghiep_vu'),
    cuoc: parseFloat(val('cuoc') || 0),
    phu_phi: parseFloat(val('phu_phi') || 0),
    ghi_chu: val('ghi_chu'),
    job_id: val('job_id'),
    lenh_vc: val('lenh_vc'),
    lai_xe: val('lai_xe'),
    thang_hd: parseInt(thangHD),
    phan_loai: val('phan_loai'),
    nam_hd: year,
    submitted_at: new Date().toISOString(),
  };
}

// ===== VALIDATION =====
function validateForm() {
  const required = ['date','khu_vuc','xe','lai_xe','container','mtc','noi_di','noi_den','loai_hang','nghiep_vu','job_id','cuoc','phan_loai'];
  let ok = true;

  required.forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('error');
    if (!el.value.trim()) {
      el.classList.add('error');
      ok = false;
    }
  });

  if (!ok) showStatus('⚠️ Vui lòng điền đầy đủ các trường bắt buộc (*)', 'error');
  return ok;
}

// ===== LOCAL HISTORY =====
const STORAGE_KEY = 'delta_sl_history';

function saveToLocalHistory(data) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  history.unshift(data);
  // Giữ tối đa 50 bản ghi
  if (history.length > 50) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderRecentList() {
  const container = document.getElementById('recentList');
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

  if (history.length === 0) {
    container.innerHTML = '<p class="empty-text">Chưa có dữ liệu hôm nay...</p>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const todayItems = history.filter(h => h.submitted_at?.startsWith(today));

  if (todayItems.length === 0) {
    container.innerHTML = '<p class="empty-text">Chưa nhập chuyến nào hôm nay</p>';
    return;
  }

  container.innerHTML = todayItems.map(item => `
    <div class="recent-item">
      <span class="date-badge">${item.date || ''}</span>
      <span class="route">🚛 ${item.xe}<br><small>${item.lai_xe}</small></span>
      <span class="route">📍 ${item.noi_di} → ${item.noi_den}<br><small>${item.loai_hang} | ${item.nghiep_vu}</small></span>
      <span class="price">${formatMoney(item.cuoc)}</span>
    </div>
  `).join('');
}

// ===== HELPERS =====
const val = id => document.getElementById(id)?.value?.trim() || '';

function showStatus(msg, type) {
  const el = document.getElementById('statusMsg');
  el.textContent = msg;
  el.className = `status-msg ${type}`;
}

function formatMoney(n) {
  return new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
}

function formatDateVN(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadDanhMuc();
  initForm();
  renderRecentList();
  document.getElementById('userInfo').textContent = 'Delta Team1';
});
