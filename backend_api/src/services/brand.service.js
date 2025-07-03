const Brand = require("../models/brand");
const path = require("path");
const fs = require("fs").promises;

const UPLOAD_DIR = path.join(__dirname, "../uploads/brands");

async function getAllBrands({ page = 1, limit = 0, search }) {
  try {
    const query = {};
    if (search) {
      query.br_name = { $regex: search, $options: "i" };
    }

    let brands;
    let count;

    if (limit === 0) {
      brands = await Brand.find(query).sort({ created_at: -1 });
      count = await Brand.countDocuments(query);
    } else {
      brands = await Brand.find(query)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ created_at: -1 });
      count = await Brand.countDocuments(query);
    }

    return {
      brands,
      totalPages: limit === 0 ? 1 : Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalItems: count,
    };
  } catch (error) {
    throw new Error(`Error getting brands: ${error.message}`);
  }
}

async function getBrandById(id) {
  try {
    const brand = await Brand.findById(id);
    if (!brand) {
      throw new Error("Brand not found");
    }
    return brand;
  } catch (error) {
    throw new Error(`Error getting brand: ${error.message}`);
  }
}

async function createBrand(data) {
  const { br_name, image, br_image } = data;
  let final_image = null;

  if (image) {
    const fileName = `${Date.now()}_${image.originalname}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(filePath, image.buffer);
    final_image = `/uploads/brands/${fileName}`;
  } else if (br_image && typeof br_image === "string") {
    final_image = br_image;
  }

  const brand = new Brand({ br_name, br_image: final_image });
  return await brand.save();
}

async function updateBrand(id, data) {
  const { br_name, image } = data;
  const brand = await Brand.findById(id);
  if (!brand) throw new Error("Brand not found");

  if (image) {
    if (brand.br_image) {
      const oldImagePath = path.join(__dirname, "..", brand.br_image);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Lỗi khi xóa ảnh cũ:", err.message);
        }
      }
    }
    const fileName = `${Date.now()}_${image.originalname}`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.writeFile(filePath, image.buffer);
    brand.br_image = `/uploads/brands/${fileName}`;
  }

  brand.br_name = br_name || brand.br_name;
  return await brand.save();
}

async function deleteBrand(id) {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new Error("Nhãn hiệu không tồn tại");
  }
  if (brand.br_image) {
    const imagePath = path.join(__dirname, "..", brand.br_image);
    try {
      await fs.unlink(imagePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        console.error("Lỗi khi xóa ảnh brand:", err.message);
      }
    }
  }
  await Brand.findByIdAndDelete(id);
  return { message: "Xóa nhãn hiệu thành công" };
}

const countBrands = async () => {
  try {
    const count = await Brand.countDocuments();
    return count;
  } catch (error) {
    throw new Error("Lỗi khi đếm số lượng thương hiệu: " + error.message);
  }
};

module.exports = {
  getBrandById,
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  countBrands,
};
