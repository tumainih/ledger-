/* =========================================================
   DUKA LEDGER — static (Netlify-ready) version
   Mathayo 6:33
   Data is stored in the browser's localStorage, so it lives
   per-device / per-browser (no server database).
========================================================= */

const STORAGE_ITEMS = "duka_items_v1";
const STORAGE_ENTRIES = "duka_entries_v1";
const PAYMENT_LABEL = "Malipo";

const DEFAULT_ITEMS = [
  ["Mkate", 1000], ["Soda", 600], ["Karanga", 500], ["Mandazi", 500],
  ["Tambi", 500], ["Sukari", 900], ["Chai", 500], ["Maji", 600],
  ["Mayai", 200], ["Maziwa", 2000], ["Uji", 700], ["Biskuti", 2000],
  ["Michele", 1250], ["Keki", 1200], ["Embe", 600], ["Cola", 500],
  ["Pepsi", 1200], ["Vocha", 1000], ["Sms", 500], ["Unga", 1200],
  ["Viungo", 1000],
];

// getDay(): 0 = Sunday ... 6 = Saturday
const SWAHILI_DAYS = [
  "Jumapili", "Jumatatu", "Jumanne", "Jumatano",
  "Alhamisi", "Ijumaa", "Jumamosi",
];

// in-memory cart (mirrors Streamlit's session_state.cart — resets on reload)
let cart = [];

// =========================================================
// STORAGE HELPERS
// =========================================================

