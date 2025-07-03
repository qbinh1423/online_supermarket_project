const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const CartService = require("./cart.service");
const CartItem = require("../models/cart_item");
const Product = require("../models/product");

async function getCartItemsWithSubcategories(cart_id) {
  return CartItem.find({ cart_id }).populate({
    path: "p_id",
    select: "p_name p_price p_images p_subcategory",
    populate: {
      path: "p_subcategory",
      select: "cate_name",
    },
  });
}

async function loadFPGrowthRules() {
  try {
    const rulesPath = path.join(__dirname, "data", "rules.json");
    const data = await fs.readFile(rulesPath, "utf-8");
    const rules = JSON.parse(data);
    const uniqueRules = [];
    const ruleKeys = new Set();
    for (const rule of rules) {
      const key = JSON.stringify({
        antecedents: rule.antecedents.sort(),
        consequents: rule.consequents.sort(),
      });
      if (!ruleKeys.has(key) && rule.lift >= 1.0) {
        ruleKeys.add(key);
        uniqueRules.push(rule);
      }
    }
    return uniqueRules;
  } catch (error) {
    console.error("Error reading rules.json:", error);
    return [];
  }
}

async function getCartSubcategories(cart_id) {
  const cartItems = await getCartItemsWithSubcategories(cart_id);
  const subcategories = cartItems
    .map((item) => {
      let subcategoryName = item.p_id?.p_subcategory?.cate_name;
      if (subcategoryName) {
        subcategoryName = subcategoryName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .toLowerCase();
      }
      return subcategoryName;
    })
    .filter((name) => name);
  return [...new Set(subcategories)];
}

