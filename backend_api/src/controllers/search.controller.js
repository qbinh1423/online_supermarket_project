const { findSimilarProducts } = require("../services/search.service");

async function getSimilarProducts(req, res) {
  try {
    let imageData;

    if (req.file) {
      imageData = req.file.buffer;
    } else if (req.body.imageUrl) {
      imageData = req.body.imageUrl;
    } else {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp ảnh hoặc URL ảnh" });
    }

    const similarProducts = await findSimilarProducts(imageData, 5);

    if (similarProducts.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm tương tự" });
    }

    return res.status(200).json({
      message: "Tìm kiếm sản phẩm tương tự thành công",
      data: similarProducts,
    });
  } catch (error) {
    console.error("Lỗi controller:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server khi tìm sản phẩm tương tự" });
  }
}

module.exports = { getSimilarProducts };