function loadItems() {
  const raw = localStorage.getItem(STORAGE_ITEMS);
  if (!raw) {
    const initial = DEFAULT_ITEMS.map(([name, price]) => ({ item_name: name, unit_price: price }));
    localStorage.setItem(STORAGE_ITEMS, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

function saveItems(items) {
  localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
}

function getItemsSorted() {
  return loadItems().slice().sort((a, b) =>
    a.item_name.localeCompare(b.item_name, "sw", { sensitivity: "base" })
  );
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_ENTRIES);
  return raw ? JSON.parse(raw) : [];
}

function saveEntriesToStorage(entries) {
  localStorage.setItem(STORAGE_ENTRIES, JSON.stringify(entries));
}

function nextEntryId(entries) {
  return entries.length ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
}

function saveEntries(rows, entryType) {
  const entries = loadEntries();
  const ts = new Date().toISOString();
  let id = nextEntryId(entries);

  rows.forEach((r) => {
    entries.push({
      id: id++,
      ts,
      entry_type: entryType,
      item_name: r.item_name,
      qty: Number(r.qty),
      unit_price: Number(r.unit_price),
      line_cost: Number(r.line_cost),
    });
  });

  saveEntriesToStorage(entries);
}

function getAllEntriesWithRunningSum() {
  const entries = loadEntries()
    .slice()
    .sort((a, b) => new Date(a.ts) - new Date(b.ts) || a.id - b.id);

  let running = 0;
  return entries.map((e) => {
    const signed = e.entry_type === "item" ? e.line_cost : -e.line_cost;
    running += signed;
    return { ...e, signed, grand_sum: running, ts_dt: new Date(e.ts) };
  });
}

function currentGrandSum() {
  const all = getAllEntriesWithRunningSum();
  return all.length ? all[all.length - 1].grand_sum : 0;
}

// =========================================================
// FORMAT HELPERS
// =========================================================

function fmtTzs(value) {
  return Math.round(Number(value)).toLocaleString("en-US");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Real current time, with Swahili day name — used at the moment
// every card is generated.
function fmtDt(date) {
  const dayName = SWAHILI_DAYS[date.getDay()];
  const d = pad2(date.getDate());
  const m = pad2(date.getMonth() + 1);
  const y = date.getFullYear();
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${dayName}, ${d}/${m}/${y} ${hh}:${mm}`;
}

// =========================================================
// CARD BUILDERS (decorated, real-time stamped)
// =========================================================

function buildOrderCard(rows, subtotal, newGrandSum) {
  const ts = new Date(); // real time at the moment of card creation
  const lines = [];

  lines.push("🧾════════════════════🧾");
  lines.push("   D U K A   L E D G E R");
  lines.push("🧾════════════════════🧾");
  lines.push(`📅  ${fmtDt(ts)}`);
  lines.push("────────────────────────");

  rows.forEach((row) => {
    const qty = Number(row.qty);
    let label;
    if (qty === 1) {
      label = row.item_name;
    } else {
      const qtyLabel = Number.isInteger(qty) ? String(qty) : String(qty);
      label = `${row.item_name} x${qtyLabel}`;
    }
    lines.push(`  🔸 ${label.padEnd(22)} TSh ${fmtTzs(row.line_cost)}`);
  });

  lines.push("────────────────────────");
  lines.push(`💰 Jumla:      TSh ${fmtTzs(subtotal)}`);
  lines.push(`📊 Jumla Kuu:  TSh ${fmtTzs(newGrandSum)}`);
  lines.push("════════════════════════");
  lines.push("   Asante kwa ununuzi! 🙏");
  lines.push("════════════════════════");

  return lines.join("\n");
}

function buildPaymentCard(amount, newGrandSum) {
  const ts = new Date();
  return [
    "💵════════════════════💵",
    "     M A L I P O",
    "💵════════════════════💵",
    `📅  ${fmtDt(ts)}`,
    "────────────────────────",
    `✅ ${PAYMENT_LABEL}:     TSh ${fmtTzs(amount)}`,
    "────────────────────────",
    `📊 Jumla Kuu:  TSh ${fmtTzs(newGrandSum)}`,
    "════════════════════════",
    "   Mungu akubariki! 🙏",
    "════════════════════════",
  ].join("\n");
}

function buildQueryCard(rows, title = "Matokeo ya Utafutaji") {
  const ts = new Date();
  const lines = [];

  lines.push("🔍════════════════════🔍");
  lines.push(`   ${title}`);
  lines.push("🔍════════════════════🔍");
  lines.push(`📅  ${fmtDt(ts)}`);
  lines.push("────────────────────────");

  rows.forEach((row) => {
    lines.push(
      `  🔸 ${row.item_name} — TSh ${fmtTzs(row.line_cost)} (${fmtDt(row.ts_dt)})`
    );
  });

  const total = rows.reduce((sum, r) => sum + Number(r.line_cost), 0);
  lines.push("────────────────────────");
  lines.push(`💰 Jumla:  TSh ${fmtTzs(total)}`);
  lines.push("════════════════════════");

  return lines.join("\n");
}

// =========================================================
// TOAST
// =========================================================

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// =========================================================
// RENDER: METRICS
// =========================================================

function renderMetrics() {
  const gs = currentGrandSum();
  const items = getItemsSorted();
  const entries = loadEntries();

  const gsPositive = gs > 0;

  document.getElementById("metric-gs").textContent = `TSh ${fmtTzs(gs)}`;
  document.getElementById("metric-gs").className =
    "metric-value " + (gsPositive ? "debt-positive" : "debt-clear");
  document.getElementById("accent-gs").className =
    "accent-bar " + (gsPositive ? "accent-rose" : "accent-emerald");
  document.getElementById("icon-gs-bg").className =
    "metric-icon " + (gsPositive ? "icon-rose" : "icon-emerald");
  document.getElementById("icon-gs-bg").textContent = gsPositive ? "🔴" : "🟢";

  document.getElementById("metric-items").textContent = items.length;
  document.getElementById("metric-entries").textContent = entries.length;
}

// =========================================================
// RENDER: TAB 1 — ITEM CHECKLIST / CART
// =========================================================

function renderItemChecklist(filterText = "") {
  const container = document.getElementById("item-checklist");
  const items = getItemsSorted();
  const filtered = items.filter((it) =>
    it.item_name.toLowerCase().includes(filterText.toLowerCase())
  );

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = '<div class="section-subtitle" style="margin:8px;">Hakuna bidhaa inayolingana.</div>';
    return;
  }

  filtered.forEach((it) => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" class="item-checkbox" value="${escapeHtml(it.item_name)}">
      <span>${escapeHtml(it.item_name)} — TSh ${fmtTzs(it.unit_price)}</span>
    `;
    container.appendChild(label);
  });
}

function getCheckedItemNames() {
  return Array.from(document.querySelectorAll(".item-checkbox:checked")).map(
    (cb) => cb.value
  );
}

function renderCart() {
  const cartSection = document.getElementById("cart-section");
  const emptyNote = document.getElementById("empty-cart-note");
  const rowsContainer = document.getElementById("cart-rows");

  if (cart.length === 0) {
    cartSection.style.display = "none";
    emptyNote.style.display = "block";
    return;
  }

  emptyNote.style.display = "none";
  cartSection.style.display = "block";
  rowsContainer.innerHTML = "";

  cart.forEach((row, i) => {
    const div = document.createElement("div");
    div.className = "cart-row";
    div.innerHTML = `
      <div class="item-name">${escapeHtml(row.item_name)}</div>
      <input type="number" min="0" step="1" value="${row.qty}" data-idx="${i}" data-field="qty">
      <input type="number" min="0" step="100" value="${row.unit_price}" data-idx="${i}" data-field="unit_price">
      <div class="line-cost">TSh ${fmtTzs(row.line_cost)}</div>
      <button class="cart-del-btn" data-idx="${i}" title="Futa">🗑️</button>
    `;
    rowsContainer.appendChild(div);
  });

  rowsContainer.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.idx);
      const field = e.target.dataset.field;
      const value = parseFloat(e.target.value) || 0;
      cart[idx][field] = value;
      cart[idx].line_cost = Number(cart[idx].qty) * Number(cart[idx].unit_price);
      renderCart();
    });
  });

  rowsContainer.querySelectorAll(".cart-del-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      cart.splice(idx, 1);
      renderCart();
    });
  });

  const subtotal = cart.reduce((sum, r) => sum + Number(r.line_cost), 0);
  const gs = currentGrandSum();
  const newGs = gs + subtotal;
  const newGsPositive = newGs > 0;

  document.getElementById("metric-subtotal").textContent = `TSh ${fmtTzs(subtotal)}`;
  document.getElementById("metric-newgs").textContent = `TSh ${fmtTzs(newGs)}`;
  document.getElementById("metric-newgs").className =
    "metric-value " + (newGsPositive ? "debt-positive" : "debt-clear");
  document.getElementById("accent-newgs").className =
    "accent-bar " + (newGsPositive ? "accent-rose" : "accent-emerald");
  document.getElementById("icon-newgs-bg").className =
    "metric-icon " + (newGsPositive ? "icon-rose" : "icon-emerald");
}

