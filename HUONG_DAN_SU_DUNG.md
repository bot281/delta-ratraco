# 📋 Hướng Dẫn Sử Dụng — Delta Trip Record

> **Ứng dụng ghi nhận chuyến xe vận chuyển hàng hóa**
> Link: https://bot281.github.io/delta-ratraco/

---

## 🚀 Cách mở app

Mở trình duyệt (Chrome, Safari, Firefox) → truy cập link trên.
Không cần cài đặt, không cần đăng nhập.

---

## 📝 Ghi nhận chuyến mới

### Bước 1 — Chọn Người khai báo
Chọn tên của bạn trong danh sách **Người khai báo** (ở đầu form).

### Bước 2 — Điền thông tin chuyến

| Trường | Bắt buộc | Hướng dẫn |
|--------|----------|-----------|
| **Ngày vận hành** | ✅ | Chọn ngày thực hiện chuyến xe |
| **Khu vực** | ✅ | Chọn khu vực xuất phát |
| **Xe thực hiện** | ✅ | Biển số xe |
| **Số Container** | ✅ | Nhập số container (VD: TCKU1234567) |
| **Loại hàng** | ✅ | Chọn loại hàng vận chuyển |
| **Nơi đi** | ✅ | Địa điểm lấy hàng |
| **Nơi đến** | ✅ | Địa điểm giao hàng |
| **Nghiệp vụ** | ✅ | Đóng hàng / Trả hàng / Kết hợp / Tăng bo |
| **Lái xe** | ✅ | Chọn tên lái xe |
| **Phân loại** | ✅ | Chở hàng / Chuyển vỏ |
| **Công ty** | ◻️ | Tên công ty khách hàng (nếu có) |
| **JOB ID** | ◻️ | Mã job (có thể bổ sung sau) |
| **Cước vận chuyển** | ◻️ | Số tiền cước (có thể bổ sung sau) |
| **Phụ phí** | ◻️ | Phụ phí phát sinh (nếu có) |
| **Ghi chú** | ◻️ | Ghi chú thêm nếu cần |

### Bước 3 — Nhấn **LƯU CHUYẾN**
- Nếu thành công → xuất hiện thông báo xanh **"Đã lưu! MTC: RTC****"**
- Mã MTC được tự động cấp, không cần nhập tay

---

## 🔄 Bổ sung thông tin sau (cước, JOB ID…)

Nếu chưa có cước lúc tạo chuyến, có thể bổ sung sau:

1. Nhập **Mã MTC** (VD: `RTC6321`) vào ô **Tải theo MTC**
2. Nhấn **Tải** → form tự điền thông tin cũ
3. Điền thêm Cước / Phụ phí / JOB ID còn thiếu
4. Nhấn **LƯU CHUYẾN** → hệ thống cập nhật, không tạo mới

> ⚠️ Nếu có nhiều người khai báo cho cùng 1 chuyến, tên sẽ được **ghép thêm** vào cột Người khai báo (không ghi đè).

---

## 📖 Xem lịch sử chuyến

Cuộn xuống dưới form → phần **Lịch sử gần đây** hiển thị các chuyến mới nhất.
Nhấn **Tải lại** để cập nhật danh sách.

---

## ❓ Các lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|-------------|------------|
| "Vui lòng điền đầy đủ thông tin" | Còn trường bắt buộc chưa điền | Kiểm tra lại các ô có dấu * |
| Không tải được thông tin MTC | MTC nhập sai hoặc không tồn tại | Kiểm tra lại mã MTC |
| Form trống sau khi nhấn Lưu | Đã lưu thành công, form tự reset | Kiểm tra mục Lịch sử |

---

## 💡 Lưu ý quan trọng

- Dữ liệu lưu thẳng vào **Google Sheet SL** — không cần gửi email hay nhắn tin
- Mã **MTC tự động tăng** theo thứ tự, không trùng nhau
- Có thể dùng trên **điện thoại** hoặc **máy tính**
- Sau khi lưu, dữ liệu có ngay trong sheet, có thể kiểm tra tức thì

---

*Cần hỗ trợ thêm: liên hệ nhóm Delta-Team1*
