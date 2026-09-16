// middlewares/globalErrorHandler.js
import httpStateText from "../utils/httpStateText.js";
import logger from "../utils/logger.js";

const globalErrorHandler = (error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: httpStateText[400],
      message: "File size exceeds the allowed limit",
      data: null,
    });
  }
  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      status: httpStateText[400],
      message: `Unexpected file field "${error.field}" — check the field name matches what the API expects`,
      data: null,
    });
  }

  logger.error(error.message, {
    stack: error.stack,
    path: req?.originalUrl,
    method: req?.method,
  });
  res.status(error.statusCode || 500).json({
    status: error.statusText || httpStateText[500],
    message: error.message,
    data: null,
  });
};

export default globalErrorHandler;