// =========================================================
// RENDER: TAB 2 — RECTIFICATION
// =========================================================

function renderRectificationSelects() {
  const items = getItemsSorted();

  const rectifySelect = document.getElementById("rectify-select");
  const deleteSelect = document.getElementById("delete-select");

  rectifySelect.innerHTML = items
    .map((it) => `<option value="${escapeHtml(it.item_name)}">${escapeHtml(it.item_name)}</option>`)
    .join("");

  deleteSelect.innerHTML =
    `<option value="">-- Chagua bidhaa --</option>` +
    items
      .map((it) => `<option value="${escapeHtml(it.item_name)}">${escapeHtml(it.item_name)}</option>`)
      .join("");

  fillRectifyFields();
}

function fillRectifyFields() {
  const items = getItemsSorted();
  const selectedName = document.getElementById("rectify-select").value;
  const selectedItem = items.find((it) => it.item_name === selectedName);

  if (selectedItem) {
    document.getElementById("rectify-name").value = selectedItem.item_name;
    document.getElementById("rectify-price").value = selectedItem.unit_price;
  }
}

function renderItemsTable() {
  const tbody = document.querySelector("#items-table tbody");
  const items = getItemsSorted();

  tbody.innerHTML = items
    .map(
      (it) => `
      <tr>
        <td>${escapeHtml(it.item_name)}</td>
        <td>TSh ${fmtTzs(it.unit_price)}</td>
      </tr>`
    )
    .join("");
}

// =========================================================
// RENDER: TAB 3 — SEARCH
// =========================================================

