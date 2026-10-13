import { logout } from "./logout.js";
import { checkAuth, renderGreeting, showHideMenuItems } from "./authUI.js";

const dom = {
  list: document.getElementById("invoice-list"),
  message: document.getElementById("invoice-message"),
  notification: document.getElementById("invoice-notification"),
  detail: document.getElementById("invoice-detail"),
  content: document.getElementById("invoice-content"),
};

const terminalStatuses = new Set(["paid", "expired", "failed"]);
const knownStatuses = new Map();
let notificationTimeout;
let isRefreshing = false;

const statusLabels = {
  pending: "Pending payment",
  paid: "Paid",
  expired: "Expired",
  failed: "Failed",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

document.getElementById("logout-btn").addEventListener("click", logout);
dom.list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-invoice-id]");
  if (button) {
    showInvoice(button.dataset.invoiceId);
  }
});
document.getElementById("print-invoice").addEventListener("click", () => window.print());
document.getElementById("close-invoice").addEventListener("click", () => {
  dom.detail.hidden = true;
  dom.list.focus();
});

function formatDate(value) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : dateTime.format(date);
}

function statusLabel(status) {
  return statusLabels[status] || status;
}

function announceStatusChanges(invoices) {
  const changed = [];

  for (const invoice of invoices) {
    const previousStatus = knownStatuses.get(invoice.orderId);
    if (
      previousStatus &&
      previousStatus !== invoice.status &&
      terminalStatuses.has(invoice.status)
    ) {
      changed.push(`${invoice.orderId}: ${statusLabel(invoice.status)}.`);
    }
    knownStatuses.set(invoice.orderId, invoice.status);
  }

  if (changed.length > 0) {
    dom.notification.textContent = changed.join(" ");
    dom.notification.dataset.status = invoices.find((invoice) =>
      changed.some((message) => message.startsWith(`${invoice.orderId}:`)),
    )?.status || "paid";
    dom.notification.hidden = false;
    window.clearTimeout(notificationTimeout);
    notificationTimeout = window.setTimeout(() => {
      dom.notification.hidden = true;
    }, 10000);
  }
}

function renderInvoices(invoices, statusSyncFailed = false) {
  dom.list.replaceChildren();

  if (invoices.length === 0) {
    dom.message.textContent = statusSyncFailed
      ? "Could not verify payment status with Midtrans. Please try again."
      : "No invoices yet. Orders will appear here after checkout.";
    return;
  }

  dom.message.textContent = statusSyncFailed
    ? "Some pending payments could not be checked with Midtrans. Their shown status may be out of date."
    : "Order statuses refresh automatically while this page is open.";

  for (const invoice of invoices) {
    const item = document.createElement("li");
    item.className = "invoice-card";

    const summary = document.createElement("div");
    summary.className = "invoice-card-summary";

    const identity = document.createElement("div");
    const orderId = document.createElement("strong");
    orderId.textContent = invoice.orderId;
    const createdAt = document.createElement("span");
    createdAt.textContent = formatDate(invoice.createdAt);
    identity.append(orderId, createdAt);

    const status = document.createElement("span");
    status.className = `invoice-status invoice-status-${invoice.status}`;
    status.textContent = statusLabel(invoice.status);

    summary.append(identity, status);

    const amount = document.createElement("p");
    amount.className = "invoice-card-amount";
    amount.textContent = `${rupiah.format(invoice.amountIdr)} ? ${invoice.itemCount} item(s)`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "main-btn";
    button.dataset.invoiceId = invoice.orderId;
    button.textContent = "View invoice";

    item.append(summary, amount, button);
    dom.list.appendChild(item);
  }
}

async function refreshInvoices() {
  if (isRefreshing) {
    return;
  }
  isRefreshing = true;

  try {
    const response = await fetch("/api/invoices", { credentials: "include" });
    const data = await response.json();

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }
    if (!response.ok) {
      throw new Error(data.error || "Could not load invoices.");
    }

    const invoices = Array.isArray(data.invoices) ? data.invoices : [];
    let statusSyncFailed = false;

    for (const invoice of invoices) {
      if (!knownStatuses.has(invoice.orderId)) {
        knownStatuses.set(invoice.orderId, invoice.status);
      }
    }

    for (const invoice of invoices) {
      if (invoice.status !== "pending") {
        continue;
      }

      try {
        const statusResponse = await fetch(
          `/api/checkout/${encodeURIComponent(invoice.orderId)}`,
          { credentials: "include" },
        );
        const order = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(order.error || "Could not verify payment status.");
        }
        invoice.status = order.status;
      } catch (err) {
        console.error(`Payment status refresh failed for ${invoice.orderId}:`, err);
        statusSyncFailed = true;
      }
    }

    announceStatusChanges(invoices);
    renderInvoices(invoices, statusSyncFailed);
  } catch (err) {
    console.error("Refresh invoices error:", err);
    dom.message.textContent = err.message;
  } finally {
    isRefreshing = false;
  }
}

async function showInvoice(orderId) {
  try {
    const response = await fetch(`/api/invoices/${encodeURIComponent(orderId)}`, {
      credentials: "include",
    });
    const data = await response.json();

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }
    if (!response.ok) {
      throw new Error(data.error || "Could not load this invoice.");
    }

    renderInvoiceDetail(data.invoice);
    dom.detail.hidden = false;
    dom.detail.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error("Load invoice error:", err);
    dom.message.textContent = err.message;
  }
}

function renderInvoiceDetail(invoice) {
  const heading = document.createElement("h2");
  heading.id = "invoice-detail-title";
  heading.textContent = "Invoice";

  const metadata = document.createElement("dl");
  metadata.className = "invoice-metadata";
  addMetadata(metadata, "Invoice / order ID", invoice.orderId);
  addMetadata(metadata, "Date", formatDate(invoice.createdAt));
  addMetadata(metadata, "Payment status", statusLabel(invoice.status));

  const table = document.createElement("table");
  table.className = "invoice-items";
  table.innerHTML = `
    <thead><tr><th>Record</th><th>Qty</th><th>Unit price</th><th>Subtotal</th></tr></thead>
    <tbody></tbody>
  `;
  const body = table.querySelector("tbody");

  for (const item of invoice.items) {
    const row = document.createElement("tr");
    const product = document.createElement("td");
    product.textContent = `${item.title} ? ${item.artist}`;
    const quantity = document.createElement("td");
    quantity.textContent = String(item.quantity);
    const unitPrice = document.createElement("td");
    unitPrice.textContent = rupiah.format(item.unitPriceIdr);
    const subtotal = document.createElement("td");
    subtotal.textContent = rupiah.format(item.unitPriceIdr * item.quantity);
    row.append(product, quantity, unitPrice, subtotal);
    body.appendChild(row);
  }

  const total = document.createElement("p");
  total.className = "invoice-total";
  total.textContent = `Total: ${rupiah.format(invoice.amountIdr)} (${dollars.format(invoice.totalUsd)})`;

  dom.content.replaceChildren(heading, metadata, table, total);
}

function addMetadata(list, label, value) {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
}

async function init() {
  const name = await checkAuth();
  renderGreeting(name);
  showHideMenuItems(name);

  if (!name) {
    window.location.href = "/login.html";
    return;
  }

  await refreshInvoices();
  window.setInterval(() => refreshInvoices(), 10000);
}

init();
