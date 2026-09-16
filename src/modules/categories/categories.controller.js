import Category from "./categories.model.js";
import Product from "../products/products.model.js";
import httpStateText from "../../utils/httpStateText.js";
import AppError from "../../errors/AppError.js";
import catchAsync from "../../middlewares/catchAsync.js";
import { slugify } from "../../utils/slugify.js";


// re-check without colliding with its own current slug.
const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let counter = 2;
  while (
    await Category.findOne({ 
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
};

// GET /api/categories — public, flat list. Each item carries its own
// `parent`, so the frontend can assemble the tree client-side.
// ?parent=root      -> only top-level categories
// ?parent=<someId>  -> only direct children of that category
const getAllCategories = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.parent === "root") {
    filter.parent = null;
  } else if (req.query.parent) {
    filter.parent = req.query.parent;
  }

  const categories = await Category.find(filter, { __v: 0 }).sort("name");
  res.json({ status: httpStateText[200], data: { categories } });
});

// GET /api/categories/:id
const getSingleCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(AppError.create("Category not found", 404, httpStateText[404]));
  }
  res.json({ status: httpStateText[200], data: { category } });
});

// POST /api/categories
const createCategory = catchAsync(async (req, res, next) => {
  const { name, parent, image, isActive } = req.body;

  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      return next(
        AppError.create("Parent category not found", 400, httpStateText[400]),
      );
    }
  }

  const slug = await ensureUniqueSlug(slugify(name));

  const category = await Category.create({
    name,
    slug,
    parent: parent || null,
    image,
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({ status: httpStateText[201], data: { category } });
});

// PATCH /api/categories/:id
const updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(AppError.create("Category not found", 404, httpStateText[404]));
  }

  const { name, parent, image, isActive } = req.body;

  if (parent !== undefined) {
    if (parent === String(category._id)) {
      return next(
        AppError.create(
          "A category cannot be its own parent",
          400,
          httpStateText[400],
        ),
      );
    }
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return next(
          AppError.create("Parent category not found", 400, httpStateText[400]),
        );
      }
    }
    category.parent = parent || null;
  }

  if (name !== undefined && name !== category.name) {
    category.name = name;
    category.slug = await ensureUniqueSlug(slugify(name), category._id);
  }
  if (image !== undefined) category.image = image;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  res.json({ status: httpStateText[200], data: { category } });
});

// DELETE /api/categories/:id — soft delete; blocked if products or active
// subcategories still reference it 
const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return next(AppError.create("Category not found", 404, httpStateText[404]));
  }

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    return next(
      AppError.create(
        `Cannot delete: ${productCount} product(s) still reference this category`,
        409,
        httpStateText[409],
      ),
    );
  }

  const childCount = await Category.countDocuments({ parent: category._id });
  if (childCount > 0) {
    return next(
      AppError.create(
        "Cannot delete: this category still has subcategories",
        409,
        httpStateText[409],
      ),
    );
  }

  category.deletedAt = new Date();
  category.isActive = false;
  await category.save();

  res.json({ status: httpStateText[200], data: { message: "Category deleted" } });
});

export {
  getAllCategories,
  getSingleCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
