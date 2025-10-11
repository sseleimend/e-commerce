import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

const useProductStore = create((set) => ({
  products: [],
  loading: false,

  setProducts: (products) => set({ products }),

  createProduct: async (productData) => {
    set({ loading: true });
    try {
      const response = await axios.post("/products", productData);
      set((state) => ({
        products: [...state.products, response.data],
        loading: false,
      }));
      toast.success("Product created successfully!");
    } catch {
      set({ loading: false });
      toast.error("Failed to create product.");
    }
  },

  fetchAllProducts: async () => {
    set({ loading: true });
    try {
      const response = await axios.get("/products");
      set({ products: response.data.products, loading: false });
    } catch {
      set({ loading: false });
      toast.error("Failed to fetch products.");
    }
  },

  deleteProduct: async (productId) => {
    set({ loading: true });
    try {
      await axios.delete(`/products/${productId}`);
      set((state) => ({
        products: state.products.filter((product) => product._id !== productId),
        loading: false,
      }));
      toast.success("Product deleted successfully!");
    } catch {
      set({ loading: false });
      toast.error("Failed to delete product.");
    }
  },

  toggleFeaturedProduct: async (productId) => {
    set({ loading: true });
    try {
      const response = await axios.patch(`/products/${productId}`);
      console.log(response.data.product.isFeatured);
      set((state) => ({
        products: state.products.map((product) =>
          product._id === productId
            ? { ...product, isFeatured: response.data.product.isFeatured }
            : product
        ),
        loading: false,
      }));
      toast.success("Product updated successfully!");
    } catch {
      set({ loading: false });
      toast.error("Failed to update product.");
    }
  },
}));

export default useProductStore;
