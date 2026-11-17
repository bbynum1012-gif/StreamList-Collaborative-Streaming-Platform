import React, { useEffect, useMemo, useState } from 'react';
import products from './data.js';
import { GoogleLogin } from '@react-oauth/google';

const STORAGE_KEY = 'eztechmovie-cart-v1';

const isSubscription = (product) => product.id >= 1 && product.id <= 4;

const money = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

// Read the saved shopping cart.
function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (!Array.isArray(saved)) return [];

    const known = saved
      .filter((item) => products.some((product) => product.id === item.id))
      .map((item) => {
        const product = products.find((p) => p.id === item.id);

        const quantity = isSubscription(product)
          ? 1
          : Math.max(1, Number(item.quantity) || 1);

        return {
          id: product.id,
          quantity,
        };
      });

    const subscription = known.find((item) =>
      isSubscription(products.find((p) => p.id === item.id))
    );

    return known.filter(
      (item) =>
        !isSubscription(products.find((p) => p.id === item.id)) ||
        item === subscription
    );
  } catch {
    return [];
  }
}

// Decode Google's ID token for display purposes.
// A backend must verify the token before granting
// production access to protected services.
function getGoogleUser(credential) {
  const payload = credential.split('.')[1];

  if (!payload) {
    throw new Error('Invalid Google credential.');
  }

  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

  const decoded = decodeURIComponent(
    atob(base64)
      .split('')
      .map(
        (character) =>
          '%' + ('00' + character.charCodeAt(0).toString(16)).slice(-2)
      )
      .join('')
  );

  const data = JSON.parse(decoded);

  if (!data.email || !data.sub) {
    throw new Error('Google account information is missing.');
  }

  return {
    id: data.sub,
    name: data.name || 'StreamList User',
    email: data.email,
    picture: data.picture || '',
  };
}

