# EZTechMovie React Shopping Cart

A Vite + React implementation of the Week 3 EZTechMovie cart assignment.

## Requirements included
- Subscription and Accessories navigation, plus a cart item-count badge.
- Products loaded from the supplied `src/data.js`.
- Only one subscription can be in the cart at a time; an explanatory warning appears if another is attempted.
- Multiple accessory products and quantities are supported.
- Cart summary, quantity updates, item removal, and total price.
- Cart persists in browser local storage after refresh.
- Responsive CSS styling.

## Run the application
1. Install Node.js (LTS) if it is not already installed.
2. Extract this ZIP file.
3. Open the extracted `EZTechMovie_Cart_App` folder in Visual Studio Code.
4. Open Terminal > New Terminal and run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local address printed in the terminal (usually `http://localhost:5173`).

## Quick test checklist
- Add Basic Subscription, then try to add Gold Subscription. The warning should appear and the second plan should not be added.
- Remove the first subscription, then add a different plan.
- Add two or more accessories, including multiple quantities of the same accessory.
- Open Cart and change an accessory quantity; verify the line total, cart count, and order total update.
- Remove an item and refresh the page; remaining cart items should persist.

Note: The supplied `Data.js` image links are external URLs, so product images require an internet connection. Checkout/payment processing is not included because it is not part of the listed requirements.
