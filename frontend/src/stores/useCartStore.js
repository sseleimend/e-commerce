import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  loading: false,
  cart: [],
  coupon: null,
  isCouponApplied: false,
  total: 0,
  subtotal: 0,

  getMyCoupon: async () => {
    try {
      const response = await axios.get("/coupons");
      set({ coupon: response.data });
    } catch {
      toast.error("Failed to fetch coupon.");
    }
  },

  applyCoupon: async (code) => {
    set({ loading: true });
    try {
      const response = await axios.post("/coupons/validate", { code });
      set({ coupon: response.data, isCouponApplied: true });
      get().calculateTotals();
      toast.success("Coupon applied!");
    } catch {
      toast.error("Failed to apply coupon.");
    } finally {
      set({ loading: false });
    }
  },

  removeCoupon: () => {
    set({ coupon: null, isCouponApplied: false });
    get().calculateTotals();
    toast.success("Coupon removed.");
  },

  getCartItems: async () => {
    set({ loading: true });
    try {
      const response = await axios.get("/cart");
      set({ cart: response.data.cart, loading: false });
      get().calculateTotals();
    } catch {
      toast.error("Failed to fetch cart items.");
      set({ loading: false });
    }
  },

  clearCart: async () => {
    set({ loading: true });
    try {
      set({
        cart: [],
        loading: false,
        total: 0,
        subtotal: 0,
        coupon: null,
        isCouponApplied: false,
      });
      toast.success("Cart cleared!");
    } catch {
      toast.error("Failed to clear cart.");
      set({ loading: false });
    }
  },

  addToCart: async (product) => {
    set({ loading: true });
    try {
      await axios.post("/cart", { productId: product._id });

      set((state) => {
        const existingItem = state.cart.find(
          (item) => item._id === product._id
        );

        if (existingItem) {
          return {
            cart: state.cart.map((item) =>
              item._id === product._id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
            loading: false,
          };
        }

        return {
          cart: [...state.cart, { ...product, quantity: 1 }],
          loading: false,
        };
      });

      get().calculateTotals();
      toast.success("Product added to cart!");
    } catch (error) {
      console.log(error);
      toast.error("Failed to add product to cart.");
      set({ loading: false });
    }
  },

  removeFromCart: async (productId) => {
    set({ loading: true });
    try {
      await axios.delete(`/cart`, { data: { productId } });
      set((state) => ({
        cart: state.cart.filter((item) => item._id !== productId),
        loading: false,
      }));
      get().calculateTotals();
      toast.success("Product removed from cart!");
    } catch {
      toast.error("Failed to remove product from cart.");
      set({ loading: false });
    }
  },

  updateQuantity: async (productId, quantity) => {
    if (quantity < 1) return get().removeFromCart(productId);
    set({ loading: true });
    try {
      await axios.put(`/cart/${productId}`, { quantity });
      set((state) => ({
        cart: state.cart.map((item) =>
          item._id === productId ? { ...item, quantity } : item
        ),
        loading: false,
      }));
      get().calculateTotals();
      toast.success("Product quantity updated!", { id: "updateQuantity" });
    } catch {
      toast.error("Failed to update product quantity.");
      set({ loading: false });
    }
  },

  calculateTotals: () => {
    const { cart, coupon } = get();
    let subtotal = cart.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    let total = subtotal;
    if (coupon) {
      total -= subtotal * (coupon.discountPercentage / 100);
    }
    set({ subtotal, total });
  },
}));
