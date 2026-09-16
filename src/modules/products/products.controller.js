import Product from "./products.model.js";
import Category from "../categories/categories.model.js";
import httpStateText from "../../utils/httpStateText.js";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../middlewares/catchAsync.js";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from "../../integrations/cloudinary.service.js";

const PRODUCT_IMAGE_FOLDER = "products";

// GET /api/products
const getAllProducts = catchAsync(async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
  }

  const products = await Product.find(filter, { __v: 0 })
    .limit(limit)
    .skip(skip);

  res.json({
    status: httpStateText[200],
    data: { products },
    pagination: {
      page,
      limit,
      total: await Product.countDocuments(filter),
    },
  });
});

// GET /api/products/:id
const getSingleProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(AppError.create("Product not found", 404, httpStateText[404]));
  }
  res.json({ status: httpStateText[200], data: { product } });
});

// POST /api/products
const createProduct = catchAsync(async (req, res, next) => {
  const { name, description, price, discountPrice, category, brand, stock } =
    req.body;

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) {
    return next(AppError.create("Category not found", 400, httpStateText[400]));
  }

  let images = [];
  if (req.files && req.files.length > 0) {
    // Uploaded in parallel — order isn't guaranteed to match req.files,
    // fine here since nothing downstream depends on image order.
    images = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(
          file.buffer,
          PRODUCT_IMAGE_FOLDER,
        );
        return { url: result.secure_url, publicId: result.public_id };
      }),
    );
  }

  const newProduct = new Product({
    name,
    description,
    price,
    discountPrice: discountPrice || null,
    category,
    brand,
    stock,
    images,
    createdBy: req.currentUser.id,
  });

  await newProduct.save();
  res
    .status(201)
    .json({ status: httpStateText[201], data: { product: newProduct } });
});

// PATCH /api/products/:id
const updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(AppError.create("Product not found", 404, httpStateText[404]));
  }

  const { name, description, price, discountPrice, category, brand, stock } =
    req.body;

  // New images uploaded on an update REPLACE the old set — delete the old
  // Cloudinary assets so nothing is left orphaned on Cloudinary's side.
  if (req.files && req.files.length > 0) {
    await Promise.all(
      product.images.map((image) => deleteFromCloudinary(image.publicId)),
    );
    product.images = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(
          file.buffer,
          PRODUCT_IMAGE_FOLDER,
        );
        return { url: result.secure_url, publicId: result.public_id };
      }),
    );
  }

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (discountPrice !== undefined) product.discountPrice = discountPrice;
  if (category !== undefined) {
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return next(AppError.create("Category not found", 400, httpStateText[400]));
    }
    product.category = category;
  }
  if (brand !== undefined) product.brand = brand;
  if (stock !== undefined) product.stock = stock;

  await product.save();
  res.json({ status: httpStateText[200], data: { product } });
});

// DELETE /api/products/:id
const deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(AppError.create("Product not found", 404, httpStateText[404]));
  }

  await Promise.all(
    product.images.map((image) => deleteFromCloudinary(image.publicId)),
  );
  await Product.findByIdAndDelete(req.params.id);

  res.json({ status: httpStateText[200], data: { message: "Product deleted" } });
});

export {
  getAllProducts,
  getSingleProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
