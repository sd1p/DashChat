import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { authUser, findChats, updateProfile } from "../controller/userController";
import { isAuthenticated } from "../middleware/isAuthenticated";

const router = express.Router();

// Avatar uploads go straight to S3 from memory (no local disk). Capped at 5 MB
// — smaller than chat attachments since it's just a profile picture. The mime
// allow-list (images only) is enforced in the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Turn multer's own errors (e.g. size limit) into 400s instead of 500s.
const handleMulterError: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large (max 5 MB)"
        : err.message;
    res.status(400).json({ message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ message: err.message });
    return;
  }
  next(err);
};

// Login / register / logout are handled by Argus (the identity provider).
router.route("/auth").get(isAuthenticated, authUser);
router.route("/find").get(isAuthenticated, findChats);

// Update the current user's profile (name and/or avatar). Accepts
// multipart/form-data with an optional "photo" file and/or "name" field, or a
// plain JSON body ({ name, photo }). multer only consumes multipart requests;
// JSON bodies pass through to the app-wide JSON parser.
router
  .route("/")
  .patch(isAuthenticated, upload.single("photo"), handleMulterError, updateProfile);

export default router;
