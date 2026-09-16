// utils/logger.js
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// this file now lives at src/utils/, two levels below the project root,
// so we go up twice to keep logs/ at the project root (same place it
// lived when this file was at the top-level utils/ folder)
const logsDir = path.join(__dirname, "..", "..", "logs");

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// human-readable line used for the console
const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
  }),
);

// structured JSON used for the log files
const fileFormat = combine(
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  json(),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  levels: winston.config.npm.levels, // error, warn, info, http, verbose, debug, silly
  format: fileFormat,
  defaultMeta: { service: "loginSystem" },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "exceptions.log") }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, "rejections.log") }),
  ],
});

// also log to the console, everywhere except during tests
if (process.env.NODE_ENV !== "test") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

export default logger;
