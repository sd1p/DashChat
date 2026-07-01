import express from "express";
import { isAuthenticated } from "../middleware/isAuthenticated";
import {
  sendMessage,
  getMessages,
  markAsSeen,
} from "../controller/messageController";

const router = express.Router();

router.route("/").post(isAuthenticated, sendMessage);
router.route("/:chatId").get(isAuthenticated, getMessages);
router.route("/mark-seen/:chatId").get(isAuthenticated, markAsSeen);

export default router;
