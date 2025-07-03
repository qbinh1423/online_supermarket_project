const ProductService = require("../services/products.service");

async function createProduct(req, res, next) {
  try {
    const images =
      req.files && req.files.length
        ? req.files.map((file) => `/uploads/product/${file.filename}`)
        : req.body.p_images && Array.isArray(req.body.p_images)
        ? req.body.p_images
        : [];

    let specifications = [];
    if (req.body.p_specifications) {
      if (Array.isArray(req.body.p_specifications)) {
        specifications = req.body.p_specifications;
      } else if (typeof req.body.p_specifications === "string") {
        try {
          specifications = JSON.parse(req.body.p_specifications);
        } catch (error) {
          throw new Error("Định dạng p_specifications không hợp lệ");
        }
      }
    }

    const productData = {
      p_name: req.body.p_name,
      p_images: images,
      p_stock_quantity: parseInt(req.body.p_stock_quantity) || 0,
      p_price: parseInt(req.body.p_price) || 0,
      p_description: req.body.p_description || "",
      p_specifications: specifications,
      p_category: req.body.p_category,
      p_subcategory: req.body.p_subcategory || null,
      p_brand: req.body.p_brand,
    };

    const product = await ProductService.createProduct(productData);
    res.status(201).json({
      status: "success",
      message: "Tạo sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const existingProduct = await ProductService.getProductById(req.params.id);

    let images = [];
    if (req.body.p_images && Array.isArray(req.body.p_images)) {
      images = req.body.p_images;
    }
    if (req.files && req.files.length) {
      const newImages = req.files.map(
        (file) => `/uploads/product/${file.filename}`
      );
      images = [...images, ...newImages];
    }

    let specifications = existingProduct.p_specifications;
    if (req.body.p_specifications) {
      if (Array.isArray(req.body.p_specifications)) {
        specifications = req.body.p_specifications;
      } else if (typeof req.body.p_specifications === "string") {
        try {
          specifications = JSON.parse(req.body.p_specifications);
        } catch (error) {
          throw new Error("Định dạng p_specifications không hợp lệ");
        }
      }
    }

    const productData = {
      p_name: req.body.p_name || existingProduct.p_name,
      p_images: images,
      p_stock_quantity:
        parseInt(req.body.p_stock_quantity) || existingProduct.p_stock_quantity,
      p_price: parseInt(req.body.p_price) || existingProduct.p_price,
      p_description: req.body.p_description || existingProduct.p_description,
      p_specifications: specifications,
      p_category: req.body.p_category || existingProduct.p_category,
      p_subcategory: req.body.p_subcategory || existingProduct.p_subcategory,
      p_brand: req.body.p_brand || existingProduct.p_brand,
    };

    const product = await ProductService.updateProduct(
      req.params.id,
      productData
    );
    res.status(200).json({
      status: "success",
      message: "Cập nhật sản phẩm thành công",
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: `Lỗi khi cập nhật: ${error.message}`,
    });
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await ProductService.deleteProduct(req.params.id);
    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    res.status(404).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const product = await ProductService.getProductById(req.params.id);
    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (error) {
    res.status(404).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
}

async function getProductsByName(req, res, next) {
  try {
    const { name, page = 1, limit = 10 } = req.query;
    if (!name) {
      throw new Error("Tên sản phẩm là bắt buộc");
    }
    const result = await ProductService.getProductsByName(name, page, limit);
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
}

async function getAllProducts(req, res, next) {
  try {
    const result = await ProductService.getAllProducts();
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
}

const getProductCount = async (req, res) => {
  try {
    const count = await ProductService.countProducts();
    res.status(200).json({ count });
  } catch (err) {
    console.error("Lỗi trong controller khi đếm sản phẩm:", err);
    res.status(500).json({ error: err.message });
  }
};

const getProductByCategory = async (req, res, next) => {
  try {
    const { cate_name } = req.params;
    const result = await ProductService.getProductByCategory(cate_name);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(400).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
};

const getProductByBrand = async (req, res, next) => {
  try {
    const { br_name } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const result = await ProductService.getProductByBrand(
      br_name,
      parseInt(page),
      parseInt(limit)
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching products by brand:", error);
    res.status(400).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
};

const getProductWithReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await ProductService.getProductWithReview(productId);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

async function deleteAllProducts(req, res, next) {
  try {
    const result = await ProductService.deleteAllProduct();
    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    console.error("Lỗi khi xóa tất cả sản phẩm:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
    next(error);
  }
}

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getProductsByName,
  getAllProducts,
  getProductCount,
  getProductByBrand,
  getProductByCategory,
  getProductWithReviews,
  deleteAllProducts,
};
