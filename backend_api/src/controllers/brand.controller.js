const brandService = require("../services/brand.service");

const getAllBrands = async (req, res) => {
  try {
    const result = await brandService.getAllBrands(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getBrandById = async (req, res) => {
  try {
    const brand = await brandService.getBrandById(req.params.id);
    if (!brand) return res.status(404).json({ error: "Brand not found" });
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createBrand = async (req, res) => {
  try {
    const brand = await brandService.createBrand({
      br_name: req.body.br_name,
      image: req.file,
      br_image: req.body.br_image,
    });
    res.status(201).json(brand);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateBrand = async (req, res) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, {
      br_name: req.body.br_name,
      image: req.file,
    });
    if (!brand) return res.status(404).json({ error: "Brand not found" });
    res.json(brand);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const brand = await brandService.deleteBrand(req.params.id);
    if (!brand) return res.status(404).json({ error: "Brand not found" });
    res.json({ message: "Brand deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getBrandCount = async (req, res) => {
  try {
    const count = await brandService.countBrands();
    res.status(200).json({ count });
  } catch (err) {
    console.error("Lỗi trong controller khi đếm thương hiệu:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  getBrandCount,
};
