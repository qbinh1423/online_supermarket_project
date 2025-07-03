// const express = require("express");
// const cookieParser = require("cookie-parser");
// const connectDB = require("./config/db");
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");

// const app = express();

// connectDB();

// app.use(express.json());
// app.use(cookieParser());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     const validTypes = ["image/png", "image/jpeg", "image/jpg"];
//     if (!validTypes.includes(file.mimetype)) {
//       return cb(new Error("Chỉ chấp nhận .png, .jpg, .jpeg"));
//     }
//     cb(null, true);
//   },
// });

// app.get("/", (req, res) => {
//   res.send("Backend connected to MongoDB!");
// });

// const usersRouter = require("./routes/users.router");
// const brandRouter = require("./routes/brand.router");
// const productsRouter = require("./routes/products.router");
// const categoriesRouter = require("./routes/category.router");
// const cartRouter = require("./routes/cart.router");
// const reviewRouter = require("./routes/review.router");
// const voucherRouter = require("./routes/voucher.router");
// const orderRouter = require("./routes/order.router");
// const searchRouter = require("./routes/search.router");

// usersRouter.setup(app);
// brandRouter.setup(app, upload);
// productsRouter.setup(app);
// categoriesRouter.setup(app);
// cartRouter.setup(app);
// reviewRouter.setup(app);
// voucherRouter.setup(app);
// orderRouter.setup(app);
// searchRouter.setup(app);

// module.exports = app;

// const express = require("express");
// const cookieParser = require("cookie-parser");
// const connectDB = require("./config/db");
// const multer = require("multer");
// const path = require("path");
// const cors = require("cors");
// const http = require("http");
// const FormData = require("form-data");

// const app = express();

// connectDB();

// app.use(express.json());
// app.use(cookieParser());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

// app.use("/api/product", (req, res, next) => {
//   if (req.path === "/similar" && req.method === "POST") {
//     upload.single("image")(req, res, (err) => {
//       if (err) {
//         return res.status(400).json({ message: err.message });
//       }

//       const form = new FormData();
//       if (req.file) {
//         form.append("image", req.file.buffer, {
//           filename: req.file.originalname,
//           contentType: req.file.mimetype,
//         });
//       } else if (req.body.imageUrl) {
//         form.append("imageUrl", req.body.imageUrl);
//       }
//       form.append("topK", req.body.topK || 5);

//       const options = {
//         hostname: "127.0.0.1",
//         port: 5001,
//         path: "/find_similar",
//         method: "POST",
//         headers: form.getHeaders(),
//       };

//       const flaskReq = http.request(options, (flaskRes) => {
//         let data = "";
//         flaskRes.on("data", (chunk) => {
//           data += chunk;
//         });
//         flaskRes.on("end", () => {
//           try {
//             const result = JSON.parse(data);
//             res.status(flaskRes.statusCode).json(result);
//           } catch (err) {
//             res.status(500).json({ message: "Lỗi parse phản hồi từ Flask" });
//           }
//         });
//       });

//       flaskReq.on("error", (err) => {
//         console.error("Lỗi kết nối đến Flask:", err.message);
//         res.status(500).json({ message: "Lỗi server khi kết nối đến Flask" });
//       });

//       form.pipe(flaskReq);
//     });
//   } else {
//     next();
//   }
// });

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     const validTypes = ["image/png", "image/jpeg", "image/jpg"];
//     if (!validTypes.includes(file.mimetype)) {
//       return cb(new Error("Chỉ chấp nhận .png, .jpg, .jpeg"));
//     }
//     cb(null, true);
//   },
// });

// app.get("/", (req, res) => {
//   res.send("Backend connected to MongoDB!");
// });

// const usersRouter = require("./routes/users.router");
// const brandRouter = require("./routes/brand.router");
// const productsRouter = require("./routes/products.router");
// const categoriesRouter = require("./routes/category.router");
// const cartRouter = require("./routes/cart.router");
// const reviewRouter = require("./routes/review.router");
// const voucherRouter = require("./routes/voucher.router");
// const orderRouter = require("./routes/order.router");
// const searchRouter = require("./routes/search.router");

// usersRouter.setup(app);
// brandRouter.setup(app, upload);
// productsRouter.setup(app);
// categoriesRouter.setup(app);
// cartRouter.setup(app);
// reviewRouter.setup(app);
// voucherRouter.setup(app);
// orderRouter.setup(app);
// searchRouter.setup(app);

// module.exports = app;

const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const http = require("http");
const FormData = require("form-data");

const app = express();

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.mimetype)) {
      return cb(new Error("Chỉ chấp nhận .png, .jpg, .jpeg"));
    }
    cb(null, true);
  },
});

app.post("/api/product/similar", upload.single("image"), async (req, res) => {
  try {
    let payload;
    const topK = req.body.topK || 5;

    if (req.file) {
      // Trường hợp upload file
      const form = new FormData();
      form.append("image", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      form.append("topK", topK);
      payload = { form, headers: form.getHeaders() };
    } else if (req.body.imageUrl) {
      // Trường hợp gửi URL
      payload = {
        body: JSON.stringify({ imageUrl: req.body.imageUrl, topK }),
        headers: { "Content-Type": "application/json" },
      };
    } else {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp ảnh hoặc URL" });
    }

    const options = {
      hostname: "127.0.0.1",
      port: 5001,
      path: "/find_similar",
      method: "POST",
      headers: payload.headers,
      timeout: 30000,
    };

    const flaskReq = http.request(options, (flaskRes) => {
      let data = "";
      flaskRes.on("data", (chunk) => {
        data += chunk;
      });
      flaskRes.on("end", () => {
        try {
          const result = JSON.parse(data);
          res.status(flaskRes.statusCode).json(result);
        } catch (err) {
          console.error("Lỗi parse JSON:", err);
        }
      });
    });

    flaskReq.on("error", (err) => {
      console.error("Lỗi kết nối đến Flask:", err.message);
      res.status(500).json({ message: "Lỗi server khi kết nối đến Flask" });
    });

    flaskReq.on("timeout", () => {
      flaskReq.destroy();
    });

    // Gửi dữ liệu phù hợp
    if (req.file) {
      payload.form.pipe(flaskReq);
    } else {
      flaskReq.write(payload.body);
      flaskReq.end();
    }
  } catch (err) {
    console.error("Lỗi:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Các routes khác
app.get("/", (req, res) => {
  res.send("Backend connected to MongoDB!");
});

const usersRouter = require("./routes/users.router");
const brandRouter = require("./routes/brand.router");
const productsRouter = require("./routes/products.router");
const categoriesRouter = require("./routes/category.router");
const cartRouter = require("./routes/cart.router");
const reviewRouter = require("./routes/review.router");
const voucherRouter = require("./routes/voucher.router");
const orderRouter = require("./routes/order.router");
const searchRouter = require("./routes/search.router");

usersRouter.setup(app);
brandRouter.setup(app, upload);
productsRouter.setup(app);
categoriesRouter.setup(app);
cartRouter.setup(app);
reviewRouter.setup(app, upload);
voucherRouter.setup(app);
orderRouter.setup(app);

module.exports = app;
