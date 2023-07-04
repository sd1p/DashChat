const express = require("express");
const {
  registerUser,
  loginUser,
  authUser,
  findChats,
  userLogout,
} = require("../controller/userController");
const { isAuthenticated } = require("../middleware/isAuthenticated");

const router = express.Router();

router.route("/login").post(loginUser);
router.route("/register").post(registerUser);
router.route("/auth").get(isAuthenticated, authUser);
router.route("/find").get(isAuthenticated, findChats);
router.route("/logout").get(isAuthenticated, userLogout);

module.exports = router;
