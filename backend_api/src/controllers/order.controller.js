const OrderService = require("../services/order.service");

async function createOrderController(req, res) {
  try {
    const orderData = req.body;
    const user = req.user;
    const order = await OrderService.createOrder(orderData, user);
    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function addOrderItemController(req, res) {
  try {
    const { order_id, p_id, order_detail_quantity } = req.body;
    if (!order_id || !p_id || !order_detail_quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      });
    }
    const orderItem = await OrderService.addOrderItem(
      order_id,
      p_id,
      order_detail_quantity
    );
    return res.status(200).json({
      success: true,
      message: "Order item added successfully.",
      data: orderItem,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateOrderController(req, res) {
  try {
    const { order_id } = req.params;
    const updateData = req.body;
    const updatedOrder = await OrderService.updateOrder(order_id, updateData);
    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: updatedOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateOrderItemController(req, res) {
  try {
    const { order_detail_id } = req.params;
    const { order_detail_quantity } = req.body;
    if (!order_detail_quantity || order_detail_quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer.",
      });
    }
    const updatedOrderItem = await OrderService.updateOrderItem(
      order_detail_id,
      order_detail_quantity
    );
    return res.status(200).json({
      success: true,
      message: "Order item updated successfully.",
      data: updatedOrderItem,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateOrderStatusController(req, res) {
  try {
    const { order_id } = req.params;
    const { status, cancel_reason } = req.body;
    const user = req.user;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }
    if (status === "canceled" && !cancel_reason) {
      return res.status(400).json({
        success: false,
        message: "Cancel reason is required.",
      });
    }
    const updatedOrder = await OrderService.updateOrderStatus(
      order_id,
      status,
      cancel_reason,
      user
    );
    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      data: updatedOrder,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function deleteOrderController(req, res) {
  try {
    const { order_id } = req.params;
    const user = req.user;
    await OrderService.deleteOrder(order_id, user);
    return res.status(200).json({
      success: true,
      message: "Order deleted successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function getAllOrderController(req, res) {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const result = await OrderService.getAllOrder({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });
    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function getOrderByIdCustomerController(req, res) {
  try {
    const { c_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const user = req.user;
    if (user._id.toString() !== c_id && !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access these orders.",
      });
    }
    const result = await OrderService.getOrderByIdCustomer(c_id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    return res.status(200).json({
      success: true,
      message: "Customer orders retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function getCountOrderController(req, res) {
  try {
    const { status } = req.params;
    const result = await OrderService.getCountOrder(status);
    return res.status(200).json({
      success: true,
      message: "Order count retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function getOrderDetailController(req, res) {
  try {
    const { order_id } = req.params;
    const order = await OrderService.getOrderDetail(order_id);
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  createOrderController,
  addOrderItemController,
  updateOrderController,
  updateOrderItemController,
  updateOrderStatusController,
  deleteOrderController,
  getAllOrderController,
  getCountOrderController,
  getOrderByIdCustomerController,
  getOrderDetailController,
};
