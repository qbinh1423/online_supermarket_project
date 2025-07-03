const Product = require("../models/product");
const Category = require("../models/category");
const Brand = require("../models/brand");
const Review = require("../models/review");
const fs = require("fs").promises;
const path = require("path");

async function createProduct(data) {
  const product = new Product(data);
  await product.save();
  return product;
}

async function updateProduct(id, data) {
  const product = await Product.findById(id);
  if (!product) {
    throw new Error("Sản phẩm không tồn tại");
  }

  const oldImages = product.p_images || [];
  Object.assign(product, data);
  await product.save();

  const newImages = data.p_images || [];
  const imagesToDelete = oldImages.filter((img) => !newImages.includes(img));

  for (const imgPath of imagesToDelete) {
    try {
      const fileName = imgPath.replace(/^\/uploads\/product\//, "");
      const fullPath = path.join(__dirname, "../uploads/product", fileName);
      await fs.access(fullPath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error(`Không thể xóa file ${imgPath}:`, error.message);
    }
  }
  return product;
}

async function deleteProduct(id) {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new Error("Sản phẩm không tồn tại");
  }

  const imagesToDelete = product.p_images || [];
  for (const imgPath of imagesToDelete) {
    try {
      const fileName = imgPath.replace(/^\/uploads\/product\//, "");
      const fullPath = path.join(__dirname, "../uploads/product", fileName);
      await fs.access(fullPath);
      await fs.unlink(fullPath);
    } catch (error) {
      console.error(`Không thể xóa file ${imgPath}:`, error.message);
    }
  }

  return { message: "Xóa sản phẩm thành công" };
}

async function getProductById(id) {
  const product = await Product.findById(id)
    .populate("p_category", "cate_name")
    .populate("p_subcategory", "cate_name")
    .populate("p_brand", "brand_name");
  if (!product) {
    throw new Error("Sản phẩm không tồn tại");
  }
  return product;
}

async function getProductsByName(name, page = 1, limit = 10) {
  const regex = new RegExp(name, "i");
  const products = await Product.find({ p_name: regex })
    .populate("p_category", "cate_name")
    .populate("p_subcategory", "cate_name")
    .populate("p_brand", "brand_name")
    .skip((page - 1) * limit)
    .limit(limit);
  const total = await Product.countDocuments({ p_name: regex });
  return {
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function getAllProducts() {
  const query = {};
  const products = await Product.find(query)
    .populate("p_category", "cate_name")
    .populate("p_subcategory", "cate_name")
    .populate("p_brand", "br_name");
  const total = await Product.countDocuments(query);
  return {
    products,
    totalItems: total,
  };
}

const countProducts = async () => {
  try {
    const count = await Product.countDocuments();
    return count;
  } catch (error) {
    throw new Error("Lỗi khi đếm số lượng sản phẩm: " + error.message);
  }
};

async function getProductByCategory(cateNameRaw) {
  const decodedName = decodeURIComponent(cateNameRaw);
  const cateName = decodedName.replace(/-/g, " ");
  const category = await Category.findOne({
    cate_name: new RegExp(`^${cateName}$`, "i"),
  }).populate({
    path: "parent_category_id",
    select: "cate_name parent_category_id",
    populate: {
      path: "parent_category_id",
      select: "cate_name",
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const query = category.parent_category_id
    ? { p_subcategory: category._id }
    : { p_category: category._id };

  const products = await Product.find(query)
    .populate("p_category", "cate_name")
    .populate("p_subcategory", "cate_name")
    .populate("p_brand", "br_name");

  const total = await Product.countDocuments(query);

  return {
    status: "success",
    data: {
      category,
      products,
      total,
    },
  };
}

async function getProductByBrand(brandNameRaw, page = 1, limit = 10) {
  const decodedName = decodeURIComponent(brandNameRaw);
  const brandName = decodedName.replace(/-/g, " ");

  const brand = await Brand.findOne({
    br_name: new RegExp(`^${brandName}$`, "i"),
  });

  if (!brand) {
    throw new Error("Brand not found");
  }

  const query = { p_brand: brand._id };

  const products = await Product.find(query)
    .populate("p_category", "cate_name")
    .populate("p_subcategory", "cate_name")
    .populate("p_brand", "br_name")
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Product.countDocuments(query);

  return {
    status: "success",
    data: {
      brand: {
        _id: brand._id,
        br_name: brand.br_name,
        br_image: brand.br_image,
      },
      products,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getProductWithReview(productId) {
  try {
    const product = await Product.findById(productId).lean();
    const reviews = await Review.find({ p_id: productId }).lean();

    const formattedReviews = reviews.map((review) => ({
      id: review._id,
      username: review.name,
      rating: review.stars,
      comment: review.content,
      image: review.images?.length > 0 ? review.images[0] : null,
    }));

    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? (reviews.reduce((sum, r) => sum + r.stars, 0) / reviewCount).toFixed(1)
      : "0.0";

    return {
      id: product._id,
      name: product.p_name,
      image: product.p_images?.length > 0 ? product.p_images[0] : null,
      averageRating,
      reviewCount,
      reviews: formattedReviews,
    };
  } catch (error) {
    throw new Error(`Failed to fetch product with reviews: ${error.message}`);
  }
}

async function deleteAllProduct() {
  try {
    const products = await Product.find({});
    let deleteCount = 0;
    for (const product of products) {
      const imageProduct = product.p_images || [];
      for (const imgPath of imageProduct) {
        try {
          const fileName = imgPath.replace(/^\/uploads\/product\//, "");
          const fullPath = path.join(__dirname, "../uploads/product", fileName);
          await fs.access(fullPath);
          awaitfs.unlink(fullPath);
        } catch (error) {
          console.warn(`Không thể xóa file ${imgPath}: ${error.message}`);
        }
      }
    }
    const result = await Product.deleteMany({});
    deleteCount = result.deletedCount;

    return {
      status: "success",
      message: `Đã xóa ${deleteCount} sản phẩm và ảnh liên quan`,
    };
  } catch {
    throw new Error("Lỗi khi xóa tất cả sản phẩm: " + error.message);
  }
}

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getProductsByName,
  getAllProducts,
  countProducts,
  getProductByCategory,
  getProductByBrand,
  getProductWithReview,
  deleteAllProduct,
};
