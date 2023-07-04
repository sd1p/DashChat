const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");

exports.isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    const decrypetdId = jwt.verify(token, process.env.JWT_SECRET);
    if (decrypetdId) {
      const query = {
        _id: decrypetdId.id,
      };
      req.user = await User.findOne(query).select("-password");
    }
  } else {
    return res.status(400).json({ message: "Protected Route" });
  }

  next();
});
