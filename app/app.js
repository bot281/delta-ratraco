/**
 * Delta Trip Record — Web App JS
 * Nhập chuyến vận chuyển → Google Apps Script → Ghi vào Google Sheets
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzNHBYiWFBmu7gJ85lhM_g3JL9ZxvrB1pxwctPlYEr35_Z0W_Edp3rvWjVbO28fN0xfIg/exec';

// ===== DANH MỤC =====
let DANH_MUC = {};
// Danh mục nhúng trực tiếp (đồng bộ từ sheet APP_CONFIG 24/07/2026).
// Workspace delta.com.vn chặn web app 'Anyone' nên frontend không gọi được GAS config → dùng list này.
const FALLBACK_DANH_MUC = {
  khu_vuc: ["Đông Anh", "Sóng Thần", "Trảng Bom", "Bình Minh", "Cây Cầy", "KA", "Thiên Đức", "VTT", "HMP"],
  xe: ["15C-263.16", "15C-263.69", "15C-265.60", "15C-300.89", "15C-312.15", "15C-313.95", "15C-322.59", "15C-322.84", "15H-031.33", "15H-054.17", "15H-112.83", "16C-265.60", "29C-105.06", "29C-448.52", "29C-488.52", "29C-578.66", "29C-578.88", "29C-579.12", "29C-579.15", "29E-103.24", "29E-103.48", "29E-104.07", "29E-104.45", "29E-104.50", "29E-105.06", "29E-352.27", "29E-353.52", "29E-354.32", "29E-429.53", "29E-469.14", "29E-469.49", "29H-984.14", "50E-152.31", "50E-196.22", "50E-322.32", "50E-525.73", "50E-640.44", "50E-645.50", "50E-658.27", "50E-658.42", "51H-717.39", "51H-718.29", "60C-125.55", "60C-402.40", "60C-453.36", "60H-006.84", "61C-145.49", "61C-248.22", "61C-248.95", "29C-578.15", "29E-691.17", "50E-649.83", "29E-656.18", "29C-579.03", "59E-649.83", "29E-692.21", "29C-452.90", "50E-322.33"],
  lai_xe: ["Vũ Văn Ngọc", "Nguyễn Tiến Nam", "Lê Văn Quân", "Vũ Trọng Liêm", "Nguyễn Sơn Bình", "Lê Công Trình", "Nguyễn Duy Khánh", "Nguyễn Kim Trọng", "Phạm Nhất Linh", "Nguyễn Sĩ Sơn", "Trịnh Lê Hoàng Vũ", "Lê Anh Tuấn", "Nguyễn Việt Thường", "Vũ Thanh Phong", "Nguyễn Văn Nghĩa", "Lục Văn Mạnh", "Bùi Trung Thuỷ", "Đặng Xuân Tân", "Nguyễn Văn Hành", "Nguyễn Văn Bạn", "Vũ Trọng Hạnh", "Nhữ Văn Mạnh", "Vũ Trọng Hạnh", "Nguyễn Văn Cường", "Nguyễn Văn Đức", "Ngô Văn Vũ", "Vũ Văn Thạch", "Hoàng Văn Chương", "Nguyễn Thành Muôn", "Nguyễn Mạnh Hùng", "Ngô Văn Vitamin", "Nguyễn Văn Việt", "Vũ Văn Tuấn"],
  nghiep_vu: ["Đóng hàng", "Trả hàng", "Kết hợp", "Tăng bo", "Chuyển kho"],
  phan_loai: ["Chở hàng", "Chuyển vỏ"],
  loai_hang: ["Sữa", "Bia", "Giấy", "Thực phẩm", "Khác", "NCA", "Đường", "Bột phụ gia", "Nhôm", "Dầu", "Bột giặt", "Giấy cuộn", "Ván gỗ", "Vải", "Xúc xích lạnh", "Mút cuộn", "Nước tăng lực", "Dầu nhớt", "Bách hóa", "Gia vị", "Nước ngọt", "Bánh kẹo", "Bột giặt Lix", "TACN", "Tấm pin NL", "Xà phòng", "TP chức năng", "Pin", "Tinh bột sắn", "Thép lá", "Xe máy", "Cà phê XK", "NCA", "Phô Mai", "Thực Phẩm LCS", "Bột Phụ Gia", "Cháo", "Hạt Nhựa", "Bột ngọt", "Mỹ phẩm", "Hàng tiêu dùng", "Hạt Điều", "Sơn", "Thú nhồi bông", "Dầu ăn", "Điện tử", "TBCN", "Nguyên liệu", "Chuối lạnh", "Giày dép", "TBYT", "PTXM", "Bao Bì", "Vỏ chai", "Comfor", "Hạt phỉ", "Bột Mỳ", "Mỳ tôm", "Hạt hạnh nhân", "LKĐT", "Cao su tổng hợp", "Knoor - Foods", "Vải sợi", "Trái cây lạnh", "Linh Kiện Đóng Thùng", "Kem P/S", "Thuốc XK LVQT"],
  noi_di: ["727 Âu Cơ, Tân Thành, TP Hồ Chí Minh", "Amata", "An Phú Đông, TP Hồ Chí Minh", "An Sương, Q 12", "An Sương, TP Hồ Chí Minh", "Biên Hòa", "Biên Hòa, Đồng Nai", "Biên Hòa, Đồng Nai (Kho Vĩnh Cường)", "Biên Hòa, Đồng Nai (Nhà máy Ajinomoto)", "Biên Hòa, Đồng Nai (Tổng kho Tiền Nga)", "Bãi ga Đông Anh", "Bãi vỏ container Yên Viên", "Bãi vỏ container Đông Anh", "Bình Chánh, TP Hồ Chí Minh", "Bình Giang", "Bình Hòa, TP Hồ Chí Minh", "Bình Hòa, TP Hồ Chí Minh (Công ty Kinh Đô Mondolez)", "Bình Hòa, TP Hồ Chí Minh (Kho An Thạnh)", "Bình Hòa, TP Hồ Chí Minh (Kho Friesland)", "Bình Hòa, TP Hồ Chí Minh (Kho Ích Thành)", "Bình Mỹ, TP Hồ Chí Minh", "Bình Phú, Đồng Tháp", "Bình Xuyên", "Bình Xuyên, Phú Thọ", "Bầu Hàm, Đồng Nai", "Bắc Tân Uyên", "Bắc Tân Uyên, TP Hồ Chí Minh", "Bến Cát", "Bến Lức", "Bến Tre", "Bến Tre, Vĩnh Long", "Cai Lậy, Tiền Giang", "Cai Lậy, Đồng Tháp", "Châu Thành", "Châu Thành, Đồng Tháp", "Chương Mỹ", "Chương Mỹ, Hà Nội", "Cát Lái , TP Hồ Chí Minh", "Cát Lái, Q 2", "Cảng Bến Nghé, TP Hồ Chí Minh", "Cảng Cái Mép", "Cảng Cái Mép, TP Hồ Chí Minh", "Cảng Hà Nội", "Cảng Hải Phòng", "Cảng ICD Phước Long 3, TP Hồ Chí Minh", "Cảng Tân Thuận, TP Hồ Chí Minh", "Cần Giuộc, Long An", "Cần Giuộc, Tây Ninh", "Cần Giuộc, Tây Ninh (Kho AJ)", "Cần Giuộc, Tây Ninh (Kho Develling)", "Cần Giuộc, Tây Ninh (Kho Kizuna + TTC)", "Cầu Khai, Yên bái (hạ hàng Yên viên)", "Cổ Loa, Hà Nội", "Cụm CN Tân Dân", "Cụm CN Tân Dân, Huyện Chí Linh", "Cụm công nghiệp Thanh Oai", "Cụm công nghiệp Thanh Oai, Hà Nội", "Củ Chi", "Củ Chi, TP Hồ Chí Minh", "Củ Chi, TP Hồ Chí Minh (Kho Linfox)", "Cửa khẩu Mộc Bài", "Cửa khẩu Mộc Bài, Tây Ninh", "Duy Tiên", "Duy Tiên, Ninh Bình", "Dĩ An Bình Dương", "Dĩ An, TP Hồ Chí Minh", "Dĩ An, TP Hồ Chí Minh (Kho Toàn Phát)", "Dĩ An, TP Hồ Chí Minh (Kho Đông Á)", "Dương Xá"],
  noi_den: ["727 Âu Cơ, Tân Thành, TP Hồ Chí Minh", "Amata", "An Phú Đông, TP Hồ Chí Minh", "An Sương, Q 12", "An Sương, TP Hồ Chí Minh", "Biên Hòa", "Biên Hòa, Đồng Nai", "Biên Hòa, Đồng Nai (Kho Vĩnh Cường)", "Biên Hòa, Đồng Nai (Nhà máy Ajinomoto)", "Biên Hòa, Đồng Nai (Tổng kho Tiền Nga)", "Bãi ga Đông Anh", "Bãi vỏ container Yên Viên", "Bãi vỏ container Đông Anh", "Bình Chánh, TP Hồ Chí Minh", "Bình Giang", "Bình Hòa, TP Hồ Chí Minh", "Bình Hòa, TP Hồ Chí Minh (Công ty Kinh Đô Mondolez)", "Bình Hòa, TP Hồ Chí Minh (Kho An Thạnh)", "Bình Hòa, TP Hồ Chí Minh (Kho Friesland)", "Bình Hòa, TP Hồ Chí Minh (Kho Ích Thành)", "Bình Mỹ, TP Hồ Chí Minh", "Bình Phú, Đồng Tháp", "Bình Xuyên", "Bình Xuyên, Phú Thọ", "Bầu Hàm, Đồng Nai", "Bắc Tân Uyên", "Bắc Tân Uyên, TP Hồ Chí Minh", "Bến Cát", "Bến Lức", "Bến Tre", "Bến Tre, Vĩnh Long", "Cai Lậy, Tiền Giang", "Cai Lậy, Đồng Tháp", "Châu Thành", "Châu Thành, Đồng Tháp", "Chương Mỹ", "Chương Mỹ, Hà Nội", "Cát Lái , TP Hồ Chí Minh", "Cát Lái, Q 2", "Cảng Bến Nghé, TP Hồ Chí Minh", "Cảng Cái Mép", "Cảng Cái Mép, TP Hồ Chí Minh", "Cảng Hà Nội", "Cảng Hải Phòng", "Cảng ICD Phước Long 3, TP Hồ Chí Minh", "Cảng Tân Thuận, TP Hồ Chí Minh", "Cần Giuộc, Long An", "Cần Giuộc, Tây Ninh", "Cần Giuộc, Tây Ninh (Kho AJ)", "Cần Giuộc, Tây Ninh (Kho Develling)", "Cần Giuộc, Tây Ninh (Kho Kizuna + TTC)", "Cầu Khai, Yên bái (hạ hàng Yên viên)", "Cổ Loa, Hà Nội", "Cụm CN Tân Dân", "Cụm CN Tân Dân, Huyện Chí Linh", "Cụm công nghiệp Thanh Oai", "Cụm công nghiệp Thanh Oai, Hà Nội", "Củ Chi", "Củ Chi, TP Hồ Chí Minh", "Củ Chi, TP Hồ Chí Minh (Kho Linfox)", "Cửa khẩu Mộc Bài", "Cửa khẩu Mộc Bài, Tây Ninh", "Duy Tiên", "Duy Tiên, Ninh Bình", "Dĩ An Bình Dương", "Dĩ An, TP Hồ Chí Minh", "Dĩ An, TP Hồ Chí Minh (Kho Toàn Phát)", "Dĩ An, TP Hồ Chí Minh (Kho Đông Á)", "Dương Xá"],
  nguoi_khai: ["Tô Vũ", "Nguyễn Cao Thăng", "Nguyễn Thị Thùy Dương", "Nguyễn Duy Khánh", "Lê Thị Quế", "Lưu Nhật Minh"]
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

// Các trường có ô tìm kiếm (gõ keyword để lọc nhanh)
const SEARCHABLE_IDS = ['nguoi_khai','xe','lai_xe','noi_di','noi_den','loai_hang'];

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
  attachSearchable();
}

function attachSearchable() {
  if (typeof TomSelect === 'undefined') return; // CDN chưa load — fallback native select
  for (const id of SEARCHABLE_IDS) {
    const sel = document.getElementById(id);
    if (!sel || sel.tomselect) continue;
    new TomSelect(sel, {
      create: false,
      allowEmptyOption: true,
      maxOptions: 500,
      placeholder: sel.querySelector('option')?.textContent || 'Gõ để tìm...',
      // diacritic-insensitive search by default in Tom Select 2.x
      // → gõ "trang" hoặc "Trảng" đều tìm được "Trảng Bom", "Trảng Bàng"
    });
  }
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tomselect) el.tomselect.setValue(value, true);
  else el.value = value;
}

function clearSearchable() {
  for (const id of SEARCHABLE_IDS) {
    const sel = document.getElementById(id);
    if (sel?.tomselect) sel.tomselect.clear(true);
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
    setTimeout(() => {
      clearSearchable();
      suggestNextMTC(false);
    }, 0);
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
    'cong_ty','loai_hang','noi_di','noi_den','nghiep_vu',
    'cuoc','phu_phi','ghi_chu','job_id','lai_xe','thang_hd','phan_loai'
  ];
  FIELDS.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    const v = trip[key];
    if (v !== undefined && v !== null && `${v}` !== '') setFieldValue(key, `${v}`);
  });
  if (trip.date) {
    // Hỗ trợ cả ISO string, ISO timestamp, dd/mm/yyyy
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
    date: date,          // ISO YYYY-MM-DD — không đổi format, tránh nhầm tháng/ngày
    xe: val('xe'),
    container: val('container'),
    mtc: val('mtc'),
    delta_ncc: val('delta_ncc'),
    cong_ty: val('cong_ty'),
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
    el.tomselect?.wrapper.classList.remove('error');
    if (!el.value.trim()) {
      el.classList.add('error');
      el.tomselect?.wrapper.classList.add('error');
      ok = false;
    }
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
