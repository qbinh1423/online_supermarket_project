const Joi = require("joi");

const userSchema = Joi.object({
  c_name: Joi.string().min(2).required(),
  c_email: Joi.string().email().required(),
  c_address: Joi.string().allow("").optional(),
  c_date: Joi.string().optional().allow(null),
  c_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional(),
  c_password: Joi.string().min(6).required(),
  c_role: Joi.string().valid("user", "admin").optional().default("user"),
});

const loginSchema = Joi.object({
  c_email: Joi.string().email().required(),
  c_password: Joi.string().min(6).required(),
});

const changePasswordSchema = Joi.object({
  c_email: Joi.string().email().required(),
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required(),
});

const forgotPasswordSchema = Joi.object({
  c_email: Joi.string().email().required(),
});

const verifyOTPSchema = Joi.object({
  c_email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

const resetPasswordSchema = Joi.object({
  c_email: Joi.string().email().required(),
  oldPassword: Joi.string().min(6).required(),
  newPassword: Joi.string().min(6).required(),
});

const updateUserSchema = Joi.object({
  c_name: Joi.string().trim().min(2).optional().messages({
    "string.min": "Họ tên phải có ít nhất 2 ký tự",
    "string.base": "Họ tên phải là chuỗi",
  }),
  c_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Số điện thoại phải có 10 chữ số",
      "string.base": "Số điện thoại phải là chuỗi",
    }),
  c_address: Joi.string().trim().allow("").optional().messages({
    "string.base": "Địa chỉ phải là chuỗi",
  }),
  c_date: Joi.string().allow(null, "").optional().messages({
    "string.base": "Ngày sinh phải là chuỗi hợp lệ",
  }),
})
  .min(1)
  .messages({
    "object.min": "Phải cung cấp ít nhất một trường để cập nhật",
  });

const addToCartSchema = Joi.object({
  p_id: Joi.string().required(),
  cart_item_quantity: Joi.number().integer().min(1).required(),
});

const updateCartItemSchema = Joi.object({
  cart_item_id: Joi.string().required(),
  cart_item_quantity: Joi.number().integer().min(1).required(),
});

const checkoutSchema = Joi.object({
  shipping_address: Joi.string().required(),
  promotion_code: Joi.string().optional(),
});

module.exports = {
  userSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  updateUserSchema,
  addToCartSchema,
  updateCartItemSchema,
  checkoutSchema,
};
