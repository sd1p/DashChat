import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { isAuthenticated } from "../middleware/isAuthenticated";
import { uploadImage } from "../controller/uploadController";

// Keep the file in memory — we stream the buffer straight to S3, no local disk.
// Any file type is accepted, capped at 10 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Translate multer's own errors (size limit) into 400s instead of letting them
// bubble to the generic 500 error handler.
const handleMulterError: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large (max 10 MB)"
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

const router = express.Router();

router.post(
  "/",
  isAuthenticated,
  upload.single("file"),
  handleMulterError,
  uploadImage
);

export default router;
