const express = require("express");
const { isAuthenticated } = require("../middleware/isAuthenticated");
const {
  createChat,
  getAllChats,
  createGroupChat,
  renameGroup,
  removeMember,
  addMember,
  getChatDetails,
} = require("../controller/chatController");

const router = express.Router();

router.route("/").post(isAuthenticated, createChat);
router.route("/").get(isAuthenticated, getAllChats);
router.route("/:chatId").get(isAuthenticated, getChatDetails);
router.route("/group").post(isAuthenticated, createGroupChat);
router.route("/rename").put(isAuthenticated, renameGroup);
router.route("/groupremove").put(isAuthenticated, removeMember);
router.route("/groupadd").put(isAuthenticated, addMember);

module.exports = router;
