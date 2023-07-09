const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/isAuthenticated");
const {
  sendMessage,
  getMessages,
  markAsSeen,
} = require("../controller/messageController");

router.route("/").post(isAuthenticated, sendMessage);
router.route("/:chatId").get(isAuthenticated, getMessages);
router.route("/mark-seen/:chatId").get(isAuthenticated, markAsSeen);

module.exports = router;
