const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const Cart = require("../models/cart");
const CartItem = require("../models/cart_item");
const Product = require("../models/product");

async function getProductById(p_id) {
  return await Product.findById(p_id);
}

async function getOrCreateCart(c_id) {
  let cart = await Cart.findOne({ c_id });
  if (!cart) {
    cart = new Cart({ c_id });
    await cart.save();
  }
  return cart;
}

async function addCartItem(cart_id, p_id, cart_item_quantity) {
  let cartItem = await CartItem.findOne({ cart_id, p_id });
  if (cartItem) {
    cartItem.cart_item_quantity += cart_item_quantity;
    await cartItem.save();
  } else {
    cartItem = new CartItem({ cart_id, p_id, cart_item_quantity });
    await cartItem.save();
  }
  return cartItem;
}

async function getCartItems(cart_id) {
  return CartItem.find({ cart_id }).populate("p_id");
}

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

async function updateCartItem(cart_item_id, cart_item_quantity) {
  return CartItem.findByIdAndUpdate(
    cart_item_id,
    { cart_item_quantity },
    { new: true }
  );
}

async function removeCartItem(cart_item_id) {
  return CartItem.findByIdAndDelete(cart_item_id);
}

async function updateProductStock(p_id, quantity, options = {}) {
  return Product.findByIdAndUpdate(
    p_id,
    { $inc: { p_stock_quantity: -quantity } },
    { new: true, ...options }
  );
}

async function getCartByUserId(user_id) {
  try {
    const cart = await getOrCreateCart(user_id);
    const cartItems = await getCartItems(cart._id);
    return { cart, items: cartItems };
  } catch (error) {
    throw new Error(`Lỗi khi lấy giỏ hàng theo user_id: ${error.message}`);
  }
}

module.exports = {
  getOrCreateCart,
  addCartItem,
  getCartItems,
  getCartItemsWithSubcategories,
  updateCartItem,
  removeCartItem,
  updateProductStock,
  getProductById,
  getCartByUserId,
};
