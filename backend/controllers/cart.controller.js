import Product from "../models/product.model.js";

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find((item) => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push(productId);
    }
    await user.save();

    res
      .status(200)
      .json({ message: "Product added to cart", cart: user.cartItems });
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart" });
  }
};

export const getCartProducts = async (req, res) => {
  try {
    const user = req.user;

    const products = await Product.find({
      _id: { $in: user.cartItems },
    });

    const cartItems = products.map((product) => {
      const item = user.cartItems.find((item) => item.id === product.id);
      return { ...product.toJSON(), quantity: item.quantity };
    });

    res.status(200).json({ cart: cartItems });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart products" });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    if (!productId) {
      user.cartItems = [];
    } else {
      user.cartItems = user.cartItems.filter((item) => item.id !== productId);
    }
    await user.save();

    res
      .status(200)
      .json({ message: "Products removed from cart", cart: user.cartItems });
  } catch (error) {
    res.status(500).json({ message: "Error removing products from cart" });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find((item) => item.id === id);

    if (!existingItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    if (!quantity || quantity < 0) {
      user.cartItems = user.cartItems.filter((item) => item.id !== id);
    } else {
      existingItem.quantity = quantity;
    }

    await user.save();

    res
      .status(200)
      .json({ message: "Cart item quantity updated", cart: user.cartItems });
  } catch (error) {
    res.status(500).json({ message: "Error updating cart item quantity" });
  }
};
