const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/isAuthenticated");
const { sendMessage, getMessages } = require("../controller/messageController");

router.route("/").post(isAuthenticated, sendMessage);
router.route("/:chatId").get(isAuthenticated, getMessages);

module.exports = router;
