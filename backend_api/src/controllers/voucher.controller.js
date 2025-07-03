const voucherService = require("../services/voucher.service");

const getAllVouchers = async (req, res) => {
  try {
    const vouchers = await voucherService.getAllVouchers();
    res.json(vouchers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getVoucherById = async (req, res) => {
  try {
    const voucher = await voucherService.getVoucherById(req.params.id);
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });
    res.json(voucher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const parseDate = (dateString) => {
  if (!dateString) return null;
  const [day, month, year] = dateString.split("/");
  if (day && month && year) {
    const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return new Date(
      Date.UTC(
        isoDate.getUTCFullYear(),
        isoDate.getUTCMonth(),
        isoDate.getUTCDate()
      )
    );
  }

  return null;
};
const createVoucher = async (req, res) => {
  try {
    const data = {
      ...req.body,
      v_create_date: parseDate(req.body.v_create_date),
      v_expiry_date: parseDate(req.body.v_expiry_date),
    };

    const voucher = await voucherService.createVoucher(data);
    res.status(201).json(voucher);
  } catch (err) {
    console.error("Lỗi khi tạo voucher:", err);
    res.status(400).json({ error: err.message });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const data = {
      ...req.body,
      v_create_date: parseDate(req.body.v_create_date),
      v_expiry_date: parseDate(req.body.v_expiry_date),
    };

    const voucher = await voucherService.updateVoucher(req.params.id, data);
    if (!voucher)
      return res.status(404).json({ error: "Không tìm thấy voucher" });
    res.json(voucher);
  } catch (err) {
    console.error("Lỗi khi cập nhật voucher:", err);
    res.status(400).json({ error: err.message });
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const voucher = await voucherService.deleteVoucher(req.params.id);
    if (!voucher) return res.status(404).json({ error: "Voucher not found" });
    res.json({ message: "Voucher deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getVoucherCount = async (req, res) => {
  try {
    const count = await voucherService.countVouchers();
    res.status(200).json({ count });
  } catch (err) {
    console.error("Lỗi trong controller khi đếm khuyến mãi:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getVoucherCount,
};
