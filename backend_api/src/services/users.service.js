const bcrypt = require("bcrypt");
const User = require("../models/users");
const OTP = require("../models/otp");
const mongoose = require("mongoose");

async function createUser(payload) {
  try {
    const hashedPassword = await bcrypt.hash(payload.c_password, 10);
    const user = new User({
      ...payload,
      c_password: hashedPassword,
      c_address: payload.c_address || null,
      c_date: payload.c_date || null,
    });
    const savedUser = await user.save();
    return savedUser;
  } catch (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

async function updateUser(id, payload) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid user ID format");
    }
    const updateData = {
      c_name: payload.c_name,
      c_phone: payload.c_phone,
      c_address: payload.c_address,
      c_date: payload.c_date,
    };
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );
    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-c_password");
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

async function countUsers() {
  try {
    const count = await User.countDocuments({ c_role: "user" });
    return count;
  } catch (error) {
    throw new Error(`Failed to count users: ${error.message}`);
  }
}

const getAllUsers = async () => {
  return await User.find();
};

async function getRecentUsers(limit = 5) {
  try {
    return await User.find({ c_role: "user" })
      .select("c_name createdAt")
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Failed to get recent users: ${error.message}`);
  }
}

async function getUserById(id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid user ID format");
    }
    const user = await User.findById(id).select("-c_password");
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  } catch (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

async function getUserByEmail(email) {
  return User.findOne({ c_email: email }).select("-c_password");
}

async function getUserByEmailWithPassword(email) {
  return User.findOne({ c_email: email });
}

async function updateUserPassword(email, hashedPassword) {
  return User.updateOne({ c_email: email }, { c_password: hashedPassword });
}

async function saveOTP(email, otp) {
  try {
    await OTP.deleteMany({ c_email: email });
    const otpRecord = new OTP({ c_email: email, otp });
    return await otpRecord.save();
  } catch (error) {
    console.error("Error saving OTP:", error);
    throw new Error(`Failed to save OTP: ${error.message}`);
  }
}

async function verifyOTP(email, otp) {
  return OTP.findOne({ c_email: email, otp });
}

const deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

module.exports = {
  createUser,
  updateUser,
  countUsers,
  getAllUsers,
  getRecentUsers,
  getUserById,
  getUserByEmail,
  getUserByEmailWithPassword,
  updateUserPassword,
  saveOTP,
  verifyOTP,
  deleteUser,
};
