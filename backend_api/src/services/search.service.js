const Product = require("../models/product");
const http = require("http");
const mongoose = require("mongoose");

async function findSimilarProducts(imageData, topK = 5) {
  try {
    let postData;
    if (Buffer.isBuffer(imageData)) {
      postData = {
        image: imageData.toString("base64"),
        topK: topK,
      };
    } else {
      postData = JSON.stringify({
        imageUrl: imageData,
        topK: topK,
      });
    }

    const options = {
      hostname: "127.0.0.1",
      port: 5001,
      path: "/find_similar",
      method: "POST",
      headers: {
        "Content-Type": Buffer.isBuffer(imageData)
          ? "multipart/form-data"
          : "application/json",
        "Content-Length": Buffer.byteLength(
          Buffer.isBuffer(imageData) ? JSON.stringify(postData) : postData
        ),
      },
    };

    const similarImages = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(result.data || []);
            } else {
              reject(new Error(result.error || "Lỗi từ API Python"));
            }
          } catch (err) {
            reject(new Error("Lỗi parse phản hồi: " + err.message));
          }
        });
      });

      req.on("error", (err) => {
        reject(new Error("Lỗi gọi API Python: " + err.message));
      });
      if (Buffer.isBuffer(imageData)) {
        const FormData = require("form-data");
        const form = new FormData();
        form.append("image", Buffer.from(imageData), {
          filename: "uploaded_image.png",
        });
        form.append("topK", topK);
        form.pipe(req);
      } else {
        req.write(postData);
        req.end();
      }
    });

    console.log("Phản hồi từ API Python:", similarImages);

    if (!similarImages || similarImages.length === 0) {
      console.warn("Không nhận được sản phẩm từ API Python");
      return [];
    }

    // Nhóm sản phẩm theo id
    const groupedProducts = {};
    for (const item of similarImages) {
      const productId = item.id;
      if (!groupedProducts[productId]) {
        groupedProducts[productId] = {
          ...item,
          images: new Set(item.images || []),
        };
      } else {
        item.images.forEach((img) =>
          groupedProducts[productId].images.add(img)
        );
        groupedProducts[productId].similarity = Math.max(
          groupedProducts[productId].similarity,
          item.similarity
        );
      }
    }

    // Lấy sản phẩm từ MongoDB
    const productIds = Object.keys(groupedProducts).filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    let products = [];
    if (productIds.length > 0) {
      products = await Product.find({ _id: { $in: productIds } })
        .populate("p_category")
        .populate("p_subcategory")
        .populate("p_brand")
        .lean();
    }

    console.log("Sản phẩm từ MongoDB:", products);

    const results = [];
    for (const productId in groupedProducts) {
      const product = products.find((p) => p._id.toString() === productId);
      if (product) {
        results.push({
          id: product._id,
          name: product.p_name,
          images: Array.from(groupedProducts[productId].images).filter(
            (img) => img
          ),
          price: product.p_price,
          stockQuantity: product.p_stock_quantity,
          description: product.p_description,
          specifications: product.p_specifications,
          category: product.p_category,
          subcategory: product.p_subcategory,
          brand: product.p_brand,
          similarity: groupedProducts[productId].similarity,
          label: groupedProducts[productId].label,
        });
      }
    }

    if (results.length === 0) {
      console.warn(
        "Không tìm thấy sản phẩm nào trong MongoDB, trả về dữ liệu dự phòng"
      );
      for (const productId in groupedProducts) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
          results.push({
            id: productId,
            name: groupedProducts[productId].name || "Unknown Product",
            images: Array.from(groupedProducts[productId].images).filter(
              (img) => img
            ),
            price: groupedProducts[productId].price || 0,
            stockQuantity: groupedProducts[productId].stockQuantity || 0,
            description: groupedProducts[productId].description || "",
            specifications: groupedProducts[productId].specifications || [],
            category: groupedProducts[productId].category || null,
            subcategory: groupedProducts[productId].subcategory || null,
            brand: groupedProducts[productId].brand || null,
            similarity: groupedProducts[productId].similarity,
            label: groupedProducts[productId].label,
          });
        }
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  } catch (error) {
    console.error("Lỗi tìm sản phẩm tương tự:", error.message);
    throw new Error("Không thể tìm sản phẩm tương tự");
  }
}

module.exports = { findSimilarProducts };
