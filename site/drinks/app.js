/* ============ Kellner-App – Logik (Vanilla JS, kein Backend) ============ */
(function () {
  "use strict";

  var DRINKS = window.DRINKS || [];
  var CATEGORIES = window.CATEGORIES || [];
  var CAT_LABEL = {};
  CATEGORIES.forEach(function (c) { CAT_LABEL[c.key] = c.label; });

  var TABLES = 12;              // Anzahl auswählbarer Tische
  var LS_KEY = "biwi_orders_v1"; // { table: { itemId__variantIdx: qty } }
  var LS_TABLE = "biwi_active_table_v1";

  // ---------- State ----------
  var state = {
    search: "",
    cat: "all",
    hh: false,
    table: parseInt(localStorage.getItem(LS_TABLE), 10) || 1,
    orders: loadOrders(),
  };

  function loadOrders() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveOrders() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state.orders)); } catch (e) {}
    try { localStorage.setItem(LS_TABLE, String(state.table)); } catch (e) {}
  }

  // ---------- Helpers ----------
  var DRINK_BY_ID = {};
  DRINKS.forEach(function (d) { DRINK_BY_ID[d.id] = d; });

  function fmt(n) { return n.toFixed(2).replace(".", ",") + " €"; }

  function norm(s) {
    return (s || "").toString().toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  // Effektivpreis einer Variante (Happy Hour berücksichtigt)
  function effPrice(drink, variant) {
    if (state.hh && drink.hh) return Math.round(variant.price * 50) / 100; // halber Preis
    return variant.price;
  }
  function isHhActive(drink) { return state.hh && !!drink.hh; }

  function cartKey(id, vi) { return id + "__" + vi; }

  function tableCart() {
    var t = String(state.table);
    if (!state.orders[t]) state.orders[t] = {};
    return state.orders[t];
  }
  function cartOf(tableNo) { return state.orders[String(tableNo)] || {}; }

  function cartCount(cart) {
    return Object.keys(cart).reduce(function (s, k) { return s + cart[k]; }, 0);
  }
  function cartTotal(cart) {
    var total = 0;
    Object.keys(cart).forEach(function (k) {
      var parts = k.split("__"); var d = DRINK_BY_ID[parts[0]];
      if (!d) return;
      var v = d.variants[parseInt(parts[1], 10)]; if (!v) return;
      total += effPrice(d, v) * cart[k];
    });
    return total;
  }
  function drinkQtyInTable(id) {
    var cart = tableCart(), q = 0;
    Object.keys(cart).forEach(function (k) { if (k.indexOf(id + "__") === 0) q += cart[k]; });
    return q;
  }

  // ---------- DOM refs ----------
  var $ = function (id) { return document.getElementById(id); };
  var listEl = $("list"), chipsEl = $("chips"), searchEl = $("search"),
      clearSearchEl = $("clearSearch"), hhToggle = $("hhToggle"),
      orderBar = $("orderBar"), scrim = $("scrim"), toastEl = $("toast");

  // ---------- Chips ----------
  function buildChips() {
    var counts = { all: DRINKS.length };
    DRINKS.forEach(function (d) { counts[d.cat] = (counts[d.cat] || 0) + 1; });

    var frag = document.createDocumentFragment();
    var all = [{ key: "all", label: "Alle" }].concat(CATEGORIES);
    all.forEach(function (c) {
      if (c.key !== "all" && !counts[c.key]) return;
      var b = document.createElement("button");
      b.className = "chip" + (state.cat === c.key ? " active" : "");
      b.setAttribute("role", "tab");
      b.dataset.cat = c.key;
      b.innerHTML = c.label + '<span class="chip-n">' + (counts[c.key] || 0) + "</span>";
      b.addEventListener("click", function () {
        state.cat = c.key;
        Array.prototype.forEach.call(chipsEl.children, function (ch) {
          ch.classList.toggle("active", ch.dataset.cat === c.key);
        });
        var active = chipsEl.querySelector(".chip.active");
        if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        render();
      });
      frag.appendChild(b);
    });
    chipsEl.innerHTML = "";
    chipsEl.appendChild(frag);
  }

  // ---------- Filter ----------
  function filtered() {
    var q = norm(state.search.trim());
    var terms = q ? q.split(/\s+/) : [];
    return DRINKS.filter(function (d) {
      if (state.cat !== "all" && d.cat !== state.cat) return false;
      if (!terms.length) return true;
      var hay = norm([d.name, d.ing, d.note, d.sub, CAT_LABEL[d.cat]].join(" "));
      return terms.every(function (t) { return hay.indexOf(t) !== -1; });
    });
  }

  // ---------- Render Liste ----------
  function priceHtml(drink) {
    var v = drink.variants[0];
    var hh = isHhActive(drink);
    var cls = "card-price" + (hh ? " hh-active" : "");
    var val = fmt(effPrice(drink, v));
    var prefix = drink.variants.length > 1 ? "ab " : "";
    if (hh) return '<span class="' + cls + '"><span class="strike">' + fmt(v.price) + "</span>" + prefix + val + "</span>";
    return '<span class="' + cls + '">' + prefix + val + "</span>";
  }

  function render() {
    var items = filtered();
    listEl.innerHTML = "";
    clearSearchEl.hidden = !state.search;

    if (!items.length) {
      listEl.innerHTML = '<div class="empty">Kein Getränk gefunden.<br>Andere Suche oder Kategorie probieren.</div>';
      updateOrderBar();
      return;
    }

    var frag = document.createDocumentFragment();
    var lastGroup = null;
    var grouping = state.cat === "all" && !state.search.trim();

    items.forEach(function (d) {
      if (grouping && d.cat !== lastGroup) {
        lastGroup = d.cat;
        var h = document.createElement("div");
        h.className = "group-head";
        h.textContent = CAT_LABEL[d.cat] || d.cat;
        frag.appendChild(h);
      }

      var qty = drinkQtyInTable(d.id);
      var badges = "";
      if (/alkoholfrei/i.test(d.note || "")) badges += '<span class="badge badge-af">0,0 %</span>';
      if (d.hh) badges += '<span class="badge badge-hh">Happy H.</span>';

      var card = document.createElement("button");
      card.className = "card";
      card.innerHTML =
        '<div class="card-main">' +
          '<div class="card-name">' + escapeHtml(d.name) + badges + "</div>" +
          (d.sub ? '<div class="card-ing">' + escapeHtml(d.sub) + (d.ing ? " · " + escapeHtml(d.ing) : "") + "</div>"
                 : (d.ing ? '<div class="card-ing">' + escapeHtml(d.ing) + "</div>" : "")) +
          (d.note && !/alkoholfrei/i.test(d.note) ? '<div class="card-note">' + escapeHtml(d.note) + "</div>" : "") +
        "</div>" +
        '<div class="card-right">' +
          priceHtml(d) +
          (d.variants.length > 1 ? '<span class="card-var">' + d.variants.length + " Größen</span>" : '<span class="card-var">' + escapeHtml(d.variants[0].label) + "</span>") +
        "</div>" +
        '<div style="position:relative"><span class="card-add">+</span>' +
          (qty ? '<span class="qty-flag">' + qty + "</span>" : "") +
        "</div>";
      card.addEventListener("click", function () { onAdd(d); });
      frag.appendChild(card);
    });

    listEl.appendChild(frag);
    updateOrderBar();
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---------- Hinzufügen ----------
  function onAdd(drink) {
    if (drink.variants.length === 1) {
      addToCart(drink, 0);
      flash(drink.name + " · Tisch " + state.table);
    } else {
      openVariantSheet(drink);
    }
  }

  function addToCart(drink, vi) {
    var cart = tableCart();
    var k = cartKey(drink.id, vi);
    cart[k] = (cart[k] || 0) + 1;
    saveOrders();
    render();
  }
  function setQty(tableNo, key, qty) {
    var cart = state.orders[String(tableNo)] || {};
    if (qty <= 0) delete cart[key]; else cart[key] = qty;
    state.orders[String(tableNo)] = cart;
    saveOrders();
  }

  // ---------- Order-Bar ----------
  function updateOrderBar() {
    var cart = tableCart();
    var count = cartCount(cart);
    $("obCount").textContent = count;
    $("obTable").textContent = state.table;
    $("obTotal").textContent = fmt(cartTotal(cart));
    orderBar.hidden = count === 0;
    $("tableNum").textContent = state.table;
  }

  // ---------- Sheets ----------
  var openSheetEl = null;
  function openSheet(el) {
    closeSheet();
    openSheetEl = el;
    scrim.hidden = false;
    el.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeSheet() {
    if (openSheetEl) openSheetEl.hidden = true;
    openSheetEl = null;
    scrim.hidden = true;
    document.body.style.overflow = "";
  }

  // Varianten-Sheet
  function openVariantSheet(drink) {
    $("variantName").textContent = drink.name;
    var wrap = $("variantList");
    wrap.innerHTML = "";
    drink.variants.forEach(function (v, i) {
      var hh = isHhActive(drink);
      var row = document.createElement("button");
      row.className = "variant-row";
      var priceInner = hh
        ? '<span class="strike">' + fmt(v.price) + "</span><b>" + fmt(effPrice(drink, v)) + "</b>"
        : "<b>" + fmt(v.price) + "</b>";
      row.innerHTML = "<span>" + escapeHtml(v.label) + '</span><span class="v-price' + (hh ? " hh-active" : "") + '">' + priceInner + "</span>";
      row.addEventListener("click", function () {
        addToCart(drink, i);
        closeSheet();
        flash(drink.name + " · " + v.label + " · Tisch " + state.table);
      });
      wrap.appendChild(row);
    });
    openSheet($("variantSheet"));
  }

  // Warenkorb-Sheet
  function openCart() {
    renderCart();
    openSheet($("cartSheet"));
  }
  function renderCart() {
    var cart = tableCart();
    $("cartTable").textContent = state.table;
    var wrap = $("cartItems");
    wrap.innerHTML = "";
    var keys = Object.keys(cart);

    if (!keys.length) {
      wrap.innerHTML = '<div class="cart-empty">Noch nichts bestellt.<br>Getränk antippen zum Hinzufügen.</div>';
      $("cartTotal").textContent = fmt(0);
      updateOrderBar();
      return;
    }

    keys.forEach(function (k) {
      var parts = k.split("__"); var d = DRINK_BY_ID[parts[0]];
      if (!d) return;
      var vi = parseInt(parts[1], 10); var v = d.variants[vi]; if (!v) return;
      var qty = cart[k]; var hh = isHhActive(d);
      var line = effPrice(d, v) * qty;

      var row = document.createElement("div");
      row.className = "cart-row";
      var subPrice = hh
        ? '<span class="hh-active">' + fmt(effPrice(d, v)) + "</span> statt " + fmt(v.price)
        : fmt(v.price);
      row.innerHTML =
        '<div class="cart-row-main">' +
          '<div class="cart-row-name">' + escapeHtml(d.name) + "</div>" +
          '<div class="cart-row-sub">' + escapeHtml(v.label) + " · " + subPrice + "</div>" +
        "</div>" +
        '<div class="stepper">' +
          '<button data-act="dec" aria-label="weniger">−</button>' +
          "<span>" + qty + "</span>" +
          '<button data-act="inc" aria-label="mehr">+</button>' +
        "</div>" +
        '<div class="cart-row-price">' + fmt(line) + "</div>";

      row.querySelector('[data-act="dec"]').addEventListener("click", function () {
        setQty(state.table, k, qty - 1); renderCart(); render();
      });
      row.querySelector('[data-act="inc"]').addEventListener("click", function () {
        setQty(state.table, k, qty + 1); renderCart(); render();
      });
      wrap.appendChild(row);
    });

    $("cartTotal").textContent = fmt(cartTotal(cart));
    updateOrderBar();
  }

  // Tisch-Sheet
  function openTableSheet() {
    var grid = $("tableGrid");
    grid.innerHTML = "";
    for (var i = 1; i <= TABLES; i++) {
      (function (n) {
        var c = cartOf(n); var cnt = cartCount(c);
        var cell = document.createElement("button");
        cell.className = "table-cell" + (n === state.table ? " active" : "");
        cell.innerHTML = n + (cnt ? '<span class="tc-badge">' + cnt + " Art.</span>" : '<span class="tc-empty">frei</span>');
        cell.addEventListener("click", function () {
          state.table = n; saveOrders(); closeSheet();
          updateOrderBar(); render();
          flash("Tisch " + n + " aktiv");
        });
        grid.appendChild(cell);
      })(i);
    }
    openSheet($("tableSheet"));
  }

  // ---------- Bestellung absenden (Mock) ----------
  function sendOrder() {
    var cart = tableCart();
    var count = cartCount(cart);
    if (!count) { flash("Bestellung ist leer"); return; }
    var total = cartTotal(cart);
    state.orders[String(state.table)] = {};
    saveOrders();
    closeSheet();
    render();
    flash("✓ Bestellung Tisch " + state.table + " aufgenommen · " + count + " Artikel · " + fmt(total));
  }

  // ---------- Toast ----------
  var toastTimer = null;
  function flash(msg) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.remove("hide");
    toastTimer = setTimeout(function () {
      toastEl.classList.add("hide");
      setTimeout(function () { toastEl.hidden = true; }, 250);
    }, 1600);
  }

  // ---------- Events ----------
  searchEl.addEventListener("input", function () { state.search = searchEl.value; render(); });
  clearSearchEl.addEventListener("click", function () {
    state.search = ""; searchEl.value = ""; searchEl.focus(); render();
  });
  hhToggle.addEventListener("change", function () {
    state.hh = hhToggle.checked; render();
    if (openSheetEl === $("cartSheet")) renderCart();
  });
  orderBar.addEventListener("click", openCart);
  $("tableBtn").addEventListener("click", openTableSheet);
  $("sendOrder").addEventListener("click", sendOrder);
  $("clearCart").addEventListener("click", function () {
    state.orders[String(state.table)] = {}; saveOrders(); renderCart(); render();
    flash("Tisch " + state.table + " geleert");
  });
  scrim.addEventListener("click", closeSheet);
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) {
    b.addEventListener("click", closeSheet);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  // ---------- Init ----------
  buildChips();
  render();
  updateOrderBar();
})();