function CreditCardCheckout({ total, onBack }) {
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [message, setMessage] = useState('');

  function formatCardNumber(value) {
    return value
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function handleSubmit(event) {
    event.preventDefault();

    const digits = cardNumber.replace(/\s/g, '');

    if (digits.length !== 16) {
      setMessage('Enter a 16-digit test card number.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setMessage('Enter expiration as MM/YY.');
      return;
    }

    // Classroom demonstration only:
    // Never save full card numbers or CVVs in localStorage.
    const demoCard = {
      cardholder: cardName,
      lastFour: digits.slice(-4),
      expiration: expiry,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem('streamlist-demo-card', JSON.stringify(demoCard));

    setMessage(`Demo card ending in ${demoCard.lastFour} saved successfully!`);
  }

  return (
    <section className="cart-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SECURE CHECKOUT DEMO</p>
          <h2>Credit Card Management</h2>
          <p className="section-subtitle">
            Enter test payment information for your StreamList order.
          </p>
        </div>
      </div>

      <div className="order-summary">
        <h3>Order Total: {money(total)}</h3>

        <form onSubmit={handleSubmit} className="credit-card-form">
          <label htmlFor="cardName">Cardholder Name</label>
          <input
            id="cardName"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="Name on card"
            required
          />

          <label htmlFor="cardNumber">Card Number</label>
          <input
            id="cardNumber"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            maxLength={19}
            required
          />

          <label htmlFor="expiry">Expiration Date</label>
          <input
            id="expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            placeholder="MM/YY"
            maxLength={5}
            required
          />

          <p className="summary-note">
            Demonstration only. Use fictional test information. Full card
            numbers and security codes are not stored.
          </p>

          <button className="primary-button full-width" type="submit">
            Save Test Card
          </button>
        </form>

        {message && <p role="status">{message}</p>}

        <button className="nav-link" type="button" onClick={onBack}>
          Back to Cart
        </button>
      </div>
    </section>
  );
}

export default function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState('');

  // Shopping cart state
  const [cart, setCart] = useState(readSavedCart);
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [notice, setNotice] = useState('');

  // Save shopping cart whenever it changes.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Handle successful Google sign-in.
  function handleGoogleSuccess(credentialResponse) {
    try {
      if (!credentialResponse.credential) {
        throw new Error('Google did not return a credential.');
      }

      const loggedInUser = getGoogleUser(credentialResponse.credential);

      setUser(loggedInUser);
      setLoginError('');
    } catch (error) {
      console.error('Google sign-in error:', error);
      setLoginError('Unable to complete sign-in. Please try again.');
    }
  }

  // Handle logout.
  function handleLogout() {
    setUser(null);
    setLoginError('');
    setActiveTab('subscriptions');
    setNotice('');
  }

  // Prepare cart products.
  const cartProducts = useMemo(
    () =>
      cart.map((entry) => ({
        ...products.find((product) => product.id === entry.id),
        quantity: entry.quantity,
      })),
    [cart]
  );

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const total = cartProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const selectedSubscription = cart.some((item) =>
    isSubscription(products.find((product) => product.id === item.id))
  );

  // Add products to the cart.
  function addToCart(product) {
    if (isSubscription(product) && selectedSubscription) {
      setNotice(
        'You can only add one subscription at a time. Remove your current subscription before choosing another.'
      );
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        if (isSubscription(product)) return current;

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...current,
        {
          id: product.id,
          quantity: 1,
        },
      ];
    });

    setNotice(`${product.service} added to your cart.`);
  }

  // Update accessory quantities.
  function updateQuantity(id, nextQuantity) {
    const product = products.find((item) => item.id === id);

    if (!product || isSubscription(product)) return;

    const quantity = Math.max(1, Math.floor(Number(nextQuantity) || 1));

    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity } : item))
    );

    setNotice('');
  }

  // Remove products from the cart.
  function removeFromCart(id) {
    const product = products.find((item) => item.id === id);

    setCart((current) => current.filter((item) => item.id !== id));

    setNotice(`${product?.service || 'Item'} removed from your cart.`);
  }

  function clearNotice() {
    setNotice('');
  }

  const visibleProducts = products.filter((product) =>
    activeTab === 'subscriptions'
      ? isSubscription(product)
      : !isSubscription(product)
  );

  // All hooks are called before this conditional.
  // This keeps the hook order consistent between renders.
  if (!user) {
    return (
      <div className="app-shell login-screen">
        <div className="login-card">
          <div className="brand-mark">EZ</div>

          <h1>Welcome to StreamList</h1>

          <p>Sign in with Google to explore your movie experience.</p>

          {loginError && (
            <p className="notice warning" role="alert">
              {loginError}
            </p>
          )}

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setLoginError('Google sign-in failed. Please try again.')
            }
          />

          <p className="login-footer">Your movie experience starts here.</p>
        </div>
      </div>
    );
  }

  // Main StreamList application.
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#home"
          onClick={() => setActiveTab('subscriptions')}
        >
          <span className="brand-mark">EZ</span>

          <span>
            EZTechMovie
            <small>YOUR MOVIE EXPERIENCE</small>
          </span>
        </a>

        <nav aria-label="Main navigation">
          <button
            className={
              activeTab === 'subscriptions' ? 'nav-link active' : 'nav-link'
            }
            onClick={() => {
              setActiveTab('subscriptions');
              clearNotice();
            }}
          >
            Subscriptions
          </button>

          <button
            className={
              activeTab === 'accessories' ? 'nav-link active' : 'nav-link'
            }
            onClick={() => {
              setActiveTab('accessories');
              clearNotice();
            }}
          >
            Accessories
          </button>

          <button
            className="cart-nav"
            onClick={() => {
              setActiveTab('cart');
              clearNotice();
            }}
          >
            🛒 Cart <b>{itemCount}</b>
          </button>
        </nav>

        <div className="user-menu">
          {user.picture && (
            <img
              src={user.picture}
              alt="User profile"
              width="32"
              height="32"
              style={{ borderRadius: '50%' }}
            />
          )}

          <span>{user.name}</span>

          <button className="nav-link" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">DISCOVER • SUBSCRIBE • ENJOY</p>

            <h1>
              Make movie night
              <br />
              <span>your kind of night.</span>
            </h1>

            <p>
              Choose a subscription and grab your EZTech accessories in one easy
              place.
            </p>

            <button
              className="primary-button"
              onClick={() => {
                setActiveTab('subscriptions');
                clearNotice();
              }}
            >
              Explore subscriptions
            </button>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="screen-card">
              <span>▶</span>
              <strong>
                YOUR NEXT
                <br />
                FAVORITE
              </strong>
              <small>STARTS HERE</small>
            </div>

            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
          </div>
        </section>

        {notice && (
          <div
            className={
              notice.startsWith('You can only') ? 'notice warning' : 'notice'
            }
            role="status"
          >
            <span>{notice}</span>

            <button aria-label="Dismiss message" onClick={clearNotice}>
              ×
            </button>
          </div>
        )}

        {activeTab === 'payment' ? (
          <CreditCardCheckout
            total={total}
            onBack={() => setActiveTab('cart')}
          />
        ) : activeTab !== 'cart' ? (
          <section className="catalog">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {activeTab === 'subscriptions'
                    ? 'PICK YOUR PLAN'
                    : 'SHOW YOUR EZTECH STYLE'}
                </p>

                <h2>
                  {activeTab === 'subscriptions'
                    ? 'Subscriptions'
                    : 'EZTech Accessories'}
                </h2>

                <p className="section-subtitle">
                  {activeTab === 'subscriptions'
                    ? 'Choose one plan that fits the way you watch and share.'
                    : 'Add as many accessories as you like. Quantities can be changed in your cart.'}
                </p>
              </div>

              <span className="item-count">{visibleProducts.length} items</span>
            </div>

            {activeTab === 'subscriptions' && (
              <p className="rule-note">
                One subscription per cart. You can change plans by removing your
                current subscription first.
              </p>
            )}

            <div className="product-grid">
              {visibleProducts.map((product) => {
                const inCart = cart.some((item) => item.id === product.id);

                const subscriptionBlocked =
                  isSubscription(product) && selectedSubscription && !inCart;

                return (
                  <article className="product-card" key={product.id}>
                    <div className="product-image">
                      <img
                        src={product.img}
                        alt={product.service}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />

                      {isSubscription(product) && (
                        <span className="product-tag">PLAN</span>
                      )}
                    </div>

                    <div className="product-info">
                      <h3>{product.service}</h3>
                      <p>{product.serviceInfo}</p>

                      <div className="product-bottom">
                        <strong>{money(product.price)}</strong>

                        <button
                          className="add-button"
                          disabled={subscriptionBlocked || inCart}
                          onClick={() => addToCart(product)}
                        >
                          {inCart
                            ? 'Added ✓'
                            : subscriptionBlocked
                            ? 'One plan only'
                            : 'Add to cart'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="cart-page">
            <div className="section-heading">
              <div>
                <p className="eyebrow">READY WHEN YOU ARE</p>

                <h2>Your Cart</h2>

                <p className="section-subtitle">
                  Review your items and make any changes before checkout.
                </p>
              </div>

              <span className="item-count">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            {cartProducts.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-icon">🛒</div>

                <h3>Your cart is waiting</h3>

                <p>Add a subscription or an EZTech accessory to get started.</p>

                <button
                  className="primary-button"
                  onClick={() => setActiveTab('subscriptions')}
                >
                  Browse products
                </button>
              </div>
            ) : (
              <div className="cart-layout">
                <div className="cart-list">
                  {cartProducts.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <div className="cart-thumb">
                        <img
                          src={item.img}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="cart-description">
                        <h3>{item.service}</h3>

                        <p>{money(item.price)} each</p>

                        {isSubscription(item) && (
                          <span className="fixed-quantity">
                            Subscription · quantity fixed at 1
                          </span>
                        )}
                      </div>

                      <div className="quantity-control">
                        <label htmlFor={`qty-${item.id}`}>Qty</label>

                        {isSubscription(item) ? (
                          <span className="quantity-fixed">1</span>
                        ) : (
                          <input
                            id={`qty-${item.id}`}
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateQuantity(item.id, event.target.value)
                            }
                          />
                        )}
                      </div>

                      <strong className="line-total">
                        {money(item.price * item.quantity)}
                      </strong>

                      <button
                        className="remove-button"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>

                <aside className="order-summary">
                  <h3>Order Summary</h3>

                  <div>
                    <span>Items ({itemCount})</span>
                    <strong>{money(total)}</strong>
                  </div>

                  <div className="summary-total">
                    <span>Total</span>
                    <strong>{money(total)}</strong>
                  </div>

                  <p className="summary-note">
                    Your cart is saved in this browser using local storage.
                  </p>

                  <button
                    className="primary-button full-width"
                    onClick={() => setActiveTab('payment')}
                  >
                    Checkout
                  </button>
                </aside>
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <span>© 2026 EZTechMovie</span>
        <span>Find your next favorite.</span>
      </footer>
    </div>
  );
}
