const Voucher = require("../models/voucher");

const getAllVouchers = async () => {
  return await Voucher.find();
};

const getVoucherById = async (id) => {
  return await Voucher.findById(id);
};

const createVoucher = async (data) => {
  const voucher = new Voucher(data);
  return await voucher.save();
};

const updateVoucher = async (id, data) => {
  return await Voucher.findByIdAndUpdate(id, data, { new: true });
};

const deleteVoucher = async (id) => {
  return await Voucher.findByIdAndDelete(id);
};

const countVouchers = async () => {
  try {
    const count = await Voucher.countDocuments();
    return count;
  } catch (error) {
    throw new Error("Lỗi khi đếm số lượng khuyến mãi: " + error.message);
  }
};

module.exports = {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  countVouchers,
};
