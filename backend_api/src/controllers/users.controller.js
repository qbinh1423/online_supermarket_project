const usersService = require("../services/users.service");
const validate = require("../utils/validate");
const ApiError = require("../utils/error");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const JWT_EXPIRES_IN = "1d";

async function createUser(req, res, next) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next(new ApiError(400, "Request body is empty"));
    }

    const { error } = validate.userSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_name, c_email, c_password, c_phone, c_address, c_date, c_role } =
      req.body;

    let parsedDate = c_date
      ? new Date(c_date.split("/").reverse().join("-"))
      : null;
    if (parsedDate && isNaN(parsedDate)) {
      return next(
        new ApiError(400, "Sai định dạng ngày. Sử dụng định dạng DD/MM/YYYY")
      );
    }

    const existingUser = await usersService.getUserByEmail(c_email);
    if (existingUser) {
      return next(new ApiError(400, "Email đã tồn tại."));
    }

    const user = await usersService.createUser({
      c_name,
      c_email,
      c_password,
      c_phone,
      c_address,
      c_date: parsedDate,
      c_role,
    });

    return res.status(201).json({
      status: "success",
      message: "Tạo tài khoản thành công!",
      data: { user: { ...user.toObject(), c_password: undefined } },
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function updateUser(req, res, next) {
  try {
    const { error } = validate.updateUserSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_name, c_phone, c_address, c_date } = req.body;
    const user = await usersService.updateUser(req.params.id, {
      c_name,
      c_phone,
      c_address,
      c_date,
    });

    return res.json({
      status: "success",
      message: "Cập nhật thông tin thành công!",
      data: { user },
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function countUsers(req, res, next) {
  try {
    const count = await usersService.countUsers();
    return res.json({
      status: "success",
      message: "Lấy số lượng người dùng thành công.",
      data: { count },
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function login(req, res, next) {
  try {
    const { error } = validate.loginSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_email, c_password } = req.body;
    const user = await usersService.getUserByEmailWithPassword(c_email);
    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    const isMatch = await bcrypt.compare(c_password, user.c_password);
    if (!isMatch) {
      return next(new ApiError(400, "Sai mật khẩu."));
    }

    const token = jwt.sign(
      { _id: user.id, c_email: user.c_email, c_role: user.c_role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      status: "success",
      message: "Đăng nhập thành công!",
      data: {
        token,
        user: { ...user.toObject(), c_password: undefined },
      },
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function changePassword(req, res, next) {
  try {
    const { error } = validate.changePasswordSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_email, oldPassword, newPassword } = req.body;
    const user = await usersService.getUserByEmailWithPassword(c_email);
    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    const isMatch = await bcrypt.compare(oldPassword, user.c_password);
    if (!isMatch) {
      return next(new ApiError(400, "Old password is incorrect."));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await usersService.updateUserPassword(c_email, hashedNewPassword);

    return res.json({
      status: "success",
      message: "Thay đổi mật khẩu thành công.",
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { error } = validate.forgotPasswordSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_email } = req.body;
    const user = await usersService.getUserByEmail(c_email);
    if (!user) {
      return next(new ApiError(404, "User not found."));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await usersService.saveOTP(c_email, otp);

    return res.json({
      status: "success",
      message: "OTP sent to your email.",
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function verifyOTP(req, res, next) {
  try {
    const { error } = validate.verifyOTPSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_email, otp } = req.body;
    const otpRecord = await usersService.verifyOTP(c_email, otp);
    if (!otpRecord) {
      return next(new ApiError(400, "Invalid or expired OTP."));
    }

    return res.json({
      status: "success",
      message: "OTP verified successfully.",
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function resetPassword(req, res, next) {
  try {
    const { error } = validate.resetPasswordSchema.validate(req.body);
    if (error) {
      return next(new ApiError(400, error.details[0].message));
    }

    const { c_email, oldPassword, newPassword } = req.body;
    // const otpRecord = await usersService.verifyOTP(c_email, otp);
    // if (!otpRecord) {
    //   return next(new ApiError(400, "Invalid or expired OTP."));
    // }
    const user = await usersService.getUserByEmailWithPassword(c_email);
    const isMatch = await bcrypt.compare(oldPassword, user.c_password);
    if (!isMatch) {
      return next(new ApiError(400, "Mật khẩu cũ không đúng."));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await usersService.updateUserPassword(c_email, hashedNewPassword);
    // await OTP.deleteOne({ c_email, otp });

    return res.json({
      status: "success",
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function getRecentUsers(req, res, next) {
  try {
    const users = await usersService.getRecentUsers();
    return res.json({
      status: "success",
      message: "Recent users retrieved successfully!",
      data: users,
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new ApiError(400, "ID người dùng không hợp lệ."));
    }

    const user = await usersService.getUserById(id);
    if (!user) {
      return next(new ApiError(404, "Người dùng không tồn tại."));
    }

    return res.json({
      status: "success",
      message: "Lấy thông tin người dùng thành công!",
      data: { user },
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
}

const getAllUsers = async (req, res) => {
  try {
    const users = await usersService.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await usersService.deleteUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "Khách hàng được xóa thành công" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  createUser,
  updateUser,
  countUsers,
  login,
  changePassword,
  forgotPassword,
  verifyOTP,
  resetPassword,
  getUserById,
  getRecentUsers,
  getAllUsers,
  deleteUser,
};