const subcategoryMapping = {
  dieu_hoa: ["Điều hòa", "Dieu hoa", "Máy lạnh"],
  tivi: ["Tivi", "TV", "Ti vi"],
  tu_lanh: ["Tủ lạnh", "Tu lanh"],
  may_giat: ["Máy giặt", "May giat"],
  may_loc_khong_khi: ["Máy lọc không khí", "May loc khong khi"],
  may_say_quan_ao: ["Máy sấy quần áo", "May say quan ao"],
  tu_mat: ["Tủ mát", "Tu mat"],
  may_hut_am: ["Máy hút ẩm", "May hut am"],
  may_lam_da_vien: ["Máy làm đá viên", "May lam da vien", "Máy làm đá"],
  may_rua_chen: ["Máy rửa chén", "May rua chen", "Máy rửa bát"],
  may_nuoc_nong_lanh: ["Máy nước nóng lạnh", "May nuoc nong lanh"],
  tu_cham_soc_quan_ao_thong_minh: [
    "Tủ chăm sóc quần áo thông minh",
    "Tu cham soc quan ao thong minh",
    "Tủ chăm sóc quần áo",
  ],
  tu_ruou: ["Tủ rượu", "Tu ruou"],
  loa: ["Loa", "Loa âm thanh"],
  quat: ["Quạt", "Quat"],
  may_xay_da_nang: ["Máy xay đa năng", "May xay da nang"],
  may_hut_bui: ["Máy hút bụi", "May hut bui"],
  noi_com_dien: ["Nồi cơm điện", "Noi com dien"],
  may_loc_nuoc: ["Máy lọc nước", "May loc nuoc", "Máy lọc"],
  may_pha_ca_phe: ["Máy pha cà phê", "May pha ca phe"],
  lo_vi_song: ["Lò vi sóng", "Lo vi song"],
  bep: ["Bếp", "Bep", "Bếp điện", "Bếp từ"],
  lo_nuong: ["Lò nướng", "Lo nuong"],
  cac_loai_noi: ["Các loại nồi", "Cac loai noi", "Nồi các loại"],
  noi_chien_khong_dau: ["Nồi chiên không dầu", "Noi chien khong dau"],
  noi_lau: ["Nồi lẩu", "Noi lau"],
  may_lam_kem: ["Máy làm kem", "May lam kem"],
  may_xay_ca_phe: ["Máy xay cà phê", "May xay ca phe"],
  binh_giu_nhiet: ["Bình giữ nhiệt", "Binh giu nhiet"],
  do_ve_sinh: ["Đồ vệ sinh", "Do ve sinh", "Dụng cụ vệ sinh"],
  may_lam_sua_chua: ["Máy làm sữa chua", "May lam sua chua"],
  dung_cu_pha_che: ["Dụng cụ pha chế", "Dung cu pha che"],
  may_xay_bot: ["Máy xay bột", "May xay bot"],
  ca_phe: ["Cà phê", "Ca phe", "Cà phê hạt", "Cà phê bột"],
  may_massage: ["Máy massage", "May massage", "Máy mát xa"],
  can: ["Cân", "Can", "Cân sức khỏe", "Cân điện tử"],
  may_do_huyet_ap: ["Máy đo huyết áp", "May do huyet ap"],
  may_phun_suong: ["Máy phun sương", "May phun suong", "Máy phun sương"],
  may_xong_hoi: ["Máy xông hơi", "May xong hoi"],
  may_do_do_am: ["Máy đo độ ẩm", "May do do am"],
  may_do_duong_huyet: ["Máy đo đường huyết", "May do duong huyet"],
  may_tro_thinh: ["Máy trợ thính", "May tro thinh"],
  may_tam_nuoc: ["Máy tăm nước", "May tam nuoc"],
  dai_nep_chan_tay: ["Đai nẹp chân tay", "Dai nep chan tay"],
  dai_lung: ["Đai lưng", "Dai lung", "Đai lưng y tế"],
  nhiet_ke: ["Nhiệt kế", "Nhiet ke", "Nhiệt kế điện tử"],
  khau_trang: ["Khẩu trang", "Khau trang", "Khẩu trang y tế"],
  may_tao_nuoc_khu_khuan: ["Máy tạo nước khử khuẩn", "May tao nuoc khu khuan"],
  sofa: ["Sofa", "Ghế sofa"],
  ban: ["Bàn", "Ban", "Bàn ăn", "Bàn trà"],
  ghe: ["Ghế", "Ghe", "Ghế ăn", "Ghế thư giãn"],
  goi_trang_tri: ["Gối trang trí", "Goi trang tri"],
  ke_tivi: ["Kệ tivi", "Ke tivi", "Kệ TV"],
  tranh_treo_tuong: ["Tranh treo tường", "Tranh treo tuong", "Tranh trang trí"],
  dong_ho: ["Đồng hồ", "Dong ho", "Đồng hồ treo tường", "Đồng hồ để bàn"],
  gia_treo_tuong: ["Giá treo tường", "Gia treo tuong", "Giá treo"],
  den: ["Đèn", "Den", "Đèn bàn", "Đèn trang trí"],
  cay_kieng: ["Cây kiểng", "Cay kieng", "Cây cảnh"],
  may_in: ["Máy in", "May in", "Máy in văn phòng"],
  may_chieu: ["Máy chiếu", "May chieu", "Máy chiếu văn phòng"],
  may_huy_tai_lieu: ["Máy hủy tài liệu", "May huy tai lieu"],
  may_tinh_bo_tui: ["Máy tính bỏ túi", "May tinh bo tui", "Máy tính cầm tay"],
  may_cham_cong: ["Máy chấm công", "May cham cong"],
  ket_sat: ["Két sắt", "Ket sat"],
  may_photocopy: ["Máy photocopy", "May photocopy", "Máy sao chụp"],
  may_dong_sach: ["Máy đóng sách", "May dong sach"],
  ban_lam_viec: ["Bàn làm việc", "Ban lam viec"],
  ghe_van_phong: ["Ghế văn phòng", "Ghe van phong"],
  tu_van_phong: ["Tủ văn phòng", "Tu van phong"],
};

