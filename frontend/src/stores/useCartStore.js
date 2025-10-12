import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  loading: false,
  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,

  getCartItems: async () => {
    set({ loading: true });
    try {
      const response = await axios.get("/cart");
      set({ cart: response.data, loading: false });
      get().calculateTotals();
    } catch {
      toast.error("Failed to fetch cart items.");
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
