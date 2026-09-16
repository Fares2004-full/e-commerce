import mongoose from "mongoose";

// A permission is a fine-grained capability string, e.g. "user:ban",
// "product:create". Roles reference a set of these instead of the
// app hard-coding "if role === admin" checks everywhere.
const permissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "permission key is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

const Permission = mongoose.model("Permission", permissionSchema);
export default Permission;
