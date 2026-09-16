import "dotenv/config"; // MUST be the first import — loads .env before any other module runs

import mongoose from "mongoose";
import app from "./src/app.js";
import logger from "./src/utils/logger.js";
import { seedRbac } from "./src/modules/rbac/rbac.service.js";

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info("MongoDB Connected");

    // ensure the default roles/permissions exist before anything can
    // reference them (e.g. registering a new user needs the "customer" role)
    await seedRbac();

    app.listen(process.env.PORT_NUMBER, () => {
      logger.info(`Server is running on port ${process.env.PORT_NUMBER}`);
    });
  } catch (error) {
    logger.error("Database connection failed", {
      error: error.message,
      stack: error.stack,
    });
  }
};

startServer();
