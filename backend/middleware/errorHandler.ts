import type { ErrorRequestHandler } from "express";

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Log every failed request server-side so errors surface in the backend
  // console (previously only sent to the client). Includes the method + path
  // to pinpoint which endpoint threw.
  console.error(
    `[error] ${req.method} ${req.originalUrl} -> ${statusCode}:`,
    err instanceof Error ? err.stack ?? err.message : err
  );

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
