const express = require("express");
const router = express.Router();
const multer = require("multer");
const { getSimilarProducts } = require("../controllers/search.controller");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Chỉ hỗ trợ file ảnh định dạng JPEG, PNG, hoặc WebP"));
  },
});

module.exports.setup = (app) => {
  app.use("/api/product", router);
  router.post("/similar", upload.single("image"), getSimilarProducts);
};
