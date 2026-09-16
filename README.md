# E-Commerce Backend

A modular Node.js/Express/MongoDB backend: JWT authentication with refresh-token
rotation, RBAC (roles + permissions), and product/category management with
Cloudinary image uploads.

## Tech stack

- Node.js / Express 5
- MongoDB / Mongoose
- JWT access tokens + opaque, hashed refresh tokens (rotation + reuse detection)
- RBAC — roles reference a set of fine-grained permission keys
- Cloudinary (image uploads, via multer memory storage)
- Nodemailer (Gmail SMTP) for activation + password-reset emails
- express-validator for request validation
- Winston + morgan for logging
- express-rate-limit on sensitive auth routes

## Project structure

```
index.js                     # bootstrap: connects Mongo, seeds RBAC, starts the server
src/
  app.js                     # Express app: middleware + routes, no connect()/listen()
  config/                    # cloudinary, cookie options
  errors/                    # AppError
  integrations/              # cloudinary.service, email.service
  middlewares/                # authenticate, authorize, requirePermission,
                                # checkUserOwnership, validate, rateLimit,
                                # uploadMemory, requestLogger, globalErrorHandler,
                                # notFound, catchAsync
  modules/
    auth/                      # register, login, refresh, logout(-all),
                                # activate-account, forgot/verify/reset-password
      models/                   # refreshToken, emailVerificationToken, passwordResetToken
    users/                       # profile CRUD (get/list/update/delete)
    products/                     # product CRUD + Cloudinary images
    categories/                    # category CRUD (self-referencing tree)
    rbac/                            # Role/Permission models + seed
  utils/                       # logger, hash, generateJWT, sanitizeUser, slugify, ...
logs/                          # winston output (gitignored except .gitkeep)
```

Each module owns its own `*.controller.js`, `*.routes.js`, `*.model.js`, and
`*.validation.js` where relevant. Cross-cutting pieces (auth guards, error
handling, uploads, logging) live under `src/middlewares/`, `src/config/`,
and `src/integrations/` so no module reaches into another module's internals.

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_ACCESS_SECRET, EMAIL_*, CLOUDINARY_*
npm start
```

On boot, `index.js` connects to MongoDB and calls `seedRbac()`, which
idempotently creates the default roles (`customer`, `support`, `moderator`,
`admin`, `super_admin`) and permission keys — safe to run on every restart.

## API overview

All routes are mounted at the top level (no `/api/v1` prefix currently).

**Auth** — `/api/auth`
| Method | Path | Notes |
|---|---|---|
| POST | `/register` | multipart (`avatar` optional), creates a `customer` account, sends an activation email |
| GET | `/activate-account` | `?token=` from the activation email |
| POST | `/login` | rate-limited by failed-attempt lockout on the account itself |
| POST | `/refresh` | reads the `refreshToken` cookie, rotates it |
| POST | `/logout` | auth required — revokes the current device's session |
| POST | `/logout-all` | auth required — revokes every session |
| POST | `/forgot-password` | rate-limited, sends an OTP by email |
| POST | `/verify-reset-otp` | rate-limited, exchanges a valid OTP for a reset token |
| POST | `/reset-password` | rate-limited, consumes the reset token |

**Users** — `/api/users` (all require authentication)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | admin/support-tier + `user:read` permission |
| GET | `/:id` | admin/support-tier + `user:read` permission |
| PATCH | `/:id` | owner only, multipart (`avatar` optional) |
| DELETE | `/:id` | owner only, soft delete |

**Products** — `/api/products`
| Method | Path | Notes |
|---|---|---|
| GET | `/` | public |
| GET | `/:id` | public |
| POST | `/` | admin/moderator-tier, multipart (`images`, up to 6) |
| PATCH | `/:id` | admin/moderator-tier, multipart |
| DELETE | `/:id` | admin/moderator-tier |

**Categories** — `/api/categories`
| Method | Path | Notes |
|---|---|---|
| GET | `/` | public |
| GET | `/:id` | public |
| POST | `/` | admin-tier + `category:create` |
| PATCH | `/:id` | admin/moderator-tier + `category:update` |
| DELETE | `/:id` | admin-tier + `category:delete` |

> Note: register/login/refresh/logout used to live under `/api/users/*` in an
> earlier version of this backend — they now live under `/api/auth/*`. Update
> any client code still pointing at the old paths.

## Response shape

```json
// success
{ "status": "OK", "data": { } }

// error
{ "status": "Bad Request", "message": "...", "data": null }
```

## Notes for next time

- `npm start` runs the server through `nodemon` — fine for solo development,
  but worth splitting into a plain `node index.js` "start" script and a
  separate "dev" script with nodemon before this goes anywhere near production.
- No test suite yet.
