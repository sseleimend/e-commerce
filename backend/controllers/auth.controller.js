import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  ); // 7 days
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({ email, password, name });

    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);

    setCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    await storeRefreshToken(user._id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User login failed",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    await redis.del(`refresh_token:${decoded.userId}`);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({
      success: true,
      message: "User logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User logout failed",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "No refresh token provided",
      });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
};

export const profile = async (req, res) => {
  try {
    const { accessToken } = req.cookies;
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "No access token provided",
      });
    }
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};
