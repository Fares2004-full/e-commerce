import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "price is required"],
      min: [0, "price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: null,
      validate: {
        validator: function (value) {
          // `this` only refers to the document on .create()/.save(),
          // not on findByIdAndUpdate — same limitation the rest of this
          return value == null || value < this.price;
        },
        message: "discountPrice must be less than price",
      },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "category is required"],
    },
    brand: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, "stock is required"],
      min: [0, "stock cannot be negative"],
      default: 0,
    },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      default: [],
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

ProductSchema.index({ category: 1 });

const Product = mongoose.model("Product", ProductSchema);
export default Product;
