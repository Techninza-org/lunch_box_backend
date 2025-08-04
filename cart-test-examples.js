// Cart API Test Examples
// These are sample requests you can use to test the cart functionality

// 1. Add a SINGLE meal to cart
const addSingleMealToCart = {
  method: "POST",
  url: "/api/users/cart/add",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: {
    mealId: 1,
    quantity: 2,
    deliveryDate: "2025-08-05T12:00:00Z",
  },
};

// 2. Add a CUSTOMIZABLE meal to cart with options
const addCustomizableMealToCart = {
  method: "POST",
  url: "/api/users/cart/add",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: {
    mealId: 2,
    quantity: 1,
    deliveryDate: "2025-08-05T13:00:00Z",
    selectedOptions: [
      {
        optionId: 5, // Tandoori Roti
        quantity: 2,
      },
      {
        optionId: 8, // Extra Dal
        quantity: 1,
      },
      {
        optionId: 12, // Gulab Jamun
        quantity: 1,
      },
    ],
  },
};

// 3. Get cart items
const getCartItems = {
  method: "GET",
  url: "/api/users/cart",
  headers: {
    Authorization: "Bearer your-jwt-token",
  },
};

// 4. Get cart summary
const getCartSummary = {
  method: "GET",
  url: "/api/users/cart/summary",
  headers: {
    Authorization: "Bearer your-jwt-token",
  },
};

// 5. Update cart item quantity
const updateCartItem = {
  method: "PATCH",
  url: "/api/users/cart/1", // cartItemId = 1
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-jwt-token",
  },
  body: {
    quantity: 3,
    deliveryDate: "2025-08-06T12:00:00Z",
  },
};

// 6. Remove specific item from cart
const removeCartItem = {
  method: "DELETE",
  url: "/api/users/cart/1", // cartItemId = 1
  headers: {
    Authorization: "Bearer your-jwt-token",
  },
};

// 7. Clear entire cart
const clearCart = {
  method: "DELETE",
  url: "/api/users/cart/clear",
  headers: {
    Authorization: "Bearer your-jwt-token",
  },
};

// Example using fetch API in JavaScript
async function testCartAPIs() {
  const baseUrl = "http://localhost:3000"; // Replace with your server URL
  const token = "your-jwt-token"; // Replace with actual JWT token

  try {
    // 1. Add single meal to cart
    console.log("1. Adding single meal to cart...");
    const addResponse = await fetch(`${baseUrl}/api/users/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mealId: 1,
        quantity: 2,
      }),
    });
    const addResult = await addResponse.json();
    console.log("Add Result:", addResult);

    // 2. Get cart items
    console.log("2. Getting cart items...");
    const getResponse = await fetch(`${baseUrl}/api/users/cart`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const getResult = await getResponse.json();
    console.log("Cart Items:", getResult);

    // 3. Get cart summary
    console.log("3. Getting cart summary...");
    const summaryResponse = await fetch(`${baseUrl}/api/users/cart/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const summaryResult = await summaryResponse.json();
    console.log("Cart Summary:", summaryResult);
  } catch (error) {
    console.error("Error testing cart APIs:", error);
  }
}

// Call the test function
// testCartAPIs();

export {
  addSingleMealToCart,
  addCustomizableMealToCart,
  getCartItems,
  getCartSummary,
  updateCartItem,
  removeCartItem,
  clearCart,
  testCartAPIs,
};
