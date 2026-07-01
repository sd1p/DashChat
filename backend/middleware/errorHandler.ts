import type { ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err instanceof Error ? err.message : "Unknown error",
    stack:
      process.env.NODE_ENV === "production"
        ? null
        : err instanceof Error
        ? err.stack
        : null,
  });
};

export default errorHandler;
