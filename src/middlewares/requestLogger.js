// middlewares/requestLogger.js
import morgan from "morgan";
import logger from "../utils/logger.js";

// pipe morgan's output into winston at the "http" level
const stream = {
  write: (message) => logger.http(message.trim()),
};

// skip noisy logs in test env
const skip = () => process.env.NODE_ENV === "test";

const morganFormat =
  process.env.NODE_ENV === "production"
    ? "combined"
    : ":method :url :status :res[content-length] - :response-time ms";

const requestLogger = morgan(morganFormat, { stream, skip });

export default requestLogger;
