const asyncHandler = require("express-async-handler");
const User = require("../model/userModel");
const generateToken = require("../utils/jwtToken");
const jwt = require("jsonwebtoken");

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, photo } = req.body;
  if (!name | !email | !password) {
    res.status(400);
    throw new Error("Please Enter all the fields");
  }

  const userExist = await User.findOne({ email });

  if (userExist) {
    res.status(400);
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    photo,
  });

  if (user) {
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 1000 * 60 * 60 * 24
      ),
      httpOnly: true,
    };
    // user.password = undefined;
    const token = generateToken(user._id);
    res.status(201).cookie("token", token, cookieOptions).json({ user, token });
  } else {
    res.status(400);
    throw new Error("User not created");
  }
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  const match = async (password) => {
    if (password === "") {
      return false;
    }
    return await user.comparePassword(password);
  };

  if (user && match) {
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 1000 * 60 * 60 * 24
      ),
      httpOnly: true,
    };
    token = generateToken(user._id);
    res.status(200).cookie("token", token, cookieOptions).json({ user, token });
  } else {
    res.status(400).json({ message: "Inavalid Email Address or Password" });
  }
});

exports.findChats = asyncHandler(async (req, res) => {
  keyword = req.query.search;

  const searchQuery = keyword
    ? {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(searchQuery)
    .find({
      _id: { $ne: req.user._id },
    })
    .select("-password");
  res.send(users);
});

exports.authUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(200).json({ auth: false, user: null });
  } else {
    return res.status(200).json({ auth: true, user: req.user });
  }
});

exports.userLogout = asyncHandler(async (req, res) => {
  if (req.cookies.token) {
    res.status(200).clearCookie("token").json({ message: "Logged Out" });
  } else {
    res.status(200).json({ message: "Already logged Out" });
  }
});
