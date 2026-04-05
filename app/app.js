/**
 * Delta Trip Record — Web App JS
 * Nhập chuyến vận chuyển → Google Apps Script → Ghi vào Google Sheets
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzNHBYiWFBmu7gJ85lhM_g3JL9ZxvrB1pxwctPlYEr35_Z0W_Edp3rvWjVbO28fN0xfIg/exec';

// ===== DANH MỤC =====
let DANH_MUC = {};
const FALLBACK_DANH_MUC = {
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

async function loadDanhMuc() {
  try {
    const resp = await fetch(`${GAS_URL}?action=config`);
    if (!resp.ok) throw new Error('Config API lỗi');
    const data = await resp.json();
    DANH_MUC = data?.danh_muc || FALLBACK_DANH_MUC;
  } catch {
    DANH_MUC = FALLBACK_DANH_MUC;
  }
  populateDropdowns();
}

function populateDropdowns() {
  const DROPDOWN_IDS = [
    'nguoi_khai','khu_vuc','xe','lai_xe',
    'noi_di','noi_den','nghiep_vu','loai_hang','phan_loai'
  ];
  for (const id of DROPDOWN_IDS) {
    const sel = document.getElementById(id);
    if (!sel || !DANH_MUC[id]) continue;
    const placeholder = sel.querySelector('option')?.outerHTML || '<option value="">— Chọn —</option>';
    sel.innerHTML = placeholder;
    DANH_MUC[id].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      sel.appendChild(opt);
    });
  }
}

// ===== FORM =====
function initForm() {
  // Mặc định ngày hôm nay
  document.getElementById('date').value = new Date().toISOString().split('T')[0];

  // Format số tiền
  ['cuoc','phu_phi'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      if (el.value) el.value = Math.round(parseFloat(el.value) / 1000) * 1000;
    });
  });

  // Auto uppercase
  ['container','mtc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
  });

  document.getElementById('loadTripBtn').addEventListener('click', loadTripByMTC);
  document.getElementById('genMtcBtn').addEventListener('click', () => suggestNextMTC(true));
  suggestNextMTC(false);

  document.getElementById('slForm').addEventListener('submit', handleSubmit);
  document.getElementById('slForm').addEventListener('reset', () => {
    setTimeout(() => { suggestNextMTC(false); }, 0);
  });
}

async function suggestNextMTC(force = false) {
  const current = val('mtc');
  if (current && !force) return;
  try {
    const resp = await fetch(`${GAS_URL}?action=next_mtc`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (data?.mtc) document.getElementById('mtc').value = data.mtc;
  } catch (_) {}
}

async function loadTripByMTC() {
  const mtc = val('mtc');
  if (!mtc) { showStatus('⚠️ Nhập MTC trước khi gọi trip', 'error'); return; }
  showStatus(`🔎 Đang tìm trip MTC: ${mtc}...`, 'loading');
  try {
    const resp = await fetch(`${GAS_URL}?action=trip&mtc=${encodeURIComponent(mtc)}`);
    if (!resp.ok) throw new Error('Không gọi được API trip');
    const data = await resp.json();
    if (!data?.found) {
      showStatus(`ℹ️ Chưa có trip MTC ${mtc} — sẽ tạo mới khi lưu.`, 'loading');
      return;
    }
    fillFormFromTrip(data.trip || {});
    showStatus(`✅ Đã nạp trip MTC ${mtc}. Chỉnh thêm rồi bấm Lưu để bổ sung.`, 'success');
  } catch (err) {
    showStatus(`❌ Không tải được trip: ${err.message}`, 'error');
  }
}

function fillFormFromTrip(trip) {
  const FIELDS = [
    'nguoi_khai','khu_vuc','xe','container','mtc','delta_ncc',
    'loai_hang','noi_di','noi_den','nghiep_vu',
    'cuoc','phu_phi','ghi_chu','job_id','lai_xe','thang_hd','phan_loai'
  ];
  FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    const v = trip[key];
    if (v !== undefined && v !== null && `${v}` !== '') el.value = `${v}`;
  });
  if (trip.date) {
    const iso = toISODate(trip.date);
    if (iso) document.getElementById('date').value = iso;
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  showStatus('⏳ Đang lưu dữ liệu...', 'loading');

  const payload = collectFormData();

  try {
    await fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    saveToLocalHistory(payload);
    renderRecentList();
    showStatus(`✅ Đã lưu trip MTC ${payload.mtc || '(auto)'} — ${payload.noi_di} → ${payload.noi_den}`, 'success');
    suggestNextMTC(true);
  } catch (err) {
    showStatus(`❌ Lỗi kết nối: ${err.message}. Đã lưu tạm cục bộ.`, 'error');
    saveToLocalHistory(payload);
    renderRecentList();
  } finally {
    btn.disabled = false;
  }
}

function collectFormData() {
  const date = document.getElementById('date').value;
  const [year, month] = date.split('-').map(Number);
  const thangHD = document.getElementById('thang_hd')?.value || month;
  const cuoc = val('cuoc');
  const phu_phi = val('phu_phi');
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
    cuoc: cuoc === '' ? '' : parseFloat(cuoc),
    phu_phi: phu_phi === '' ? '' : parseFloat(phu_phi),
    ghi_chu: val('ghi_chu'),
    job_id: val('job_id'),
    lai_xe: val('lai_xe'),
    thang_hd: parseInt(thangHD),
    phan_loai: val('phan_loai'),
    nam_hd: year,
    nguoi_khai: val('nguoi_khai'),
    submitted_at: new Date().toISOString(),
  };
}

// ===== VALIDATION =====
function validateForm() {
  // Các trường bắt buộc (KHÔNG có job_id, cuoc)
  const required = [
    'nguoi_khai','date','khu_vuc','xe','lai_xe',
    'container','noi_di','noi_den','loai_hang','nghiep_vu','phan_loai'
  ];
  let ok = true;
  required.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('error');
    if (!el.value.trim()) { el.classList.add('error'); ok = false; }
  });
  if (!ok) showStatus('⚠️ Vui lòng điền đầy đủ các trường bắt buộc (*)', 'error');
  return ok;
}

// ===== LOCAL HISTORY =====
const STORAGE_KEY = 'delta_trip_record_history';

function saveToLocalHistory(data) {
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  history.unshift(data);
  if (history.length > 50) history.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderRecentList() {
  const container = document.getElementById('recentList');
  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!history.length) {
    container.innerHTML = '<p class="empty-text">Chưa có dữ liệu hôm nay...</p>';
    return;
  }
  const today = new Date().toISOString().split('T')[0];
  const todayItems = history.filter(h => h.submitted_at?.startsWith(today));
  if (!todayItems.length) {
    container.innerHTML = '<p class="empty-text">Chưa nhập chuyến nào hôm nay</p>';
    return;
  }
  container.innerHTML = todayItems.map(item => `
    <div class="recent-item">
      <span class="date-badge">${item.date || ''}</span>
      <span class="route">🚛 ${item.xe}<br><small>${item.lai_xe}</small></span>
      <span class="route">📍 ${item.noi_di} → ${item.noi_den}<br><small>${item.loai_hang} | ${item.nghiep_vu}</small></span>
      <span class="price">${item.cuoc ? formatMoney(item.cuoc) : '—'}</span>
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

function toISODate(vnOrDate) {
  if (!vnOrDate) return '';
  if (vnOrDate.includes('T')) return vnOrDate.split('T')[0]; // ISO
  if (!vnOrDate.includes('/')) return '';
  const [d, m, y] = vnOrDate.split('/');
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadDanhMuc();
  initForm();
  renderRecentList();
});
