/* ============ Wizard-Spielblock – Logik (Vanilla JS, kein Backend) ============ */
(function () {
  "use strict";

  var LS_KEY = "wizard_v1";
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 6;
  var DECK = 60; // Wizard hat 60 Karten -> Runden = floor(60 / Spieler)

  var ACCENTS = ["#c9a15a", "#4a7a4d", "#b5533f", "#5b7fa6", "#8a6bb0", "#3f9e9e"];

  // ---------- State ----------
  var state = load();
  var _lastPhase = null;
  var _pid = 0;

  function blank() {
    return { phase: "setup", players: [], enforce: true, round: 1, step: "bid",
             draftBids: {}, draftTricks: {}, rounds: [], keepAwake: true };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && s.players && s.rounds && s.phase) {
        if (!s.draftBids) s.draftBids = {};
        if (!s.draftTricks) s.draftTricks = {};
        if (typeof s.enforce !== "boolean") s.enforce = true;
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
  function nPlayers() { return state.players.length; }
  function maxRounds() { return nPlayers() ? Math.floor(DECK / nPlayers()) : 0; }

  // ---------- Wertung ----------
  // Ansage exakt getroffen -> 20 + 10*Stiche, sonst -10 je Stich Abweichung.
  function roundScore(bid, tricks) {
    return bid === tricks ? 20 + 10 * tricks : -10 * Math.abs(bid - tricks);
  }
  function totalScore(pid) {
    var t = 0;
    state.rounds.forEach(function (r) { t += roundScore(r.bids[pid], r.tricks[pid]); });
    return t;
  }
  function hits(pid) {
    var n = 0;
    state.rounds.forEach(function (r) { if (r.bids[pid] === r.tricks[pid]) n++; });
    return n;
  }
  function dealerIndex(round) { return (round - 1) % nPlayers(); }

  function bidOf(pid)   { var v = state.draftBids[pid];   return v == null ? 0 : v; }
  function trickOf(pid) { var v = state.draftTricks[pid]; return v == null ? 0 : v; }
  function sumBids()   { var s = 0; state.players.forEach(function (p) { s += bidOf(p.id); });   return s; }
  function sumTricks() { var s = 0; state.players.forEach(function (p) { s += trickOf(p.id); }); return s; }

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
  function wakeMenuItem() {
    var ok = wakeSupported();
    var item = el("button", "menu-item",
      (ok && state.keepAwake ? "✓ " : "○ ") + "Bildschirm anlassen" + (ok ? "" : " · nicht unterstützt"));
    item.disabled = !ok;
    item.addEventListener("click", function () {
      state.keepAwake = !state.keepAwake; save(); closeSheet(); updateWake();
    });
    return item;
  }

  // ---------- Sheets ----------
  var scrim, openSheetEl = null;
  function openSheet(s) { if (openSheetEl) openSheetEl.hidden = true; openSheetEl = s; s.hidden = false; scrim.hidden = false; }
  function closeSheet() { if (openSheetEl) openSheetEl.hidden = true; openSheetEl = null; scrim.hidden = true; }

  function stepper(value, min, max, onChange) {
    var s = el("div", "stepper");
    var dec = el("button", "st-btn", "−"); dec.disabled = value <= min;
    var num = el("span", "st-val", String(value));
    var inc = el("button", "st-btn", "+"); inc.disabled = value >= max;
    dec.addEventListener("click", function () { if (value > min) onChange(value - 1); });
    inc.addEventListener("click", function () { if (value < max) onChange(value + 1); });
    s.appendChild(dec); s.appendChild(num); s.appendChild(inc);
    return s;
  }

  // ==================================================================
  //  SETUP
  // ==================================================================
  function renderSetup() {
    var v = $("view-setup");
    v.innerHTML = "";

    var head = el("header", "k-hero");
    head.innerHTML = '<div class="k-hero-dice">🧙</div><h1>Wizard</h1><p>Spielblock · Ansage & Stiche, Punkte automatisch</p>';
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

    // Ansage-Verbot Umschalter
    var toggle = el("label", "wz-toggle");
    toggle.innerHTML =
      '<span class="wz-track"><span class="wz-thumb"></span></span>' +
      '<span class="wz-text">Ansage-Verbot <small>Summe der Ansagen darf ≠ Stichzahl sein</small></span>';
    var cb = el("input"); cb.type = "checkbox"; cb.checked = state.enforce;
    toggle.insertBefore(cb, toggle.firstChild);
    cb.addEventListener("change", function () { state.enforce = cb.checked; save(); });
    card.appendChild(toggle);

    v.appendChild(card);

    var startBtn = el("button", "btn btn-start", "Spiel starten");
    v.appendChild(startBtn);

    function refresh() {
      renderPlayerList(list, refresh);
      var n = state.players.length;
      hint.textContent = n < MIN_PLAYERS
        ? ("Mindestens " + MIN_PLAYERS + " Spieler anlegen.")
        : (n + " Spieler · " + maxRounds() + " Runden · am Griff ≡ ziehen zum Sortieren");
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
      state.phase = "play"; state.round = 1; state.step = "bid";
      state.draftBids = {}; state.draftTricks = {}; state.rounds = [];
      save(); render();
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
  //  SPIEL
  // ==================================================================
  function renderPlay() {
    var v = $("view-play");
    v.innerHTML = "";
    var r = state.round;
    var max = maxRounds();

    // Kopf
    var head = el("header", "play-head");
    head.innerHTML =
      '<div class="ph-brand"><span class="ph-dice">🧙</span><b>Wizard</b></div>' +
      '<div class="ph-meta"><span class="ph-round">Runde ' + r + ' / ' + max + '</span>' +
      '<span class="ph-prog">' + r + ' Karte' + (r === 1 ? '' : 'n') + ' je Spieler</span></div>';
    var menuBtn = el("button", "ph-menu", "⋯"); menuBtn.setAttribute("aria-label", "Menü");
    menuBtn.addEventListener("click", function () { renderMenu(); openSheet($("menuSheet")); });
    head.appendChild(menuBtn);
    v.appendChild(head);

    // Standings
    var stand = el("div", "standings");
    var lead = leaderId();
    state.players.forEach(function (p, idx) {
      var chip = el("div", "stand-chip" + (p.id === lead ? " leader" : ""));
      chip.style.setProperty("--accent", accentFor(idx));
      chip.innerHTML = '<span class="stand-name">' + (p.id === lead ? "👑 " : "") + escapeHtml(p.name) + '</span>' +
        '<span class="stand-score">' + totalScore(p.id) + '</span>';
      stand.appendChild(chip);
    });
    v.appendChild(stand);

    var body = el("main", "play-body");
    if (state.step === "bid") body.appendChild(bidStep(r));
    else body.appendChild(trickStep(r));
    v.appendChild(body);

    if (changedScroll) window.scrollTo(0, 0);
  }

  function bidStep(r) {
    var wrap = el("section", "step-card");
    var di = dealerIndex(r);
    wrap.appendChild(stepHeader("Ansagen", "Wie viele Stiche schaffst du?"));

    state.players.forEach(function (p, idx) {
      var row = el("div", "entry-row");
      row.style.setProperty("--accent", accentFor(idx));
      var info = el("div", "er-info");
      info.innerHTML = '<span class="er-name">' + escapeHtml(p.name) + '</span>' +
        (idx === di ? '<span class="er-badge">Geber · sagt zuletzt an</span>' : '');
      row.appendChild(info);
      row.appendChild(stepper(bidOf(p.id), 0, r, function (nv) {
        state.draftBids[p.id] = nv; save(); render();
      }));
      wrap.appendChild(row);
    });

    var sum = sumBids();
    var blocked = state.enforce && sum === r;
    var sumLine = el("div", "sum-line" + (blocked ? " warn" : ""));
    sumLine.innerHTML = 'Summe der Ansagen: <b>' + sum + '</b> / ' + r +
      (blocked ? ' — Ansage-Verbot: Geber muss die Summe ändern' : (state.enforce ? '' : ' (Verbot aus)'));
    wrap.appendChild(sumLine);

    var next = el("button", "btn btn-primary step-btn", "Weiter zu den Stichen →");
    next.disabled = blocked;
    next.addEventListener("click", function () {
      state.step = "trick";
      state.draftTricks = {};
      save(); render();
    });
    wrap.appendChild(next);
    return wrap;
  }

  function trickStep(r) {
    var wrap = el("section", "step-card");
    wrap.appendChild(stepHeader("Stiche", "Wie viele Stiche hast du tatsächlich gemacht?"));

    state.players.forEach(function (p, idx) {
      var row = el("div", "entry-row");
      row.style.setProperty("--accent", accentFor(idx));
      var bid = bidOf(p.id), tr = trickOf(p.id);
      var pts = roundScore(bid, tr);
      var info = el("div", "er-info");
      info.innerHTML = '<span class="er-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="er-sub">Ansage: ' + bid + ' · <span class="er-pts ' + (pts >= 0 ? 'pos' : 'neg') + '">' +
        (pts >= 0 ? '+' : '') + pts + '</span></span>';
      row.appendChild(info);
      row.appendChild(stepper(tr, 0, r, function (nv) {
        state.draftTricks[p.id] = nv; save(); render();
      }));
      wrap.appendChild(row);
    });

    var sum = sumTricks();
    var ok = sum === r;
    var sumLine = el("div", "sum-line" + (ok ? " good" : " warn"));
    sumLine.innerHTML = 'Stiche gesamt: <b>' + sum + '</b> / ' + r +
      (ok ? ' ✓' : ' — muss genau ' + r + ' ergeben');
    wrap.appendChild(sumLine);

    var actions = el("div", "step-actions");
    var back = el("button", "btn btn-ghost", "← Ansagen");
    back.addEventListener("click", function () { state.step = "bid"; save(); render(); });
    var done = el("button", "btn btn-primary", state.round >= maxRounds() ? "Spiel beenden" : "Runde abschließen");
    done.disabled = !ok;
    done.addEventListener("click", function () {
      var bids = {}, tricks = {};
      state.players.forEach(function (p) { bids[p.id] = bidOf(p.id); tricks[p.id] = trickOf(p.id); });
      state.rounds.push({ bids: bids, tricks: tricks });
      state.draftBids = {}; state.draftTricks = {}; state.step = "bid";
      if (state.round >= maxRounds()) { state.phase = "result"; }
      else { state.round++; }
      save(); render();
    });
    actions.appendChild(back); actions.appendChild(done);
    wrap.appendChild(actions);
    return wrap;
  }

  function stepHeader(title, sub) {
    var h = el("div", "step-head");
    h.innerHTML = '<div class="step-tabs"><span class="step-tab' + (state.step === "bid" ? " on" : "") + '">1 · Ansagen</span>' +
      '<span class="step-tab' + (state.step === "trick" ? " on" : "") + '">2 · Stiche</span></div>' +
      '<h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(sub) + '</p>';
    return h;
  }

  function leaderId() {
    if (!state.rounds.length) return null;
    var best = null, max = -Infinity;
    state.players.forEach(function (p) { var t = totalScore(p.id); if (t > max) { max = t; best = p.id; } });
    return best;
  }

  // ---------- Block-Übersicht ----------
  function renderBlock() {
    var body = $("blockBody");
    body.innerHTML = "";
    var table = el("table", "block-table");
    var thead = el("thead");
    var htr = el("tr");
    htr.appendChild(el("th", "rd-col", "Rd"));
    state.players.forEach(function (p, idx) {
      var th = el("th", "bp-col");
      th.style.setProperty("--accent", accentFor(idx));
      th.innerHTML = '<div class="bp-name">' + escapeHtml(p.name) + '</div><div class="bp-total">' + totalScore(p.id) + '</div>';
      htr.appendChild(th);
    });
    thead.appendChild(htr); table.appendChild(thead);

    var tbody = el("tbody");
    var run = {};
    state.players.forEach(function (p) { run[p.id] = 0; });
    state.rounds.forEach(function (rd, i) {
      var tr = el("tr");
      tr.appendChild(el("td", "rd-col", String(i + 1)));
      state.players.forEach(function (p) {
        var pts = roundScore(rd.bids[p.id], rd.tricks[p.id]);
        run[p.id] += pts;
        var td = el("td", "bp-cell");
        td.innerHTML = '<span class="bp-bt">' + rd.bids[p.id] + '·' + rd.tricks[p.id] + '</span>' +
          '<span class="bp-run">' + run[p.id] + '</span>';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    if (!state.rounds.length) body.appendChild(el("p", "block-empty", "Noch keine Runde abgeschlossen."));
    else body.appendChild(table);
  }

  // ---------- Menü ----------
  function renderMenu() {
    var box = $("menuList");
    box.innerHTML = "";
    var block = el("button", "menu-item", "📋 Block ansehen");
    block.addEventListener("click", function () { closeSheet(); renderBlock(); openSheet($("blockSheet")); });
    var toggle = el("button", "menu-item", (state.enforce ? "✓ " : "○ ") + "Ansage-Verbot " + (state.enforce ? "an" : "aus"));
    toggle.addEventListener("click", function () { state.enforce = !state.enforce; save(); closeSheet(); render(); });
    var setup = el("button", "menu-item", "Zurück zur Spielerauswahl");
    setup.addEventListener("click", function () { closeSheet(); state.phase = "setup"; save(); render(); });
    var reset = el("button", "menu-item danger", "Spiel zurücksetzen");
    reset.addEventListener("click", function () {
      closeSheet();
      var ka = state.keepAwake;
      state = blank(); state.keepAwake = ka;   // Einstellung überlebt den Reset
      save(); render();
    });
    box.appendChild(block); box.appendChild(toggle); box.appendChild(wakeMenuItem());
    box.appendChild(setup); box.appendChild(reset);
  }

  // ==================================================================
  //  ERGEBNIS
  // ==================================================================
  function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#" + rank; }

  function renderResult() {
    var v = $("view-result");
    v.innerHTML = "";

    var ranked = state.players.map(function (p, idx) { return { p: p, idx: idx, total: totalScore(p.id) }; })
      .sort(function (a, b) { return b.total - a.total; });
    ranked.forEach(function (r, i) { r.rank = (i > 0 && r.total === ranked[i - 1].total) ? ranked[i - 1].rank : i + 1; });

    var head = el("header", "res-head");
    head.innerHTML = '<div class="res-crown">🧙</div><h1>Endstand</h1>' +
      '<p>' + escapeHtml(ranked[0].p.name) + ' gewinnt mit ' + ranked[0].total + ' Punkten</p>';
    v.appendChild(head);

    var list = el("div", "res-list");
    ranked.forEach(function (r) {
      var row = el("div", "res-row" + (r.rank === 1 ? " winner" : ""));
      row.style.setProperty("--accent", accentFor(r.idx));
      row.appendChild(el("div", "res-rank", medal(r.rank)));
      var mid = el("div", "res-mid");
      mid.innerHTML = '<div class="res-name">' + escapeHtml(r.p.name) + '</div>' +
        '<div class="res-break">' + hits(r.p.id) + ' / ' + state.rounds.length + ' Ansagen getroffen</div>';
      row.appendChild(mid);
      row.appendChild(el("div", "res-score", String(r.total)));
      list.appendChild(row);
    });
    v.appendChild(list);

    var blockBtn = el("button", "btn btn-ghost res-block", "📋 Kompletten Block ansehen");
    blockBtn.addEventListener("click", function () { renderBlock(); openSheet($("blockSheet")); });
    v.appendChild(blockBtn);

    var actions = el("div", "res-actions");
    var again = el("button", "btn btn-primary", "Nochmal · gleiche Spieler");
    var neu = el("button", "btn btn-ghost", "Neues Spiel");
    again.addEventListener("click", function () {
      state.phase = "play"; state.round = 1; state.step = "bid";
      state.draftBids = {}; state.draftTricks = {}; state.rounds = [];
      save(); render();
    });
    neu.addEventListener("click", function () { state.phase = "setup"; save(); render(); });
    actions.appendChild(again); actions.appendChild(neu);
    v.appendChild(actions);
  }

  // ==================================================================
  //  Dispatch + Init
  // ==================================================================
  var changedScroll = false;
  function render() {
    changedScroll = _lastPhase !== state.phase;
    _lastPhase = state.phase;
    $("view-setup").hidden  = state.phase !== "setup";
    $("view-play").hidden   = state.phase !== "play";
    $("view-result").hidden = state.phase !== "result";
    if (state.phase === "setup") renderSetup();
    else if (state.phase === "play") renderPlay();
    else renderResult();
    if (openSheetEl && openSheetEl.id !== "blockSheet") closeSheet();
    if (changedScroll) window.scrollTo(0, 0);
    updateWake();
  }

  function init() {
    scrim = $("scrim");
    scrim.addEventListener("click", closeSheet);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    each(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", closeSheet); });
    // Der Lock geht beim Wegschalten verloren -> beim Zurückkommen neu holen
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") updateWake(); else releaseWake();
    });
    render();
  }

  init();
})();
