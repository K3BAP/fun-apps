/* ============ Qwixx-Spielblock – Logik (Vanilla JS, kein Backend) ============ */
(function () {
  "use strict";

  var LS_KEY = "qwixx_v1";
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 5;

  var ACCENTS = ["#c9a15a", "#4a7a4d", "#b5533f", "#5b7fa6", "#8a6bb0"];

  // Die vier Farbreihen: 11 Zahlenfelder, dann Schloss.
  // Rot & Gelb aufsteigend 2→12, Grün & Blau absteigend 12→2.
  var ROWS = [
    { key: "red",    label: "Rot",  asc: true  },
    { key: "yellow", label: "Gelb", asc: true  },
    { key: "green",  label: "Grün", asc: false },
    { key: "blue",   label: "Blau", asc: false }
  ];
  var ROW_HEX = { red: "#d1503c", yellow: "#d7ab2b", green: "#4e9a55", blue: "#4f86c6" };
  var LAST = 10;              // Index des letzten (Schließ-)Feldes
  var CLOSE_MIN = 5;          // so viele Kreuze müssen davor schon stehen
  function numberAt(row, i) { return row.asc ? i + 2 : 12 - i; }
  function isSolo() { return state.mode === "solo"; }

  // ---------- State ----------
  var state = load();
  var _lastPhase = null;
  var _pid = 0;

  function blankMarks() { return { red: newArr(), yellow: newArr(), green: newArr(), blue: newArr() }; }
  function newArr() { var a = []; for (var i = 0; i < 11; i++) a.push(false); return a; }

  function newPlayer(name) {
    return { id: newId(), name: name,
             marks: blankMarks(),
             locked: { red: false, yellow: false, green: false, blue: false },
             penalties: 0 };
  }

  function blank() { return { phase: "setup", players: [], active: null, mode: "shared" }; }

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY));
      if (s && s.players && s.phase) {
        if (s.mode !== "solo" && s.mode !== "shared") s.mode = "shared";
        s.players.forEach(function (p) {
          if (!p.marks) p.marks = blankMarks();
          if (!p.locked) p.locked = { red: false, yellow: false, green: false, blue: false };
          if (typeof p.penalties !== "number") p.penalties = 0;
        });
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

  // ---------- Wertung ----------
  function countMarks(arr) { var n = 0; for (var i = 0; i < arr.length; i++) if (arr[i]) n++; return n; }
  function maxMarked(arr) { for (var i = arr.length - 1; i >= 0; i--) if (arr[i]) return i; return -1; }
  var TRI = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78];   // Dreieckszahlen
  function rowScore(arr, locked) { return TRI[countMarks(arr) + (locked ? 1 : 0)]; }
  function playerScore(p) {
    var t = 0;
    ROWS.forEach(function (r) { t += rowScore(p.marks[r.key], p.locked[r.key]); });
    return t - 5 * p.penalties;
  }
  function lockedRowCount() {
    var n = 0;
    state.players.forEach(function (p) { ROWS.forEach(function (r) { if (p.locked[r.key]) n++; }); });
    return n;
  }
  function gameOver() {
    var pen4 = state.players.some(function (p) { return p.penalties >= 4; });
    return pen4 || lockedRowCount() >= 2;
  }
  function activePlayer() {
    for (var i = 0; i < state.players.length; i++) if (state.players[i].id === state.active) return state.players[i];
    return state.players[0] || null;
  }
  function leaderId() {
    if (!state.players.length) return null;
    var best = null, max = -Infinity;
    state.players.forEach(function (p) { var t = playerScore(p); if (t > max) { max = t; best = p.id; } });
    return best;
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
    head.innerHTML = '<div class="k-hero-dice">🎲</div><h1>Qwixx</h1><p>Spielblock · vier Reihen, Punkte automatisch</p>';
    v.appendChild(head);

    // Modus-Auswahl: alle auf einem Gerät oder jeder auf seinem eigenen
    var seg = el("div", "mode-seg");
    var segShared = el("button", "seg-btn" + (isSolo() ? "" : " on"));
    segShared.innerHTML = '<b>👥 Gemeinsam</b><small>Alle auf einem Gerät</small>';
    var segSolo = el("button", "seg-btn" + (isSolo() ? " on" : ""));
    segSolo.innerHTML = '<b>📱 Einzeln</b><small>Eigenes Gerät</small>';
    segShared.addEventListener("click", function () { if (isSolo()) { state.mode = "shared"; save(); renderSetup(); } });
    segSolo.addEventListener("click", function () { if (!isSolo()) { state.mode = "solo"; save(); renderSetup(); } });
    seg.appendChild(segShared); seg.appendChild(segSolo);
    v.appendChild(seg);

    if (isSolo()) renderSetupSolo(v);
    else renderSetupShared(v);
  }

  function renderSetupSolo(v) {
    var card = el("section", "setup-card");
    card.appendChild(el("label", "solo-label", "Dein Name"));
    var input = el("input", "name-input solo-input"); input.type = "text"; input.placeholder = "Dein Name …"; input.maxLength = 18; input.autocomplete = "off";
    input.value = (state.players[0] && state.players[0].name) || "";
    card.appendChild(input);
    card.appendChild(el("p", "setup-hint", "Auf diesem Gerät spielst nur du. Alle Mitspieler öffnen dieselbe Seite auf ihrem eigenen Gerät und wählen ebenfalls „Einzeln“."));
    v.appendChild(card);

    var startBtn = el("button", "btn btn-start", "Losspielen");
    v.appendChild(startBtn);

    function start() {
      var p = newPlayer(input.value.trim() || "Ich");
      state.players = [p]; state.active = p.id; state.phase = "play";
      closeSheet(); save(); render();
    }
    startBtn.addEventListener("click", start);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") start(); });
  }

  function renderSetupShared(v) {
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
      state.players.push(newPlayer(name));
      save(); input.value = ""; refresh(); input.focus();
    }
    addBtn.addEventListener("click", doAdd);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") doAdd(); });
    startBtn.addEventListener("click", function () {
      if (state.players.length < MIN_PLAYERS) return;
      resetSheets();
      state.players.forEach(function (p) { p.marks = blankMarks(); p.locked = { red: false, yellow: false, green: false, blue: false }; p.penalties = 0; });
      state.phase = "play"; state.active = state.players[0].id;
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
    var ap = activePlayer();

    // Kopf
    var head = el("header", "play-head");
    head.innerHTML =
      '<div class="ph-brand"><span class="ph-dice">🎲</span><b>Qwixx</b></div>' +
      '<div class="ph-meta"><span class="ph-round">' + playerScore(ap) + ' Pkt</span>' +
      '<span class="ph-prog">' + escapeHtml(ap.name) + '</span></div>';
    var menuBtn = el("button", "ph-menu", "⋯"); menuBtn.setAttribute("aria-label", "Menü");
    menuBtn.addEventListener("click", function () { renderMenu(); openSheet($("menuSheet")); });
    head.appendChild(menuBtn);
    v.appendChild(head);

    // Spielerauswahl (Chips) – nur im Gemeinsam-Modus
    if (!isSolo()) {
      var stand = el("div", "standings");
      var lead = leaderId();
      state.players.forEach(function (p, idx) {
        var chip = el("button", "stand-chip" + (p.id === lead ? " leader" : "") + (p.id === state.active ? " active" : ""));
        chip.style.setProperty("--accent", accentFor(idx));
        chip.innerHTML = '<span class="stand-name">' + (p.id === lead ? "👑 " : "") + escapeHtml(p.name) + '</span>' +
          '<span class="stand-score">' + playerScore(p) + '</span>';
        chip.addEventListener("click", function () { state.active = p.id; save(); render(); });
        stand.appendChild(chip);
      });
      v.appendChild(stand);
    }

    var body = el("main", "play-body");
    body.appendChild(renderSheetFor(ap));
    v.appendChild(body);

    if (changedScroll) window.scrollTo(0, 0);
  }

  // Der Spielblock eines Spielers
  function renderSheetFor(p) {
    var wrap = el("section", "qx-sheet");

    ROWS.forEach(function (row) {
      var arr = p.marks[row.key];
      var isLocked = p.locked[row.key];
      var mm = maxMarked(arr);
      var cnt = countMarks(arr);

      var rowEl = el("div", "qx-row qx-" + row.key + (isLocked ? " closed" : ""));
      var lead = el("div", "qx-lead");
      lead.innerHTML = '<span class="qx-dir">' + (row.asc ? "▲" : "▼") + '</span>' +
        '<span class="qx-rowscore">' + rowScore(arr, isLocked) + '</span>';
      rowEl.appendChild(lead);

      var cells = el("div", "qx-cells");
      for (var i = 0; i < 11; i++) {
        (function (i) {
          var marked = arr[i];
          var isLast = i === LAST;
          var available = !marked && i > mm && (!isLast || cnt >= CLOSE_MIN);
          var skipped = !marked && i < mm;                       // übersprungen → gesperrt
          var lockOut = !marked && isLast && cnt < CLOSE_MIN;    // letzte Zahl noch nicht freigeschaltet

          var cell = el("button", "qx-cell" +
            (marked ? " on" : "") +
            (skipped ? " skip" : "") +
            ((lockOut || (!available && !marked && !skipped)) ? " off" : ""),
            String(numberAt(row, i)));

          var canUndo = marked && i === mm;
          cell.disabled = !available && !canUndo;

          cell.addEventListener("click", function () {
            if (marked) {
              if (i !== mm) return;                 // nur das rechteste Kreuz lässt sich lösen
              arr[i] = false;
              if (isLast) p.locked[row.key] = false;
            } else {
              if (i <= mm) return;                  // links davon gesperrt
              if (isLast && cnt < CLOSE_MIN) return;
              arr[i] = true;
              if (isLast) p.locked[row.key] = true;
            }
            save(); render();
          });
          cells.appendChild(cell);
        })(i);
      }

      // Schloss-Feld
      var lock = el("div", "qx-lock" + (isLocked ? " on" : ""), "🔒");
      cells.appendChild(lock);

      rowEl.appendChild(cells);
      wrap.appendChild(rowEl);
    });

    // Fehlwürfe
    var penWrap = el("div", "qx-pens");
    penWrap.appendChild(el("span", "qx-pens-label", "Fehlwürfe · je −5"));
    var boxes = el("div", "qx-penboxes");
    for (var k = 0; k < 4; k++) {
      (function (k) {
        var checked = k < p.penalties;
        var box = el("button", "qx-pen" + (checked ? " on" : ""), "✕");
        box.addEventListener("click", function () {
          p.penalties = checked ? k : k + 1;
          save(); render();
        });
        boxes.appendChild(box);
      })(k);
    }
    penWrap.appendChild(boxes);
    wrap.appendChild(penWrap);

    // Ende-Hinweis + Auswerten
    if (gameOver()) {
      var pen4 = state.players.some(function (pl) { return pl.penalties >= 4; });
      var reason = isSolo()
        ? (pen4 ? "Du hast 4 Fehlwürfe." : "Du hast 2 Reihen geschlossen.")
        : (pen4 ? "Ein Spieler hat 4 Fehlwürfe." : "Zwei Reihen sind geschlossen.");
      var banner = el("div", "qx-endbanner", "Spielende erreicht: " + reason + " Jetzt auswerten.");
      wrap.appendChild(banner);
    }
    var evalBtn = el("button", "btn btn-primary qx-eval", "Auswerten");
    evalBtn.addEventListener("click", function () { state.phase = "result"; save(); render(); });
    wrap.appendChild(evalBtn);

    return wrap;
  }

  // ---------- Übersicht aller Blöcke ----------
  function renderBlock() {
    var body = $("blockBody");
    body.innerHTML = "";
    var table = el("table", "block-table");

    var thead = el("thead");
    var htr = el("tr");
    htr.appendChild(el("th", "rd-col", ""));
    state.players.forEach(function (p, idx) {
      var th = el("th", "bp-col");
      th.style.setProperty("--accent", accentFor(idx));
      th.innerHTML = '<div class="bp-name">' + escapeHtml(p.name) + '</div><div class="bp-total">' + playerScore(p) + '</div>';
      htr.appendChild(th);
    });
    thead.appendChild(htr); table.appendChild(thead);

    var tbody = el("tbody");
    ROWS.forEach(function (row) {
      var tr = el("tr");
      tr.appendChild(el("td", "rd-col", row.label));
      state.players.forEach(function (p) {
        var arr = p.marks[row.key], lk = p.locked[row.key];
        var td = el("td", "bp-cell");
        td.innerHTML = '<span class="bp-bt">' + rowScore(arr, lk) + (lk ? ' 🔒' : '') + '</span>' +
          '<span class="bp-run">' + countMarks(arr) + ' Kreuze</span>';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    // Fehlwürfe-Zeile
    var ptr = el("tr");
    ptr.appendChild(el("td", "rd-col", "Fehl."));
    state.players.forEach(function (p) {
      var td = el("td", "bp-cell");
      td.innerHTML = '<span class="bp-bt">' + (p.penalties ? '−' + (p.penalties * 5) : '0') + '</span>' +
        '<span class="bp-run">' + p.penalties + '×</span>';
      ptr.appendChild(td);
    });
    tbody.appendChild(ptr);

    table.appendChild(tbody);
    body.appendChild(table);
  }

  // ---------- Menü ----------
  function renderMenu() {
    var box = $("menuList");
    box.innerHTML = "";
    var block = el("button", "menu-item", isSolo() ? "📋 Reihen-Übersicht" : "📋 Übersicht aller Spieler");
    block.addEventListener("click", function () { closeSheet(); renderBlock(); openSheet($("blockSheet")); });
    var evalItem = el("button", "menu-item", "🏁 Spiel auswerten");
    evalItem.addEventListener("click", function () { closeSheet(); state.phase = "result"; save(); render(); });
    var setup = el("button", "menu-item", "Zurück zur Spielerauswahl");
    setup.addEventListener("click", function () { closeSheet(); state.phase = "setup"; save(); render(); });
    var reset = el("button", "menu-item danger", "Spiel zurücksetzen");
    reset.addEventListener("click", function () { closeSheet(); state = blank(); save(); render(); });
    box.appendChild(block); box.appendChild(evalItem); box.appendChild(setup); box.appendChild(reset);
  }

  // ==================================================================
  //  ERGEBNIS
  // ==================================================================
  function medal(rank) { return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#" + rank; }

  // Einzelmodus: persönliche Ergebnis-Karte statt Rangliste
  function renderResultSolo() {
    var v = $("view-result");
    v.innerHTML = "";
    var p = state.players[0];
    var total = playerScore(p);

    var head = el("header", "res-head");
    head.innerHTML = '<div class="res-crown">🎲</div><h1>Dein Ergebnis</h1>' +
      '<p>' + escapeHtml(p.name) + ' · ' + total + ' Punkte</p>';
    v.appendChild(head);

    var list = el("div", "res-list");
    ROWS.forEach(function (row) {
      var arr = p.marks[row.key], lk = p.locked[row.key];
      var rrow = el("div", "res-row");
      rrow.style.setProperty("--accent", ROW_HEX[row.key]);
      rrow.appendChild(el("div", "res-rank", row.asc ? "▲" : "▼"));
      var mid = el("div", "res-mid");
      mid.innerHTML = '<div class="res-name">' + row.label + (lk ? ' 🔒' : '') + '</div>' +
        '<div class="res-break">' + countMarks(arr) + ' Kreuze' + (lk ? ' + Schloss' : '') + '</div>';
      rrow.appendChild(mid);
      rrow.appendChild(el("div", "res-score", String(rowScore(arr, lk))));
      list.appendChild(rrow);
    });
    if (p.penalties) {
      var prow = el("div", "res-row");
      prow.style.setProperty("--accent", "#b5533f");
      prow.appendChild(el("div", "res-rank", "✕"));
      var pmid = el("div", "res-mid");
      pmid.innerHTML = '<div class="res-name">Fehlwürfe</div><div class="res-break">' + p.penalties + ' × −5</div>';
      prow.appendChild(pmid);
      prow.appendChild(el("div", "res-score", "−" + (p.penalties * 5)));
      list.appendChild(prow);
    }
    var trow = el("div", "res-row winner");
    trow.appendChild(el("div", "res-rank", "Σ"));
    var tmid = el("div", "res-mid"); tmid.innerHTML = '<div class="res-name">Gesamt</div>';
    trow.appendChild(tmid);
    trow.appendChild(el("div", "res-score", String(total)));
    list.appendChild(trow);
    v.appendChild(list);

    var actions = el("div", "res-actions");
    var again = el("button", "btn btn-primary", "Nochmal");
    var neu = el("button", "btn btn-ghost", "Zurück zum Start");
    again.addEventListener("click", function () {
      p.marks = blankMarks(); p.locked = { red: false, yellow: false, green: false, blue: false }; p.penalties = 0;
      state.phase = "play"; save(); render();
    });
    neu.addEventListener("click", function () { state.phase = "setup"; save(); render(); });
    actions.appendChild(again); actions.appendChild(neu);
    v.appendChild(actions);
  }

  function renderResult() {
    if (isSolo()) return renderResultSolo();
    var v = $("view-result");
    v.innerHTML = "";

    var ranked = state.players.map(function (p, idx) { return { p: p, idx: idx, total: playerScore(p) }; })
      .sort(function (a, b) { return b.total - a.total; });
    ranked.forEach(function (r, i) { r.rank = (i > 0 && r.total === ranked[i - 1].total) ? ranked[i - 1].rank : i + 1; });

    var head = el("header", "res-head");
    head.innerHTML = '<div class="res-crown">🎲</div><h1>Endstand</h1>' +
      '<p>' + escapeHtml(ranked[0].p.name) + ' gewinnt mit ' + ranked[0].total + ' Punkten</p>';
    v.appendChild(head);

    var list = el("div", "res-list");
    ranked.forEach(function (r) {
      var row = el("div", "res-row" + (r.rank === 1 ? " winner" : ""));
      row.style.setProperty("--accent", accentFor(r.idx));
      row.appendChild(el("div", "res-rank", medal(r.rank)));
      var mid = el("div", "res-mid");
      var closed = 0;
      ROWS.forEach(function (rw) { if (r.p.locked[rw.key]) closed++; });
      mid.innerHTML = '<div class="res-name">' + escapeHtml(r.p.name) + '</div>' +
        '<div class="res-break">' + closed + ' Reihe' + (closed === 1 ? '' : 'n') + ' geschlossen · ' +
        r.p.penalties + ' Fehlwurf' + (r.p.penalties === 1 ? '' : 'e') + '</div>';
      row.appendChild(mid);
      row.appendChild(el("div", "res-score", String(r.total)));
      list.appendChild(row);
    });
    v.appendChild(list);

    var blockBtn = el("button", "btn btn-ghost res-block", "📋 Übersicht aller Reihen");
    blockBtn.addEventListener("click", function () { renderBlock(); openSheet($("blockSheet")); });
    v.appendChild(blockBtn);

    var actions = el("div", "res-actions");
    var again = el("button", "btn btn-primary", "Nochmal · gleiche Spieler");
    var neu = el("button", "btn btn-ghost", "Neues Spiel");
    again.addEventListener("click", function () {
      state.players.forEach(function (p) { p.marks = blankMarks(); p.locked = { red: false, yellow: false, green: false, blue: false }; p.penalties = 0; });
      state.phase = "play"; state.active = state.players[0].id;
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
  function resetSheets() { closeSheet(); }
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
