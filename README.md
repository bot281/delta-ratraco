# 🚚 Delta Ratraco — Hệ thống quản lý vận chuyển

Hệ thống thay thế toàn bộ công thức Google Sheets bằng code tự động.

## Cấu trúc

```
app/          → Web App nhập liệu Shipment List (GitHub Pages)
scripts/      → Python scripts xử lý báo cáo tự động
gas/          → Google Apps Script backend (API nhận dữ liệu từ app)
data/master/  → Danh mục chuẩn (xe, lái xe, tuyến đường)
```

## Báo cáo tự động (chạy 8h sáng mỗi ngày)
- Check debit (đối chiếu SL vs PM Delta)
- BC01-TH (tổng hợp theo tháng)
- Thống kê DT/CP theo cung đường
- Báo cáo doanh thu theo khu vực/xe/ngày
- Bảng kê hóa đơn

## Sheet ID
`1dQrANVJ6GABaRyhXkJrCreB1w3T8hjzIm3cqjl40hgY`