async function getRecommendedProducts(cart_id) {
  try {
    const rules = await loadFPGrowthRules();
    if (!rules.length) {
      console.warn(
        "No association rules found, relying on same-category recommendations"
      );
    }

    const cartItems = await getCartItemsWithSubcategories(cart_id);
    const cartSubcategories = await getCartSubcategories(cart_id);
    const cartProductIds = cartItems.map((item) => item.p_id._id.toString());

    // Chuẩn hóa danh mục trong giỏ hàng
    const mappedSubcategories = cartSubcategories
      .flatMap((subcat) => subcategoryMapping[subcat] || [subcat])
      .map((name) =>
        name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .toLowerCase()
      );

    // Lấy danh mục từ cơ sở dữ liệu
    const sameCategoryIds = (
      await mongoose.model("Category").find(
        {
          cate_name: {
            $in: cartSubcategories.flatMap(
              (subcat) => subcategoryMapping[subcat] || [subcat]
            ),
          },
        },
        { _id: 1 }
      )
    ).map((cat) => cat._id);

    // Phân bổ số lượng sản phẩm cho mỗi danh mục
    const productsPerCategory = Math.ceil(
      10 / Math.max(1, sameCategoryIds.length)
    );
    let sameCategoryProducts = [];

    for (const categoryId of sameCategoryIds) {
      const products = await Product.find({
        p_subcategory: categoryId,
        _id: { $nin: cartProductIds },
      })
        .select("p_name p_price p_images p_subcategory")
        .populate("p_subcategory", "cate_name");
      sameCategoryProducts = [...sameCategoryProducts, ...products];
    }

    let recommendedProducts = [...sameCategoryProducts];
    const remainingSlots = 20 - recommendedProducts.length;

    if (remainingSlots > 0 && rules.length > 0) {
      const matchedRules = rules.filter((rule) =>
        rule.antecedents.some((antecedent) => {
          const normalizedAntecedent = antecedent
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_")
            .toLowerCase();
          return mappedSubcategories.includes(normalizedAntecedent);
        })
      );

      const ruleBasedSubcategories = [
        ...new Set(
          matchedRules.flatMap((rule) =>
            rule.consequents.filter(
              (cons) =>
                !cartSubcategories.includes(
                  cons
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/\s+/g, "_")
                    .toLowerCase()
                )
            )
          )
        ),
      ].flatMap(
        (cons) =>
          Object.entries(subcategoryMapping).find(
            ([key]) => key === cons
          )?.[1] || [cons]
      );

      const ruleCategoryIds = (
        await mongoose.model("Category").find(
          {
            cate_name: {
              $in: ruleBasedSubcategories,
            },
          },
          { _id: 1 }
        )
      ).map((cat) => cat._id);

      if (ruleCategoryIds.length > 0) {
        const ruleBasedProducts = await Product.find({
          p_subcategory: { $in: ruleCategoryIds },
          _id: {
            $nin: [
              ...cartProductIds,
              ...sameCategoryProducts.map((p) => p._id.toString()),
            ],
          },
        })
          .select("p_name p_price p_images p_subcategory")
          .populate("p_subcategory", "cate_name")
          .limit(remainingSlots);

        recommendedProducts = [...recommendedProducts, ...ruleBasedProducts];
      }
    }

    // Nếu vẫn không đủ 20 sản phẩm, lấy thêm các sản phẩm phổ biến
    if (recommendedProducts.length < 20) {
      const popularProducts = await Product.find({
        _id: {
          $nin: [
            ...cartProductIds,
            ...recommendedProducts.map((p) => p._id.toString()),
          ],
        },
      })
        .select("p_name p_price p_images p_subcategory")
        .populate("p_subcategory", "cate_name")
        .sort({ p_sales: -1 })
        .limit(20 - recommendedProducts.length);

      recommendedProducts = [...recommendedProducts, ...popularProducts];
    }

    if (!recommendedProducts.length) {
      return {
        success: false,
        message: "No products found for recommended subcategories",
        products: [],
      };
    }

    return {
      success: true,
      message: "Recommended products retrieved successfully",
      products: recommendedProducts.map((p) => ({
        _id: p._id,
        name: p.p_name,
        price: p.p_price,
        images: p.p_images,
        subcategory: p.p_subcategory?.cate_name,
      })),
    };
  } catch (error) {
    console.error("Error in getRecommendedProducts:", error);
    return {
      success: false,
      message: "Error retrieving recommended products",
      products: [],
    };
  }
}

module.exports = {
  getCartItemsWithSubcategories,
  getRecommendedProducts,
};
