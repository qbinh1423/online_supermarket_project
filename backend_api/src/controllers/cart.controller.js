const cartService = require("../services/cart.service");
const CartItem = require("../models/cart_item");
const FpGrowthService = require("../services/fp_growth.service");
const mongoose = require("mongoose");

async function addToCart(req, res) {
  try {
    const { p_id, cart_item_quantity } = req.body;
    const c_id = req.user._id;
    console.log("User ID:", c_id, "Product ID:", p_id);
    const cart = await cartService.getOrCreateCart(c_id);
    const product = await cartService.getProductById(p_id);

    if (!product || product.p_stock_quantity < cart_item_quantity) {
      return res
        .status(400)
        .json({ message: "Product unavailable or insufficient stock" });
    }

    const cartItem = await cartService.addCartItem(
      cart._id,
      p_id,
      cart_item_quantity
    );

    res.json({
      status: "success",
      message: "Item added to cart",
      data: cartItem,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getCart(req, res) {
  try {
    const c_id = req.user._id;
    const cart = await cartService.getOrCreateCart(c_id);
    const cartItems = await cartService.getCartItems(cart._id);
    res.json({ status: "success", data: { cart, items: cartItems } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateCartItem(req, res) {
  try {
    const { cart_item_id, cart_item_quantity } = req.body;

    if (!Number.isInteger(cart_item_quantity) || cart_item_quantity < 1) {
      return res
        .status(400)
        .json({ message: "Quantity must be a positive integer" });
    }

    const cartItem = await CartItem.findById(cart_item_id);
    const product = await cartService.getProductById(cartItem.p_id);
    if (!product || product.p_stock_quantity < cart_item_quantity) {
      return res.status(400).json({
        message: `Insufficient stock for product ${
          product?.p_name || "unknown"
        }. Available: ${product?.p_stock_quantity || 0}`,
      });
    } else {
      const cartItem = await cartService.updateCartItem(
        cart_item_id,
        cart_item_quantity
      );
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json({
        status: "success",
        message: "Cart item updated",
        data: cartItem,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function removeCartItem(req, res) {
  try {
    const cartItem = await cartService.removeCartItem(req.params.cart_item_id);
    if (!cartItem)
      return res.status(404).json({ message: "Cart item not found" });
    res.json({ status: "success", message: "Cart item removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function checkout(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { shipping_address, promotion_code } = req.body;
    const c_id = req.user._id;
    const cart = await cartService.getOrCreateCart(c_id);
    const cartItems = await cartService.getCartItems(cart._id);

    if (!cartItems.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total_amount = 0;
    for (const item of cartItems) {
      if (item.p_id.p_stock_quantity < item.cart_item_quantity) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${item.p_id.p_name}` });
      }
      total_amount += item.p_id.p_price * item.cart_item_quantity;
    }

    let promotion_id = null;
    let discount = 0;
    if (promotion_code) {
      const promotion = await cartService.getPromotionByCode(promotion_code);
      if (
        promotion &&
        new Date() >= promotion.start_date &&
        new Date() <= promotion.end_date
      ) {
        discount = (total_amount * promotion.discount_percentage) / 100;
        promotion_id = promotion._id;
      } else {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Invalid or expired promotion code" });
      }
    }

    total_amount -= discount;

    const order = await cartService.createOrder(
      {
        c_id,
        total_amount,
        shipping_address,
        promotion_id,
        o_status: "pending",
      },
      { session }
    );

    for (const item of cartItems) {
      await cartService.createOrderDetail(
        {
          o_id: order._id,
          p_id: item.p_id._id,
          order_detail_quantity: item.cart_item_quantity,
          unit_price: item.p_id.p_price,
        },
        { session }
      );
      await cartService.updateProductStock(
        item.p_id._id,
        item.cart_item_quantity,
        { session }
      );
    }

    await CartItem.deleteMany({ cart_id: cart._id }, { session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      status: "success",
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
}

async function getRecommendedProducts(req, res) {
  try {
    const { cartId } = req.params;

    if (!cartId || !mongoose.Types.ObjectId.isValid(cartId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart ID",
      });
    }

    const result = await FpGrowthService.getRecommendedProducts(cartId);

    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    console.error("Error in getRecommendedProducts controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getCartByUserId(req, res) {
  try {
    const user_id = req.user._id;
    const { cart, items } = await cartService.getCartByUserId(user_id);
    res.json({
      status: "success",
      message: "Cart retrieved successfully",
      data: { cart, items },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  checkout,
  getRecommendedProducts,
  getCartByUserId,
};
