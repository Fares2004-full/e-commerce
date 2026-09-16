// src/app.js — Express wiring: middleware + module routers mounted here.
// No mongoose.connect() and no app.listen() in this file — that's
// bootstrap concern, kept in the project-root index.js.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import productsRoutes from "./modules/products/products.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";

import requestLogger from "./middlewares/requestLogger.js";
import notFound from "./middlewares/notFound.js";
import globalErrorHandler from "./middlewares/globalErrorHandler.js";

const app = express();

// cors is a middleware that allows cross-origin requests.
// It is used to enable communication between the frontend and backend
// when they are hosted on different domains or ports.
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// log every incoming request (method, url, status, response time)
app.use(requestLogger);

// endpoints moved from /api/users/* to /api/auth/* for register, login,
// refresh, logout(-all), activate-account, forgot/verify/reset-password —
// update the frontend if it still calls the old /api/users/* paths.
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);

app.use(notFound);
app.use(globalErrorHandler);

export default app;
