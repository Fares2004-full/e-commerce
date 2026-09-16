import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "role name is required"],
      unique: true,
      enum: ["customer", "support", "moderator", "admin", "super_admin"],
      trim: true,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  { timestamps: true },
);

const Role = mongoose.model("Role", roleSchema);
export default Role;
