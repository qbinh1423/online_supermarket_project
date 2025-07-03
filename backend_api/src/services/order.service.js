const mongoose = require("mongoose");
const Order = require("../models/order");
const OrderDetail = require("../models/order_detail");
const Product = require("../models/product");
const Voucher = require("../models/voucher");

async function createOrder(orderData, user) {
  try {
    if (!orderData.o_name) {
      throw new Error("Order name is required.");
    }
    if (!orderData.o_phone) {
      throw new Error("Phone number is required.");
    }
    if (!orderData.o_shipping_address) {
      throw new Error("Shipping address is required.");
    }
    if (!orderData.o_payment_method) {
      throw new Error("Payment method is required.");
    }
    if (!["COD", "Banking"].includes(orderData.o_payment_method)) {
      throw new Error("Invalid payment method.");
    }

    let o_total_amount = 0;
    let v_name = null;

    if (orderData.v_name) {
      const voucher = await Voucher.findOne({
        v_name: orderData.v_name,
        v_stock_quantity: { $gt: 0 },
        v_expiry_date: { $gt: new Date() },
      });
      if (voucher) {
        v_name = voucher._id;
        await Voucher.findByIdAndUpdate(voucher._id, {
          $inc: { v_stock_quantity: -1 },
        });
      } else {
        throw new Error(
          "Voucher does not exist, is out of stock, or has expired."
        );
      }
    }

    const order = new Order({
      c_id: user ? user._id : orderData.c_id || null,
      o_name: orderData.o_name,
      o_phone: orderData.o_phone,
      o_shipping_address: orderData.o_shipping_address,
      o_total_amount,
      v_name,
      o_payment_method: orderData.o_payment_method,
      o_payment_status: "pending",
      o_status: "pending",
      statusHistory: [{ status: "pending", timestamp: new Date() }],
      orderDetails: [],
    });

    await order.save();

    const orderDetails = await OrderDetail.find({ o_id: order._id });
    if (orderDetails.length > 0) {
      o_total_amount = orderDetails.reduce(
        (sum, item) => sum + item.unit_price * item.order_detail_quantity,
        0
      );
      order.orderDetails = orderDetails.map((detail) => detail._id);
    }

    if (v_name) {
      const voucher = await Voucher.findById(v_name);
      if (voucher) {
        o_total_amount -= voucher.v_price;
        o_total_amount = Math.max(0, o_total_amount);
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      {
        o_total_amount,
        o_payment_status: orderData.o_payment_status || "pending",
        orderDetails: order.orderDetails,
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: "orderDetails",
        populate: {
          path: "p_id",
          model: "Product",
        },
      })
      .populate("c_id");

    return updatedOrder;
  } catch (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }
}

async function addOrderItem(order_id, p_id, order_detail_quantity) {
  try {
    const order = await Order.findById(order_id);
    if (!order) {
      throw new Error("Order does not exist.");
    }
    const product = await Product.findById(p_id);
    if (!product) {
      throw new Error("Product does not exist.");
    }
    if (!Number.isInteger(order_detail_quantity) || order_detail_quantity < 1) {
      throw new Error("Quantity must be a positive integer.");
    }

    let orderItem = await OrderDetail.findOne({ o_id: order_id, p_id });
    if (orderItem) {
      orderItem.order_detail_quantity += order_detail_quantity;
      await orderItem.save();
    } else {
      orderItem = new OrderDetail({
        o_id: order_id,
        p_id,
        order_detail_quantity,
        unit_price: product.p_price,
      });
      await orderItem.save();
      order.orderDetails.push(orderItem._id);
    }

    const orderDetails = await OrderDetail.find({ o_id: order_id });
    let o_total_amount = orderDetails.reduce(
      (sum, item) => sum + item.unit_price * item.order_detail_quantity,
      0
    );

    if (order.v_name) {
      const voucher = await Voucher.findById(order.v_name);
      if (voucher) {
        o_total_amount -= voucher.v_price;
        o_total_amount = Math.max(0, o_total_amount);
      }
    }

    await Order.findByIdAndUpdate(order_id, {
      o_total_amount,
      orderDetails: orderDetails.map((detail) => detail._id),
    });

    return orderItem;
  } catch (error) {
    throw new Error(`Failed to add order item: ${error.message}`);
  }
}

async function updateOrder(order_id, updateData, options = {}) {
  try {
    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      throw new Error("Invalid order ID.");
    }

    const allowedFields = [
      "c_id",
      "o_name",
      "o_phone",
      "o_shipping_address",
      "o_total_amount",
      "v_name",
      "o_payment_method",
      "o_payment_status",
    ];
    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter(
      (field) => !allowedFields.includes(field)
    );
    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(", ")}`);
    }

    if (
      updateData.o_payment_method &&
      !["COD", "Banking"].includes(updateData.o_payment_method)
    ) {
      throw new Error("Invalid payment method.");
    }

    if (
      updateData.o_payment_status &&
      !["pending", "completed", "failed"].includes(updateData.o_payment_status)
    ) {
      throw new Error("Invalid payment status.");
    }

    let o_total_amount = null;
    if (updateData.v_name) {
      const voucher = await Voucher.findOne({
        v_name: updateData.v_name,
        v_stock_quantity: { $gt: 0 },
        v_expiry_date: { $gt: new Date() },
      });
      if (voucher) {
        updateData.v_name = voucher._id;
        const orderDetails = await OrderDetail.find({ o_id: order_id });
        o_total_amount = orderDetails.reduce(
          (sum, item) => sum + item.unit_price * item.order_detail_quantity,
          0
        );
        o_total_amount -= voucher.v_price;
        o_total_amount = Math.max(0, o_total_amount);
        updateData.o_total_amount = o_total_amount;
        await Voucher.findByIdAndUpdate(voucher._id, {
          $inc: { v_stock_quantity: -1 },
        });
      } else {
        throw new Error(
          "Voucher does not exist, is out of stock, or has expired."
        );
      }
    }
    const updatedOrder = await Order.findByIdAndUpdate(
      order_id,
      { $set: updateData },
      { new: true, runValidators: true, ...options }
    );
    if (!updatedOrder) {
      throw new Error("Order does not exist.");
    }
    return updatedOrder;
  } catch (error) {
    throw new Error(`Failed to update order: ${error.message}`);
  }
}

async function updateOrderItem(order_detail_id, order_detail_quantity) {
  try {
    if (!Number.isInteger(order_detail_quantity) || order_detail_quantity < 1) {
      throw new Error("Quantity must be a positive integer.");
    }

    const updatedOrderItem = await OrderDetail.findByIdAndUpdate(
      order_detail_id,
      { order_detail_quantity },
      { new: true, runValidators: true }
    );

    if (!updatedOrderItem) {
      throw new Error("Order detail does not exist.");
    }

    const orderDetails = await OrderDetail.find({
      o_id: updatedOrderItem.o_id,
    });
    let o_total_amount = orderDetails.reduce(
      (sum, item) => sum + item.unit_price * item.order_detail_quantity,
      0
    );

    const order = await Order.findById(updatedOrderItem.o_id);
    if (order.v_name) {
      const voucher = await Voucher.findById(order.v_name);
      if (voucher) {
        o_total_amount -= voucher.v_price;
        o_total_amount = Math.max(0, o_total_amount);
      }
    }

    await Order.findByIdAndUpdate(updatedOrderItem.o_id, {
      o_total_amount,
      orderDetails: orderDetails.map((detail) => detail._id),
    });

    return updatedOrderItem;
  } catch (error) {
    throw new Error(`Failed to update order item: ${error.message}`);
  }
}

async function updateOrderStatus(
  order_id,
  status,
  cancel_reason,
  options = {}
) {
  try {
    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      throw new Error("Invalid order ID.");
    }
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "canceled",
    ];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid order status.");
    }
    const order = await Order.findById(order_id);
    if (!order) {
      throw new Error("Order does not exist.");
    }
    const validTransitions = {
      pending: ["processing", "canceled"],
      processing: ["shipped", "canceled"],
      shipped: ["delivered"],
      delivered: [],
      canceled: [],
    };
    if (!validTransitions[order.o_status].includes(status)) {
      throw new Error(`Cannot transition from ${order.o_status} to ${status}.`);
    }

    if (status === "canceled" && !cancel_reason) {
      throw new Error("Cancel reason is required when canceling an order.");
    }

    order.o_status = status;
    if (status === "canceled") {
      order.o_cancel_reason = cancel_reason;
    }

    order.statusHistory.push({
      status,
      timestamp: new Date(),
      cancelReason: status === "canceled" ? cancel_reason : null,
    });

    await order.save(options);
    return order;
  } catch (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

async function deleteOrder(order_id, user, options = {}) {
  try {
    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      throw new Error("Invalid order ID.");
    }
    const order = await Order.findById(order_id);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.o_status === "delivered") {
      throw new Error("Cannot delete delivered orders.");
    }

    await Order.findByIdAndDelete(order_id);

    await OrderDetail.deleteMany({ o_id: order_id });

    if (order.v_name) {
      await Voucher.findByIdAndUpdate(order.v_name, {
        $inc: { v_stock_quantity: 1 },
      });
    }

    return { message: "Order deleted successfully." };
  } catch (error) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }
}

async function getAllOrder({ page = 1, limit = 10, status = null }) {
  try {
    const query = status ? { o_status: status } : {};
    const orders = await Order.find(query)
      .populate("c_id", "name email")
      .populate("v_name", "v_name v_price")
      .populate({
        path: "orderDetails",
        populate: {
          path: "p_id",
          select: "p_name p_price p_images",
        },
      })
      .sort({ o_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments(query);

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error(`Failed to get orders: ${error.message}`);
  }
}

async function getOrderByIdCustomer(c_id, { page = 1, limit = 10 }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(c_id)) {
      throw new Error("Invalid customer ID.");
    }

    const orders = await Order.find({ c_id })
      .populate("v_name", "v_name v_price")
      .sort({ o_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Order.countDocuments({ c_id });

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    throw new Error(`Failed to get customer orders: ${error.message}`);
  }
}

async function getCountOrder(status = null) {
  try {
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "canceled",
    ];
    if (status && !validStatuses.includes(status)) {
      throw new Error("Invalid order status.");
    }
    const query = status ? { o_status: status } : {};
    const count = await Order.countDocuments(query);
    return { status: status || "all", count };
  } catch (error) {
    throw new Error(`Failed to count orders: ${error.message}`);
  }
}

async function getOrderDetail(order_id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      throw new Error("Invalid order ID.");
    }

    const order = await Order.findById(order_id)
      .populate("c_id", "name email")
      .populate("v_name", "v_name v_price")
      .lean();

    if (!order) {
      throw new Error("Order not found.");
    }

    const orderDetails = await OrderDetail.find({ o_id: order_id })
      .populate("p_id", "p_name p_price p_images")
      .lean();

    const validOrderDetails = orderDetails.filter(
      (detail) => detail.p_id !== null
    );

    order.orderDetails = validOrderDetails;

    return order;
  } catch (error) {
    throw new Error(`Failed to get order details: ${error.message}`);
  }
}

module.exports = {
  createOrder,
  addOrderItem,
  updateOrder,
  updateOrderItem,
  updateOrderStatus,
  deleteOrder,
  getAllOrder,
  getCountOrder,
  getOrderByIdCustomer,
  getOrderDetail,
};
