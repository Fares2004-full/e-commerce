import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "category name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

categorySchema.index({ parent: 1 });

// Soft-delete convention,exclude deleted categories from normal reads by default.
function excludeSoftDeleted() {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
}
categorySchema.pre(/^find/, excludeSoftDeleted);

const Category = mongoose.model("Category", categorySchema);
export default Category;
