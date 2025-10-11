import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");
    if (featuredProducts) {
      return res.status(200).json({ products: JSON.parse(featuredProducts) });
    }

    const products = await Product.find({ isFeatured: true }).lean();
    if (products.length === 0) {
      return res.status(404).json({ message: "No featured products found" });
    }

    await redis.set("featured_products", JSON.stringify(products));

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching featured products" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "e-commerce/products",
      });
    }

    const product = new Product({
      title: name,
      description,
      price,
      image: cloudinaryResponse?.secure_url || "",
      category,
    });
    await product.save();

    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ message: "Error creating product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.image) {
      const publicId = product.image.split("/").slice(-1)[0].split(".")[0];
      await cloudinary.uploader.destroy(publicId, {
        folder: "e-commerce/products",
      });
    }

    await Product.findByIdAndDelete(id);

    await updateFeaturedProductsCache();

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $sample: { size: 3 } },
      {
        $project: { name: 1, price: 1, image: 1, _id: 1, description: 1 },
      },
    ]);
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching product recommendations" });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category });
    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products by category" });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.isFeatured = !product.isFeatured;
    await product.save();

    await updateFeaturedProductsCache();

    res.status(200).json({ product });
  } catch (error) {
    res.status(500).json({ message: "Error toggling featured status" });
  }
};

async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.error("Error updating featured products cache:", error);
  }
}
