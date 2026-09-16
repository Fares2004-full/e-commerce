import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "first name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "not valid email"],
    },
    passwordHash: {
      type: String,
      required: [true, "password is required"],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },

    avatarUrl: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: [true, "role is required"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    // Kept on User (not in the reference §5 field list) because it powers
    // a check the doc's own auth middleware needs regardless: invalidating
    // already-issued short-lived access tokens the moment a password
    // changes, which a refresh-token revocation alone can't do since
    // access tokens are stateless JWTs.
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ deletedAt: 1 });

// Soft-delete convention: exclude deleted users from normal reads by
// default. Anything that genuinely needs a deleted user (e.g. an admin
// audit view) should query with `.where("deletedAt").ne(null)` explicitly
// or bypass this by using a raw collection query.
function excludeSoftDeleted() {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
}
userSchema.pre(/^find/, excludeSoftDeleted);

const User = mongoose.model("User", userSchema);
export default User;
