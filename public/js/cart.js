import { logout } from "./logout.js";
import { checkAuth, renderGreeting, showHideMenuItems } from "./authUI.js";
import { loadCart, removeItem, updateCartIcon } from "./cartService.js";

const dom = {
  checkoutBtn: document.getElementById("checkout-btn"),
  userMessage: document.getElementById("user-message"),
  cartList: document.getElementById("cart-list"),
  cartTotal: document.getElementById("cart-total"),
};

document.getElementById("logout-btn").addEventListener("click", logout);

dom.cartList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-btn");
  if (removeButton) {
    removeItem(removeButton.dataset.id, dom);
  }
});

dom.checkoutBtn.addEventListener("click", startCheckout);

async function startCheckout() {
  dom.checkoutBtn.disabled = true;
  dom.userMessage.textContent = "Connecting to the payment gateway...";

  try {
    const configResponse = await fetch("/api/checkout/config", {
      credentials: "include",
    });
    const config = await configResponse.json();

    if (!configResponse.ok) {
      throw new Error(config.error || "Payment configuration is unavailable.");
    }

    await loadMidtrans(config);

    const paymentResponse = await fetch("/api/checkout", {
      method: "POST",
      credentials: "include",
    });
    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      throw new Error(payment.error || "Could not start the payment.");
    }

    await loadCart(dom);
    await updateCartIcon();
    dom.userMessage.textContent =
      `Order ${payment.orderId} — total Rp${payment.amountIdr.toLocaleString("id-ID")}. ` +
      "Your cart is now empty. Complete payment in the secure Midtrans window.";

    window.snap.pay(payment.token, {
      onSuccess: () => confirmPayment(payment.orderId),
      onPending: () => {
        dom.userMessage.textContent =
          "Payment is pending. Your cart is empty; checking the order status with Midtrans.";
        void confirmPayment(payment.orderId);
      },
      onError: () => {
        dom.userMessage.textContent =
          "The payment could not be completed. Checking the final status with Midtrans.";
        void confirmPayment(payment.orderId);
      },
      onClose: () => {
        dom.userMessage.textContent =
          "Payment window closed. Checking the order status with Midtrans.";
        void confirmPayment(payment.orderId);
      },
    });
  } catch (err) {
    console.error("Checkout error:", err);
    dom.userMessage.textContent = err.message;
    dom.checkoutBtn.disabled = false;
  }
}

async function confirmPayment(orderId) {
  dom.userMessage.textContent =
    "Payment submitted. Waiting for Midtrans confirmation...";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await fetch(
        `/api/checkout/${encodeURIComponent(orderId)}`,
        { credentials: "include" },
      );
      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || "Could not confirm payment status.");
      }

      if (order.status === "paid") {
        dom.userMessage.textContent =
          "Payment confirmed. Thank you for your order!";
        await loadCart(dom);
        await updateCartIcon();
        return;
      }

      if (order.status === "expired") {
        dom.userMessage.textContent =
          "Payment expired. This order can no longer be paid.";
        return;
      }

      if (order.status === "failed") {
        dom.userMessage.textContent =
          "Payment failed. This order can no longer be paid.";
        return;
      }
    } catch (err) {
      console.error("Payment confirmation error:", err);
      dom.userMessage.textContent = err.message;
      await loadCart(dom);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  dom.userMessage.textContent =
    "Payment is still being confirmed. Your cart is empty; Midtrans will update the order status when confirmed.";
}

function loadMidtrans({ clientKey, isProduction }) {
  if (window.snap) {
    return Promise.resolve();
  }

  const script = document.getElementById("midtrans-snap");
  script.dataset.clientKey = clientKey;

  return new Promise((resolve, reject) => {
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Could not load the Midtrans payment form.")),
      { once: true },
    );
    script.src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
  });
}

async function init() {
  loadCart(dom);
  const name = await checkAuth();
  renderGreeting(name);
  showHideMenuItems(name);
}

init();
