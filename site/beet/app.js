/* ============ Ab ins Beet – Punktezähler (Vanilla JS, kein Backend) ============ */
(function () {
  "use strict";

  var LS_KEY = "beet_v1";
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 4;
  var ROUNDS = 3;

  var ACCENTS = ["#3f8f3a", "#e2503b", "#f2b134", "#5b9bd1"];
  var COLOR_PTS = { 1: 3, 2: 1, 3: 0 };

  // ---------- State ----------
  var state = load();
  var _lastPhase = null;
  var _pid = 0;

  function blank() {
    return { phase: "setup", players: [], round: 1, step: "beet", beetIdx: 0,
             draftBeds: {}, draftTier: {}, rounds: [] };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && s.players && s.rounds && s.phase) {
        if (!s.draftBeds) s.draftBeds = {};
        if (!s.draftTier) s.draftTier = {};
        if (s.beetIdx == null) s.beetIdx = 0;
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

  // ---------- Wertung ----------
  function newBed() { return { colors: 2, salate: 0, noHalf: false, pairs: 0 }; }
  function bedsOf(pid) {
    var b = state.draftBeds[pid];
    if (!b || b.length !== 3) { b = [newBed(), newBed(), newBed()]; state.draftBeds[pid] = b; }
    return b;
  }
  function bedPoints(bed) { return COLOR_PTS[bed.colors] + bed.salate + (bed.noHalf ? 1 : 0) + bed.pairs; }
  function beetTotal(pid) { var t = 0; bedsOf(pid).forEach(function (b) { t += bedPoints(b); }); return t; }

  function bonusFor(pid) {
    var vals = state.players.map(function (p) { return beetTotal(p.id); });
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var bt = beetTotal(pid);
    if (bt === max) return 10;      // meiste Beetpunkte (auch mehrere)
    if (bt === min) return 0;       // wenigste
    return 5;
  }
  function tierCount(pid) { var v = state.draftTier[pid]; return v == null ? 0 : v; }
  function tierPts(pid) { return tierCount(pid) * 5; }

  function gameTotal(pid) {
    var t = 0;
    state.rounds.forEach(function (r) { t += (r.beet[pid] || 0) + (r.bonus[pid] || 0) + (r.tier[pid] || 0); });
    return t;
  }
  function lastRoundTotal(pid) {
    if (!state.rounds.length) return 0;
    var r = state.rounds[state.rounds.length - 1];
    return (r.beet[pid] || 0) + (r.bonus[pid] || 0) + (r.tier[pid] || 0);
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
    head.innerHTML = '<div class="k-hero-emoji">🥬</div><h1>Ab ins Beet</h1><p>Punktezähler · 3 Durchgänge, 3 Phasen 🐌</p>';
    v.appendChild(head);

    var card = el("section", "setup-card");
    var addRow = el("div", "add-row");
    var input = el("input", "name-input"); input.type = "text"; input.placeholder = "Gärtner-Name …"; input.maxLength = 18; input.autocomplete = "off";
    var addBtn = el("button", "btn btn-add", "Pflanzen");
    addRow.appendChild(input); addRow.appendChild(addBtn);
    card.appendChild(addRow);

    var list = el("div", "pl-list"); list.id = "plList";
    card.appendChild(list);
    var hint = el("p", "setup-hint");
    card.appendChild(hint);
    v.appendChild(card);

    var startBtn = el("button", "btn btn-start", "Los geht's! 🌱");
    v.appendChild(startBtn);

    function refresh() {
      renderPlayerList(list, refresh);
      var n = state.players.length;
      hint.textContent = n < MIN_PLAYERS
        ? ("Mindestens " + MIN_PLAYERS + " Gärtner anlegen.")
        : (n + " Gärtner · am Griff ≡ ziehen zum Sortieren");
      startBtn.disabled = n < MIN_PLAYERS;
      var full = n >= MAX_PLAYERS;
      addBtn.disabled = full; input.disabled = full;
      input.placeholder = full ? ("Maximal " + MAX_PLAYERS + " Gärtner") : "Gärtner-Name …";
    }
    function doAdd() {
      if (state.players.length >= MAX_PLAYERS) return;
      var name = input.value.trim() || ("Gärtner " + (state.players.length + 1));
      state.players.push({ id: newId(), name: name });
      save(); input.value = ""; refresh(); input.focus();
    }
    addBtn.addEventListener("click", doAdd);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") doAdd(); });
    startBtn.addEventListener("click", function () {
      if (state.players.length < MIN_PLAYERS) return;
      state.phase = "play"; state.round = 1; state.step = "beet"; state.beetIdx = 0;
      state.draftBeds = {}; state.draftTier = {}; state.rounds = [];
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

    var head = el("header", "play-head");
    head.innerHTML =
      '<div class="ph-brand"><span class="ph-snail">🐌</span><b>Ab ins Beet</b></div>' +
      '<div class="ph-meta"><span class="ph-round">Durchgang ' + r + ' / ' + ROUNDS + '</span>' +
      '<span class="ph-prog">' + r + ' Tierkarte' + (r === 1 ? '' : 'n') + '</span></div>';
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
      chip.innerHTML = '<span class="stand-name">' + (p.id === lead ? "🥕 " : "") + escapeHtml(p.name) + '</span>' +
        '<span class="stand-score">' + gameTotal(p.id) + '</span>';
      stand.appendChild(chip);
    });
    v.appendChild(stand);

    var body = el("main", "play-body");
    if (state.step === "beet") body.appendChild(beetStep());
    else if (state.step === "bonus") body.appendChild(bonusStep());
    else body.appendChild(tierStep());
    v.appendChild(body);

    if (changedScroll) window.scrollTo(0, 0);
  }

  function stepHead(active, title, sub) {
    var h = el("div", "step-head");
    function tab(key, label) { return '<span class="step-tab' + (active === key ? " on" : "") + '">' + label + '</span>'; }
    h.innerHTML = '<div class="step-tabs">' + tab("beet", "① Beete") + tab("bonus", "② Bonus") + tab("tier", "③ Tiere") + '</div>' +
      '<h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(sub) + '</p>';
    return h;
  }

  // ---- Phase ① Beete (Pager pro Spieler) ----
  function beetStep() {
    var wrap = el("section", "step-card");
    var p = state.players[state.beetIdx];
    wrap.appendChild(stepHead("beet", "Beete von " + p.name,
      "Spieler " + (state.beetIdx + 1) + " / " + nPlayers() + " · tippe die 3 Beete an"));

    var beds = bedsOf(p.id);
    beds.forEach(function (bed, bi) {
      wrap.appendChild(bedCard(p, bed, bi));
    });

    var sum = el("div", "beet-sum");
    sum.innerHTML = 'Beetpunkte <b>' + p.name + '</b>: <span class="bs-val">' + beetTotal(p.id) + '</span>';
    wrap.appendChild(sum);

    var actions = el("div", "step-actions");
    if (state.beetIdx > 0) {
      var back = el("button", "btn btn-ghost", "← Zurück");
      back.addEventListener("click", function () { state.beetIdx--; save(); render(); });
      actions.appendChild(back);
    }
    var last = state.beetIdx >= nPlayers() - 1;
    var next = el("button", "btn btn-primary", last ? "Weiter zum Bonus →" : "Nächster Gärtner →");
    next.addEventListener("click", function () {
      if (last) { state.step = "bonus"; }
      else { state.beetIdx++; }
      save(); render();
    });
    actions.appendChild(next);
    wrap.appendChild(actions);
    return wrap;
  }

  function bedCard(p, bed, bi) {
    var card = el("div", "bed-card");
    card.style.setProperty("--accent", accentFor(state.beetIdx));
    var head = el("div", "bed-head");
    head.innerHTML = '<span class="bed-title">🌱 Beet ' + (bi + 1) + '</span><span class="bed-pts">' + bedPoints(bed) + ' P</span>';
    card.appendChild(head);

    // Farbigkeit
    var colorRow = el("div", "bed-row");
    colorRow.appendChild(el("span", "bed-label", "Farbigkeit"));
    var chips = el("div", "color-chips");
    [[1, "einfarbig", "3"], [2, "zweifarbig", "1"], [3, "dreifarbig", "0"]].forEach(function (o) {
      var c = el("button", "color-chip" + (bed.colors === o[0] ? " on" : ""));
      c.innerHTML = o[1] + '<small>' + o[2] + ' P</small>';
      c.addEventListener("click", function () { bed.colors = o[0]; save(); render(); });
      chips.appendChild(c);
    });
    colorRow.appendChild(chips);
    card.appendChild(colorRow);

    // Ganze Salate
    var salRow = el("div", "bed-row");
    salRow.appendChild(el("span", "bed-label", "🥬 Ganze Salate"));
    salRow.appendChild(stepper(bed.salate, 0, 99, function (nv) { bed.salate = nv; save(); render(); }));
    card.appendChild(salRow);

    // Keine halben Salate
    var halfRow = el("label", "bed-row toggle-row");
    var cb = el("input"); cb.type = "checkbox"; cb.checked = bed.noHalf;
    cb.addEventListener("change", function () { bed.noHalf = cb.checked; save(); render(); });
    halfRow.appendChild(el("span", "bed-label", "Keine halben Salate"));
    var track = el("span", "mini-track" + (bed.noHalf ? " on" : "")); track.appendChild(el("span", "mini-thumb"));
    halfRow.insertBefore(cb, halfRow.firstChild);
    halfRow.appendChild(track);
    card.appendChild(halfRow);

    // Tomate+Paprika-Paare
    var pairRow = el("div", "bed-row");
    pairRow.appendChild(el("span", "bed-label", "🍅🫑 Tomate+Paprika-Paare"));
    pairRow.appendChild(stepper(bed.pairs, 0, 99, function (nv) { bed.pairs = nv; save(); render(); }));
    card.appendChild(pairRow);

    return card;
  }

  // ---- Phase ② Bonus (Auto-Review) ----
  function bonusStep() {
    var wrap = el("section", "step-card");
    wrap.appendChild(stepHead("bonus", "Bonuspunkte", "Automatisch: meiste → 10, wenigste → 0, dazwischen → 5"));

    var ranked = state.players.slice().sort(function (a, b) { return beetTotal(b.id) - beetTotal(a.id); });
    ranked.forEach(function (p) {
      var idx = state.players.indexOf(p);
      var bonus = bonusFor(p.id);
      var row = el("div", "bonus-row");
      row.style.setProperty("--accent", accentFor(idx));
      row.innerHTML = '<span class="br-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="br-beet">' + beetTotal(p.id) + ' Beetpkt.</span>' +
        '<span class="br-bonus b' + bonus + '">+' + bonus + '</span>';
      wrap.appendChild(row);
    });

    var actions = el("div", "step-actions");
    var back = el("button", "btn btn-ghost", "← Beete");
    back.addEventListener("click", function () { state.step = "beet"; state.beetIdx = nPlayers() - 1; save(); render(); });
    var next = el("button", "btn btn-primary", "Weiter zu den Tieren →");
    next.addEventListener("click", function () { state.step = "tier"; save(); render(); });
    actions.appendChild(back); actions.appendChild(next);
    wrap.appendChild(actions);
    return wrap;
  }

  // ---- Phase ③ Tiere ----
  function tierStep() {
    var wrap = el("section", "step-card");
    var maxT = Math.min(3, state.round);
    wrap.appendChild(stepHead("tier", "Tierkarten", "5 Punkte je Beet, das eine Tierkarte erfüllt (max. " + maxT + ")"));

    state.players.forEach(function (p, idx) {
      var n = Math.min(tierCount(p.id), maxT);
      var row = el("div", "entry-row");
      row.style.setProperty("--accent", accentFor(idx));
      var info = el("div", "er-info");
      info.innerHTML = '<span class="er-name">' + escapeHtml(p.name) + '</span>' +
        '<span class="er-sub">🦡 ' + n + ' Beet' + (n === 1 ? '' : 'e') + ' · <span class="er-pts">+' + (n * 5) + '</span></span>';
      row.appendChild(info);
      row.appendChild(stepper(n, 0, maxT, function (nv) { state.draftTier[p.id] = nv; save(); render(); }));
      wrap.appendChild(row);
    });

    var actions = el("div", "step-actions");
    var back = el("button", "btn btn-ghost", "← Bonus");
    back.addEventListener("click", function () { state.step = "bonus"; save(); render(); });
    var done = el("button", "btn btn-primary", state.round >= ROUNDS ? "Spiel beenden 🏆" : "Durchgang abschließen");
    done.addEventListener("click", finishRound);
    actions.appendChild(back); actions.appendChild(done);
    wrap.appendChild(actions);
    return wrap;
  }

  function finishRound() {
    var beet = {}, bonus = {}, tier = {};
    var maxT = Math.min(3, state.round);
    state.players.forEach(function (p) {
      beet[p.id] = beetTotal(p.id);
      bonus[p.id] = bonusFor(p.id);
      tier[p.id] = Math.min(tierCount(p.id), maxT) * 5;
    });
    state.rounds.push({ beet: beet, bonus: bonus, tier: tier });
    state.draftBeds = {}; state.draftTier = {}; state.step = "beet"; state.beetIdx = 0;
    if (state.round >= ROUNDS) { state.phase = "result"; }
    else { state.round++; }
    save(); render();
  }

  function leaderId() {
    if (!state.rounds.length) return null;
    var best = null, max = -Infinity;
    state.players.forEach(function (p) { var t = gameTotal(p.id); if (t > max) { max = t; best = p.id; } });
    return best;
  }

  // ---------- Menü ----------
  function renderMenu() {
    var box = $("menuList");
    box.innerHTML = "";
    var block = el("button", "menu-item", "📋 Block ansehen");
    block.addEventListener("click", function () { closeSheet(); renderBlock(); openSheet($("blockSheet")); });
    var setup = el("button", "menu-item", "Zurück zur Gärtner-Auswahl");
    setup.addEventListener("click", function () { closeSheet(); state.phase = "setup"; save(); render(); });
    var reset = el("button", "menu-item danger", "Spiel zurücksetzen");
    reset.addEventListener("click", function () { closeSheet(); state = blank(); save(); render(); });
    box.appendChild(block); box.appendChild(setup); box.appendChild(reset);
  }

  // ---------- Block-Übersicht ----------
  function renderBlock() {
    var body = $("blockBody");
    body.innerHTML = "";
    if (!state.rounds.length) { body.appendChild(el("p", "block-empty", "Noch kein Durchgang abgeschlossen.")); return; }
    var table = el("table", "block-table");
    var thead = el("thead");
    var htr = el("tr");
    htr.appendChild(el("th", "rd-col", "Dg"));
    state.players.forEach(function (p, idx) {
      var th = el("th", "bp-col");
      th.style.setProperty("--accent", accentFor(idx));
      th.innerHTML = '<div class="bp-name">' + escapeHtml(p.name) + '</div><div class="bp-total">' + gameTotal(p.id) + '</div>';
      htr.appendChild(th);
    });
    thead.appendChild(htr); table.appendChild(thead);
    var tbody = el("tbody");
    var run = {}; state.players.forEach(function (p) { run[p.id] = 0; });
    state.rounds.forEach(function (rd, i) {
      var tr = el("tr");
      tr.appendChild(el("td", "rd-col", String(i + 1)));
      state.players.forEach(function (p) {
        var sum = (rd.beet[p.id] || 0) + (rd.bonus[p.id] || 0) + (rd.tier[p.id] || 0);
        run[p.id] += sum;
        var td = el("td", "bp-cell");
        td.innerHTML = '<span class="bp-bt">' + (rd.beet[p.id] || 0) + '+' + (rd.bonus[p.id] || 0) + '+' + (rd.tier[p.id] || 0) + '</span>' +
          '<span class="bp-run">' + run[p.id] + '</span>';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(el("p", "block-legend", "je Zelle: Beet + Bonus + Tier · unten Laufsumme"));
    body.appendChild(table);
  }

  // ==================================================================
  //  ERGEBNIS
  // ==================================================================
  function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#" + rank; }

  function renderResult() {
    var v = $("view-result");
    v.innerHTML = "";

    // Tie-Break: Gesamt desc, dann letzter Durchgang desc
    var ranked = state.players.map(function (p, idx) {
      return { p: p, idx: idx, total: gameTotal(p.id), last: lastRoundTotal(p.id) };
    }).sort(function (a, b) { return (b.total - a.total) || (b.last - a.last); });
    ranked.forEach(function (r, i) {
      var prev = ranked[i - 1];
      r.rank = (i > 0 && r.total === prev.total && r.last === prev.last) ? prev.rank : i + 1;
    });

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
      var parts = state.rounds.map(function (rd) {
        return (rd.beet[r.p.id] || 0) + (rd.bonus[r.p.id] || 0) + (rd.tier[r.p.id] || 0);
      });
      mid.innerHTML = '<div class="res-name">' + escapeHtml(r.p.name) + '</div>' +
        '<div class="res-break">Durchgänge: ' + parts.join(' · ') + '</div>';
      row.appendChild(mid);
      row.appendChild(el("div", "res-score", String(r.total)));
      list.appendChild(row);
    });
    v.appendChild(list);

    var blockBtn = el("button", "btn btn-ghost res-block", "📋 Kompletten Block ansehen");
    blockBtn.addEventListener("click", function () { renderBlock(); openSheet($("blockSheet")); });
    v.appendChild(blockBtn);

    var actions = el("div", "res-actions");
    var again = el("button", "btn btn-primary", "Nochmal · gleiche Gärtner");
    var neu = el("button", "btn btn-ghost", "Neues Spiel");
    again.addEventListener("click", function () {
      state.phase = "play"; state.round = 1; state.step = "beet"; state.beetIdx = 0;
      state.draftBeds = {}; state.draftTier = {}; state.rounds = [];
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
  }

  function init() {
    scrim = $("scrim");
    scrim.addEventListener("click", closeSheet);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    each(document.querySelectorAll("[data-close]"), function (b) { b.addEventListener("click", closeSheet); });
    render();
  }

  init();
})();
