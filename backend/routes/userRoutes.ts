import express from "express";
import { authUser, findChats } from "../controller/userController";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = express.Router();

// Login / register / logout are handled by Clerk on the frontend.
router.route("/auth").get(isAuthenticated, authUser);
router.route("/find").get(isAuthenticated, findChats);

export default router;