function renderSearchResults() {
  const dateFromVal = document.getElementById("q-from").value;
  const dateToVal = document.getElementById("q-to").value;
  const qItem = document.getElementById("q-item").value.trim().toLowerCase();
  const op = document.getElementById("q-op").value;
  const val = parseFloat(document.getElementById("q-val").value) || 0;

  let all = getAllEntriesWithRunningSum();

  if (dateFromVal) {
    const from = new Date(dateFromVal + "T00:00:00");
    all = all.filter((e) => e.ts_dt >= from);
  }
  if (dateToVal) {
    const to = new Date(dateToVal + "T23:59:59");
    all = all.filter((e) => e.ts_dt <= to);
  }
  if (qItem) {
    all = all.filter((e) => e.item_name.toLowerCase().includes(qItem));
  }
  if (op !== "any") {
    all = all.filter((e) => {
      const cost = e.line_cost;
      switch (op) {
        case "lt": return cost < val;
        case "gt": return cost > val;
        case "eq": return cost === val;
        case "lte": return cost <= val;
        case "gte": return cost >= val;
        default: return true;
      }
    });
  }

  const resultsContainer = document.getElementById("search-results");
  const cardSection = document.getElementById("search-card-section");

  if (all.length === 0) {
    resultsContainer.innerHTML = '<div class="info-note">Hakuna matokeo yanayolingana na utafutaji wako.</div>';
    cardSection.style.display = "none";
    return;
  }

  const total = all.reduce((sum, e) => sum + Number(e.line_cost), 0);

  const rowsHtml = all
    .map(
      (e) => `
      <tr>
        <td>${fmtDt(e.ts_dt)}</td>
        <td>${escapeHtml(e.item_name)}</td>
        <td>${e.qty}</td>
        <td>TSh ${fmtTzs(e.line_cost)}</td>
        <td>${e.entry_type === "item" ? "Bidhaa" : "Malipo"}</td>
      </tr>`
    )
    .join("");

  resultsContainer.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Tarehe</th><th>Bidhaa</th><th>Idadi</th><th>Gharama</th><th>Aina</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="success-note">
      <strong>Matokeo:</strong> ${all.length} rekodi &nbsp;•&nbsp;
      <strong>Jumla:</strong> TSh ${fmtTzs(total)}
    </div>
    <button id="btn-build-query-card" class="btn btn-secondary btn-block btn-lg">📋 Tengeneza Kadi ya Matokeo</button>
  `;

  document.getElementById("btn-build-query-card").addEventListener("click", () => {
    const card = buildQueryCard(all);
    document.getElementById("query-card-text").textContent = card;
    cardSection.style.display = "block";
  });
}

// =========================================================
// UTIL
// =========================================================

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// =========================================================
// EVENT WIRING
// =========================================================

function wireTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");

      if (btn.dataset.tab === "rectification") {
        renderRectificationSelects();
        renderItemsTable();
      }
      if (btn.dataset.tab === "tafuta") {
        renderSearchResults();
      }
    });
  });
}

function wireCopyButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-copy");
    if (!btn) return;
    const targetId = btn.dataset.copyTarget;
    const text = document.getElementById(targetId).textContent;
    navigator.clipboard.writeText(text).then(() => showToast("Kadi imenakiliwa! 📎"));
  });
}

function wireUjumbeTab() {
  const searchInput = document.getElementById("item-search");
  searchInput.addEventListener("input", () => renderItemChecklist(searchInput.value));

  document.getElementById("btn-add-all").addEventListener("click", () => {
    const checked = getCheckedItemNames();
    const warning = document.getElementById("pick-warning");

    if (checked.length === 0) {
      warning.style.display = "block";
      return;
    }
    warning.style.display = "none";

    const qty = parseFloat(document.getElementById("pick-qty").value) || 1;
    const items = getItemsSorted();

    checked.forEach((name) => {
      const item = items.find((it) => it.item_name === name);
      if (!item) return;
      cart.push({
        item_name: item.item_name,
        qty: qty,
        unit_price: item.unit_price,
        line_cost: qty * item.unit_price,
      });
    });

    document.querySelectorAll(".item-checkbox:checked").forEach((cb) => (cb.checked = false));
    renderCart();
  });

  document.getElementById("btn-save-order").addEventListener("click", () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, r) => sum + Number(r.line_cost), 0);
    const gs = currentGrandSum();
    const newGs = gs + subtotal;

    saveEntries(cart, "item");
    const card = buildOrderCard(cart, subtotal, newGs);

    document.getElementById("order-card-text").textContent = card;
    document.getElementById("order-card-section").style.display = "block";

    cart = [];
    renderCart();
    renderMetrics();
  });

  document.getElementById("btn-save-payment").addEventListener("click", () => {
    const amountInput = document.getElementById("pay-amount");
    const amount = parseFloat(amountInput.value) || 0;
    const warning = document.getElementById("pay-warning");

    if (amount <= 0) {
      warning.style.display = "block";
      return;
    }
    warning.style.display = "none";

    const gs = currentGrandSum();

    saveEntries(
      [{ item_name: PAYMENT_LABEL, qty: 1, unit_price: amount, line_cost: amount }],
      "payment"
    );

    const newGs = gs - amount;
    const card = buildPaymentCard(amount, newGs);

    document.getElementById("payment-card-text").textContent = card;
    document.getElementById("payment-card-text").style.display = "block";
    document.getElementById("btn-copy-payment").style.display = "inline-block";

    amountInput.value = 0;
    renderMetrics();
  });
}

function wireRectificationTab() {
  document.getElementById("rectify-select").addEventListener("change", fillRectifyFields);

  document.getElementById("btn-update-item").addEventListener("click", () => {
    const errorBox = document.getElementById("rectify-error");
    const successBox = document.getElementById("rectify-success");
    errorBox.style.display = "none";
    successBox.style.display = "none";

    const oldName = document.getElementById("rectify-select").value;
    const newName = document.getElementById("rectify-name").value.trim();
    const newPrice = parseFloat(document.getElementById("rectify-price").value);

    if (!oldName) return;

    if (!newName) {
      errorBox.textContent = "Jina la bidhaa haliwezi kuwa tupu.";
      errorBox.style.display = "block";
      return;
    }

    const items = loadItems();
    const existingNames = items.map((it) => it.item_name.trim().toLowerCase());

    if (newName.toLowerCase() !== oldName.toLowerCase() && existingNames.includes(newName.toLowerCase())) {
      errorBox.textContent = "Jina hilo tayari lipo. Chagua jina tofauti.";
      errorBox.style.display = "block";
      return;
    }

    // Update the item
    const idx = items.findIndex((it) => it.item_name === oldName);
    if (idx === -1) return;
    items[idx] = { item_name: newName, unit_price: newPrice };
    saveItems(items);

    // Keep historical records consistent when an item is renamed
    if (newName !== oldName) {
      const entries = loadEntries().map((e) =>
        e.item_name === oldName ? { ...e, item_name: newName } : e
      );
      saveEntriesToStorage(entries);
    }

    successBox.textContent = `Imesasishwa: ${newName} — TSh ${fmtTzs(newPrice)}`;
    successBox.style.display = "block";

    renderRectificationSelects();
    renderItemsTable();
    renderItemChecklist(document.getElementById("item-search").value);
    renderMetrics();
  });

  document.getElementById("btn-add-item").addEventListener("click", () => {
    const errorBox = document.getElementById("new-item-error");
    const successBox = document.getElementById("new-item-success");
    errorBox.style.display = "none";
    successBox.style.display = "none";

    const name = document.getElementById("new-item-name").value.trim();
    const price = parseFloat(document.getElementById("new-item-price").value);

    if (!name) {
      errorBox.textContent = "Andika jina la bidhaa.";
      errorBox.style.display = "block";
      return;
    }
    if (!price || price <= 0) {
      errorBox.textContent = "Weka bei zaidi ya sifuri.";
      errorBox.style.display = "block";
      return;
    }

    const items = loadItems();
    const existingNames = items.map((it) => it.item_name.trim().toLowerCase());

    if (existingNames.includes(name.toLowerCase())) {
      errorBox.textContent = "Bidhaa hiyo tayari ipo. Tumia sehemu ya 'Rekebisha Bidhaa Iliyopo'.";
      errorBox.style.display = "block";
      return;
    }

    items.push({ item_name: name, unit_price: price });
    saveItems(items);

    successBox.textContent = `Bidhaa mpya imeongezwa: ${name} — TSh ${fmtTzs(price)}`;
    successBox.style.display = "block";

    document.getElementById("new-item-name").value = "";
    document.getElementById("new-item-price").value = 0;

    renderRectificationSelects();
    renderItemsTable();
    renderItemChecklist(document.getElementById("item-search").value);
    renderMetrics();
  });

  document.getElementById("btn-delete-item").addEventListener("click", () => {
    const select = document.getElementById("delete-select");
    const successBox = document.getElementById("delete-success");
    const warningBox = document.getElementById("delete-warning");
    successBox.style.display = "none";
    warningBox.style.display = "none";

    const name = select.value;
    if (!name) {
      warningBox.style.display = "block";
      return;
    }

    const items = loadItems().filter((it) => it.item_name !== name);
    saveItems(items);

    successBox.textContent = `${name} imeondolewa.`;
    successBox.style.display = "block";

    renderRectificationSelects();
    renderItemsTable();
    renderItemChecklist(document.getElementById("item-search").value);
    renderMetrics();
  });
}

function wireSearchTab() {
  ["q-from", "q-to", "q-item", "q-op", "q-val"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderSearchResults);
    document.getElementById(id).addEventListener("change", renderSearchResults);
  });
}

// =========================================================
// STARTUP
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  loadItems(); // seeds default items on first run

  wireTabs();
  wireCopyButtons();
  wireUjumbeTab();
  wireRectificationTab();
  wireSearchTab();

  renderMetrics();
  renderItemChecklist();
  renderCart();
  renderRectificationSelects();
  renderItemsTable();
  renderSearchResults();

  registerServiceWorker();
});

// Registers the service worker so the app shell is cached for offline use.
// Service workers require http(s) (Netlify serves https), so this is a
// no-op — not an error — when the file is opened directly via file://.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}
