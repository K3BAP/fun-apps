/* ============ Kniffel-Spielblock – Logik (Vanilla JS, kein Backend) ============ */
(function () {
  "use strict";

  var LS_KEY = "kniffel_v1";
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 8;
  var BONUS_THRESHOLD = 63;
  var BONUS_POINTS = 35;

  var FACE = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };
  var ACCENTS = ["#c9a15a", "#4a7a4d", "#b5533f", "#5b7fa6", "#8a6bb0", "#d98a2b", "#3f9e9e", "#a6708b"];

  var UPPER = [
    { key: "ones",   label: "Einser",  face: 1 },
    { key: "twos",   label: "Zweier",  face: 2 },
    { key: "threes", label: "Dreier",  face: 3 },
    { key: "fours",  label: "Vierer",  face: 4 },
    { key: "fives",  label: "Fünfer",  face: 5 },
    { key: "sixes",  label: "Sechser", face: 6 }
  ].map(function (c) { c.section = "upper"; c.hint = "Summe der " + c.label; return c; });

  var LOWER = [
    { key: "three",     label: "Dreierpasch",   hint: "Summe aller 5 Würfel", type: "sum" },
    { key: "four",      label: "Viererpasch",   hint: "Summe aller 5 Würfel", type: "sum" },
    { key: "fullhouse", label: "Full House",    hint: "25 Punkte",            type: "fixed", value: 25 },
    { key: "small",     label: "Kleine Straße", hint: "30 Punkte",       type: "fixed", value: 30 },
    { key: "large",     label: "Große Straße",  hint: "40 Punkte",  type: "fixed", value: 40 },
    { key: "kniffel",   label: "Kniffel",       hint: "50 Punkte",            type: "fixed", value: 50 },
    { key: "chance",    label: "Chance",        hint: "Summe aller 5 Würfel", type: "sum" }
  ].map(function (c) { c.section = "lower"; return c; });

  var CATS = UPPER.concat(LOWER);
  var TOTAL_FIELDS = CATS.length; // 13

  // ---------- State ----------
  var state = load();
  var _lastPhase = null;
  var _pid = 0;

  function blank() { return { phase: "setup", players: [], scores: {}, keepAwake: true }; }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && s.players && s.scores && s.phase) {
        if (typeof s.keepAwake !== "boolean") s.keepAwake = true;
        return s;
      }
    } catch (e) {}
    return blank();
  }
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
  function newId() { _pid++; return "p" + Date.now().toString(36) + _pid.toString(36); }

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function each(nodes, fn) { Array.prototype.slice.call(nodes).forEach(fn); }
  function escapeHtml(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function accentFor(idx) { return ACCENTS[idx % ACCENTS.length]; }

  // ---------- Scoring ----------
  function val(pid, key) {
    var s = state.scores[pid];
    if (!s) return null;
    var v = s[key];
    return (v === undefined || v === null) ? null : v;
  }
  function setVal(pid, key, v) {
    if (!state.scores[pid]) state.scores[pid] = {};
    if (v === null) delete state.scores[pid][key];
    else state.scores[pid][key] = v;
    save();
  }
  function sumOf(pid, cats) { var t = 0; cats.forEach(function (c) { var v = val(pid, c.key); if (v != null) t += v; }); return t; }
  function upperSum(pid)   { return sumOf(pid, UPPER); }
  function bonus(pid)      { return upperSum(pid) >= BONUS_THRESHOLD ? BONUS_POINTS : 0; }
  function upperTotal(pid) { return upperSum(pid) + bonus(pid); }
  function lowerSum(pid)   { return sumOf(pid, LOWER); }
  function grand(pid)      { return upperTotal(pid) + lowerSum(pid); }
  function filledCount(pid) { var n = 0; CATS.forEach(function (c) { if (val(pid, c.key) != null) n++; }); return n; }
  function totalFilled() { var n = 0; state.players.forEach(function (p) { n += filledCount(p.id); }); return n; }
  function minFilled() { var m = Infinity; state.players.forEach(function (p) { m = Math.min(m, filledCount(p.id)); }); return m === Infinity ? 0 : m; }
  function isComplete() { return state.players.length > 0 && state.players.every(function (p) { return filledCount(p.id) === TOTAL_FIELDS; }); }
  function activeIndex() {
    var best = -1, min = Infinity;
    state.players.forEach(function (p, i) { var f = filledCount(p.id); if (f < min) { min = f; best = i; } });
    return best;
  }

  // ---------- Bildschirm wachhalten (Screen Wake Lock API) ----------
  // Nur während des Spiels: der Block liegt oft minutenlang unberührt auf dem
  // Tisch, da soll sich das Display nicht abschalten. Das System gibt den Lock
  // von sich aus frei, sobald der Tab in den Hintergrund geht – deshalb wird er
  // bei visibilitychange neu angefordert. Umschaltbar über das ⋯-Menü.
  var wakeLock = null;
  function wakeSupported() { return typeof navigator !== "undefined" && "wakeLock" in navigator; }
  function wakeWanted() { return state.phase === "play" && state.keepAwake && wakeSupported(); }
  function updateWake() { if (wakeWanted()) requestWake(); else releaseWake(); }
  function requestWake() {
    if (wakeLock || document.visibilityState !== "visible") return;
    navigator.wakeLock.request("screen").then(function (lock) {
      if (!wakeWanted()) { lock.release(); return; }   // Phase hat inzwischen gewechselt
      wakeLock = lock;
      lock.addEventListener("release", function () { if (wakeLock === lock) wakeLock = null; });
    }).catch(function () { /* z. B. Energiesparmodus – kein Grund für eine Fehlermeldung */ });
  }
  function releaseWake() {
    if (!wakeLock) return;
    var lock = wakeLock; wakeLock = null;
    try { lock.release(); } catch (e) {}
  }
  // Der Menüpunkt steht statisch im HTML – Beschriftung beim Öffnen nachziehen.
  function syncWakeItem() {
    var item = $("menuWake");
    if (!item) return;
    var ok = wakeSupported();
    item.textContent = (ok && state.keepAwake ? "✓ " : "○ ") + "Bildschirm anlassen" +
                       (ok ? "" : " · nicht unterstützt");
    item.disabled = !ok;
  }

  // ---------- Sheets ----------
  var scrim, openSheetEl = null;
  function openSheet(s) { if (openSheetEl) openSheetEl.hidden = true; openSheetEl = s; s.hidden = false; scrim.hidden = false; }
  function closeSheet() { if (openSheetEl) openSheetEl.hidden = true; openSheetEl = null; scrim.hidden = true; }

  // ==================================================================
  //  SETUP
  // ==================================================================
  function renderSetup() {
    var v = $("view-setup");
    v.innerHTML = "";

    var head = el("header", "k-hero");
    head.innerHTML = '<div class="k-hero-dice">🎲</div><h1>Kniffel</h1><p>Spielblock · Punkte werden automatisch berechnet</p>';
    v.appendChild(head);

    var card = el("section", "setup-card");
    var addRow = el("div", "add-row");
    var input = el("input", "name-input"); input.type = "text"; input.placeholder = "Spielername …"; input.maxLength = 18; input.autocomplete = "off";
    var addBtn = el("button", "btn btn-add", "Hinzufügen");
    addRow.appendChild(input); addRow.appendChild(addBtn);
    card.appendChild(addRow);

    var list = el("div", "pl-list"); list.id = "plList";
    card.appendChild(list);
    var hint = el("p", "setup-hint");
    card.appendChild(hint);
    v.appendChild(card);

    var startBtn = el("button", "btn btn-start", "Spiel starten");
    v.appendChild(startBtn);

    function refresh() {
      renderPlayerList(list, refresh);
      var n = state.players.length;
      hint.textContent = n < MIN_PLAYERS
        ? ("Mindestens " + MIN_PLAYERS + " Spieler anlegen.")
        : (n + " Spieler · am Griff ≡ ziehen zum Sortieren");
      startBtn.disabled = n < MIN_PLAYERS;
      var full = n >= MAX_PLAYERS;
      addBtn.disabled = full; input.disabled = full;
      input.placeholder = full ? ("Maximal " + MAX_PLAYERS + " Spieler") : "Spielername …";
    }
    function doAdd() {
      if (state.players.length >= MAX_PLAYERS) return;
      var name = input.value.trim() || ("Spieler " + (state.players.length + 1));
      state.players.push({ id: newId(), name: name });
      save(); input.value = ""; refresh(); input.focus();
    }
    addBtn.addEventListener("click", doAdd);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") doAdd(); });
    startBtn.addEventListener("click", function () {
      if (state.players.length < MIN_PLAYERS) return;
      state.phase = "play"; save(); render();
    });

    refresh();
  }

  function renderPlayerList(list, refresh) {
    list.innerHTML = "";
    state.players.forEach(function (p, idx) {
      var row = el("div", "pl-row"); row.dataset.id = p.id;
      row.style.setProperty("--accent", accentFor(idx));

      var handle = el("span", "drag-handle", "≡"); handle.setAttribute("aria-label", "Ziehen zum Sortieren");
      var dot = el("span", "pl-dot", String(idx + 1));
      var name = el("span", "pl-name", p.name);
      var del = el("button", "pl-del", "✕"); del.setAttribute("aria-label", "Entfernen");
      row.appendChild(handle); row.appendChild(dot); row.appendChild(name); row.appendChild(del);

      del.addEventListener("click", function () {
        state.players = state.players.filter(function (x) { return x.id !== p.id; });
        delete state.scores[p.id];
        save(); refresh();
      });
      attachDrag(row, handle, list, refresh);
      list.appendChild(row);
    });
  }

  // Pointer-basiertes Drag & Drop (touch + desktop)
  function attachDrag(row, handle, list, refresh) {
    handle.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      var pid = e.pointerId;
      row.classList.add("dragging");
      try { row.setPointerCapture(pid); } catch (_) {}

      function move(ev) {
        var y = ev.clientY;
        var others = Array.prototype.slice.call(list.querySelectorAll(".pl-row:not(.dragging)"));
        var before = null;
        for (var i = 0; i < others.length; i++) {
          var box = others[i].getBoundingClientRect();
          if (y < box.top + box.height / 2) { before = others[i]; break; }
        }
        if (before) list.insertBefore(row, before);
        else list.appendChild(row);
      }
      function up() {
        row.classList.remove("dragging");
        try { row.releasePointerCapture(pid); } catch (_) {}
        row.removeEventListener("pointermove", move);
        row.removeEventListener("pointerup", up);
        row.removeEventListener("pointercancel", up);
        var order = Array.prototype.map.call(list.querySelectorAll(".pl-row"), function (r) { return r.dataset.id; });
        state.players.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
        save(); refresh();
      }
      row.addEventListener("pointermove", move);
      row.addEventListener("pointerup", up);
      row.addEventListener("pointercancel", up);
    });
  }

  // ==================================================================
  //  SPIEL (Score-Block)
  // ==================================================================
  function renderPlay() {
    var v = $("view-play");
    var prevBoard = v.querySelector(".board");
    var sl = prevBoard ? prevBoard.scrollLeft : 0, st = prevBoard ? prevBoard.scrollTop : 0;
    v.innerHTML = "";

    var round = Math.min(minFilled() + 1, TOTAL_FIELDS);
    var maxFields = TOTAL_FIELDS * state.players.length;
    var head = el("header", "play-head");
    head.innerHTML =
      '<div class="ph-brand"><span class="ph-dice">🎲</span><b>Kniffel</b></div>' +
      '<div class="ph-meta"><span class="ph-round">Runde ' + round + ' / ' + TOTAL_FIELDS + '</span>' +
      '<span class="ph-prog">' + totalFilled() + ' / ' + maxFields + ' Felder</span></div>';
    var menuBtn = el("button", "ph-menu", "⋯"); menuBtn.setAttribute("aria-label", "Menü");
    menuBtn.addEventListener("click", function () { syncWakeItem(); openSheet($("menuSheet")); });
    head.appendChild(menuBtn);
    v.appendChild(head);

    var board = el("div", "board");
    board.appendChild(buildTable());
    v.appendChild(board);
    board.scrollLeft = sl; board.scrollTop = st;

    var foot = el("div", "play-foot");
    var evalBtn = el("button", "btn", "");
    var done = isComplete();
    evalBtn.disabled = !done;
    evalBtn.textContent = done ? "Auswertung anzeigen" : ("Noch " + (maxFields - totalFilled()) + " Felder offen");
    evalBtn.addEventListener("click", function () { if (isComplete()) { state.phase = "result"; save(); render(); } });
    foot.appendChild(evalBtn);
    v.appendChild(foot);
  }

  function buildTable() {
    var ai = activeIndex();
    var table = el("table", "sheet-table");

    var thead = el("thead");
    var htr = el("tr");
    var corner = el("th", "cat-col corner", "Kategorie");
    htr.appendChild(corner);
    state.players.forEach(function (p, idx) {
      var th = el("th", "p-col");
      th.style.setProperty("--accent", accentFor(idx));
      if (idx === ai) th.classList.add("active");
      th.appendChild(el("div", "p-name", p.name));
      th.appendChild(el("div", "p-total", String(grand(p.id))));
      if (idx === ai) th.appendChild(el("div", "p-turn", "am Zug"));
      htr.appendChild(th);
    });
    thead.appendChild(htr);
    table.appendChild(thead);

    var tbody = el("tbody");
    tbody.appendChild(sectionRow("Oberer Block"));
    UPPER.forEach(function (c) { tbody.appendChild(catRow(c, ai)); });
    tbody.appendChild(calcRow("Zwischensumme", upperSum, "sum-row"));
    tbody.appendChild(bonusRow());
    tbody.appendChild(calcRow("Oberer Block", upperTotal, "total-row"));

    tbody.appendChild(sectionRow("Unterer Block"));
    LOWER.forEach(function (c) { tbody.appendChild(catRow(c, ai)); });
    tbody.appendChild(calcRow("Unterer Block", lowerSum, "sum-row"));
    tbody.appendChild(calcRow("Gesamt", grand, "grand-row"));
    table.appendChild(tbody);
    return table;
  }

  function sectionRow(label) {
    var tr = el("tr", "section-row");
    tr.appendChild(el("td", "cat-col", label));
    state.players.forEach(function () { tr.appendChild(el("td", "sec-cell")); });
    return tr;
  }

  function catRow(cat, ai) {
    var tr = el("tr", "cat-row");
    var label = el("td", "cat-col");
    label.innerHTML = '<span class="cat-label">' + escapeHtml(cat.label) + '</span><span class="cat-hint">' + escapeHtml(cat.hint) + '</span>';
    tr.appendChild(label);
    state.players.forEach(function (p, idx) {
      var td = el("td", "val-cell");
      if (idx === ai) td.classList.add("active-col");
      var v = val(p.id, cat.key);
      if (v == null) { td.classList.add("empty"); td.innerHTML = '<span class="cell-add">+</span>'; }
      else if (v === 0) { td.classList.add("struck"); td.textContent = "—"; }
      else { td.textContent = String(v); }
      td.addEventListener("click", function () { openEntry(p, cat); });
      tr.appendChild(td);
    });
    return tr;
  }

  function calcRow(label, fn, cls) {
    var tr = el("tr", "calc-row " + cls);
    tr.appendChild(el("td", "cat-col", label));
    state.players.forEach(function (p) { tr.appendChild(el("td", "calc-cell", String(fn(p.id)))); });
    return tr;
  }

  function bonusRow() {
    var tr = el("tr", "calc-row bonus-row");
    var td = el("td", "cat-col");
    td.innerHTML = '<span class="cat-label">Bonus</span><span class="cat-hint">ab ' + BONUS_THRESHOLD + " → +" + BONUS_POINTS + '</span>';
    tr.appendChild(td);
    state.players.forEach(function (p) {
      var c = el("td", "calc-cell bonus-cell");
      if (bonus(p.id) > 0) { c.classList.add("got"); c.textContent = "+" + BONUS_POINTS; }
      else { c.classList.add("pending"); c.innerHTML = "<b>" + upperSum(p.id) + "</b><small>/" + BONUS_THRESHOLD + "</small>"; }
      tr.appendChild(c);
    });
    return tr;
  }

  // ---------- Eingabe-Sheet ----------
  function optionsFor(cat) {
    if (cat.section === "upper") {
      var arr = [];
      for (var n = 0; n <= 5; n++) arr.push({ v: n * cat.face, sub: n + " × " + FACE[cat.face] });
      return arr;
    }
    if (cat.type === "fixed") return [{ v: cat.value, main: true }, { v: 0 }];
    var a = [{ v: 0 }];
    for (var s = 5; s <= 30; s++) a.push({ v: s });
    return a;
  }

  function openEntry(player, cat) {
    var idx = state.players.indexOf(player);
    var current = val(player.id, cat.key);

    var head = $("entryHead");
    head.innerHTML =
      '<div class="entry-title"><span class="entry-player" style="--accent:' + accentFor(idx) + '">' +
      escapeHtml(player.name) + '</span><span class="entry-cat">' + escapeHtml(cat.label) + '</span></div>' +
      '<div class="entry-hint">' + escapeHtml(cat.hint) + '</div>';

    var body = $("entryBody");
    body.innerHTML = "";
    var grid = el("div", "opt-grid opt-" + cat.section + (cat.type === "fixed" ? " opt-fixed" : ""));
    optionsFor(cat).forEach(function (o) {
      var b = el("button", "opt-btn");
      if (current === o.v) b.classList.add("selected");
      if (o.v === 0) {
        b.classList.add("opt-zero");
        b.appendChild(el("span", "opt-v", "✕"));
        b.appendChild(el("span", "opt-sub", "streichen"));
      } else {
        if (o.main) b.classList.add("opt-main");
        b.appendChild(el("span", "opt-v", String(o.v)));
        if (o.sub) b.appendChild(el("span", "opt-sub", o.sub));
      }
      b.addEventListener("click", function () { setVal(player.id, cat.key, o.v); closeSheet(); render(); });
      grid.appendChild(b);
    });
    body.appendChild(grid);

    var foot = $("entryFoot");
    foot.innerHTML = "";
    if (current != null) {
      var clr = el("button", "btn btn-ghost", "Feld leeren");
      clr.addEventListener("click", function () { setVal(player.id, cat.key, null); closeSheet(); render(); });
      foot.appendChild(clr);
    }
    openSheet($("entrySheet"));
  }

  // ==================================================================
  //  ERGEBNIS
  // ==================================================================
  function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#" + rank; }

  function renderResult() {
    var v = $("view-result");
    v.innerHTML = "";

    var ranked = state.players.map(function (p, idx) { return { p: p, idx: idx, total: grand(p.id) }; })
      .sort(function (a, b) { return b.total - a.total; });
    ranked.forEach(function (r, i) { r.rank = (i > 0 && r.total === ranked[i - 1].total) ? ranked[i - 1].rank : i + 1; });

    var head = el("header", "res-head");
    head.innerHTML = '<div class="res-crown">🏆</div><h1>Endstand</h1>' +
      '<p>' + escapeHtml(ranked[0].p.name) + ' gewinnt mit ' + ranked[0].total + ' Punkten</p>';
    v.appendChild(head);

    var list = el("div", "res-list");
    ranked.forEach(function (r) {
      var row = el("div", "res-row" + (r.rank === 1 ? " winner" : ""));
      row.style.setProperty("--accent", accentFor(r.idx));
      row.appendChild(el("div", "res-rank", medal(r.rank)));
      var mid = el("div", "res-mid");
      mid.innerHTML =
        '<div class="res-name">' + escapeHtml(r.p.name) + '</div>' +
        '<div class="res-break">Oberer ' + upperTotal(r.p.id) +
        (bonus(r.p.id) > 0 ? ' <span class="res-bonus">inkl. +' + BONUS_POINTS + '</span>' : '') +
        ' · Unterer ' + lowerSum(r.p.id) + '</div>';
      row.appendChild(mid);
      row.appendChild(el("div", "res-score", String(r.total)));
      list.appendChild(row);
    });
    v.appendChild(list);

    var actions = el("div", "res-actions");
    var again = el("button", "btn btn-primary", "Nochmal · gleiche Spieler");
    var neu = el("button", "btn btn-ghost", "Neues Spiel");
    again.addEventListener("click", function () {
      state.scores = {};
      state.players.forEach(function (p) { state.scores[p.id] = {}; });
      state.phase = "play"; save(); render();
    });
    neu.addEventListener("click", function () { state.phase = "setup"; save(); render(); });
    actions.appendChild(again); actions.appendChild(neu);
    v.appendChild(actions);
  }

  // ==================================================================
  //  Render-Dispatch + Init
  // ==================================================================
  function render() {
    var changed = _lastPhase !== state.phase;
    _lastPhase = state.phase;
    $("view-setup").hidden  = state.phase !== "setup";
    $("view-play").hidden   = state.phase !== "play";
    $("view-result").hidden = state.phase !== "result";
    if (state.phase === "setup") renderSetup();
    else if (state.phase === "play") renderPlay();
    else renderResult();
    if (openSheetEl) closeSheet();
    if (changed) window.scrollTo(0, 0);
    updateWake();
  }

  function init() {
    scrim = $("scrim");
    scrim.addEventListener("click", closeSheet);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    each(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", closeSheet); });

    $("menuSheet").addEventListener("click", function (e) {
      var act = e.target.getAttribute && e.target.getAttribute("data-menu");
      if (!act) return;
      closeSheet();
      if (act === "setup") { state.phase = "setup"; save(); render(); }
      else if (act === "wake") { state.keepAwake = !state.keepAwake; save(); updateWake(); }
      else if (act === "reset") {
        var ka = state.keepAwake;
        state = blank(); state.keepAwake = ka;   // Einstellung überlebt den Reset
        save(); render();
      }
    });

    // Der Lock geht beim Wegschalten verloren -> beim Zurückkommen neu holen
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") updateWake(); else releaseWake();
    });

    render();
  }

  init();
})();
