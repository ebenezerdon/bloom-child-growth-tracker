(function(){
  "use strict";
  window.App = window.App || {};

  const U = window.App.utils;

  // Internal state
  const S = {
    state: null,
    chartMetric: "weight", // weight | height | bmi | head
  };

  // Load or create initial state
  function initState(){
    const loaded = U.loadState();
    if (loaded) {
      S.state = loaded;
      return;
    }
    S.state = window.App.defaultState();
    // Seed example profile
    const childId = U.uid();
    const now = new Date();
    const birth = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const birthStr = `${birth.getFullYear()}-${String(birth.getMonth()+1).padStart(2, "0")}-${String(birth.getDate()).padStart(2, "0")}`;
    S.state.children.push({ id: childId, name: "My Kid", birthdate: birthStr, entries: [] });
    S.state.activeChildId = childId;
    // Seed a few entries
    const seed = [
      { months: 1, w: 4.2, h: 54, head: 36.5 },
      { months: 4, w: 6.4, h: 62, head: 40.5 },
      { months: 8, w: 8.1, h: 70, head: 44.0 },
      { months: 12, w: 9.2, h: 75, head: 46.0 },
    ];
    seed.forEach(s => {
      const d = new Date(birth); d.setMonth(d.getMonth() + s.months);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      addEntry(childId, { date: ds, weightKg: s.w, heightCm: s.h, headCm: s.head, notes: "" }, false);
    });
    persist();
  }

  function persist(){ U.saveState(S.state); }

  function getActiveChild(){ return S.state.children.find(c => c.id === S.state.activeChildId) || null; }

  // Child management
  function addChild(name, birthdate){
    const id = U.uid();
    S.state.children.push({ id, name, birthdate, entries: [] });
    S.state.activeChildId = id;
    persist();
  }

  function renameChild(id, name){
    const c = S.state.children.find(x => x.id === id); if (!c) return;
    c.name = name; persist();
  }

  function setBirthdate(id, birthdate){ const c = S.state.children.find(x => x.id === id); if (!c) return; c.birthdate = birthdate; persist(); }

  function deleteChild(id){
    S.state.children = S.state.children.filter(c => c.id !== id);
    if (!S.state.children.length) {
      const newState = window.App.defaultState();
      S.state = newState;
    } else if (!S.state.children.find(c => c.id === S.state.activeChildId)) {
      S.state.activeChildId = S.state.children[0].id;
    }
    persist();
  }

  // Entry management
  function addEntry(childId, entry, doPersist = true){
    const c = S.state.children.find(x => x.id === childId); if (!c) return;
    const e = {
      id: U.uid(),
      date: entry.date,
      weightKg: U.pos(entry.weightKg) ? Number(entry.weightKg) : NaN,
      heightCm: U.pos(entry.heightCm) ? Number(entry.heightCm) : NaN,
      headCm: U.pos(entry.headCm) ? Number(entry.headCm) : NaN,
      notes: entry.notes || ""
    };
    c.entries.push(e);
    c.entries.sort((a,b) => new Date(a.date) - new Date(b.date));
    if (doPersist) persist();
  }

  function updateEntry(childId, entryId, patch){
    const c = S.state.children.find(x => x.id === childId); if (!c) return;
    const e = c.entries.find(x => x.id === entryId); if (!e) return;
    Object.assign(e, patch);
    c.entries.sort((a,b) => new Date(a.date) - new Date(b.date));
    persist();
  }

  function deleteEntry(childId, entryId){
    const c = S.state.children.find(x => x.id === childId); if (!c) return;
    c.entries = c.entries.filter(e => e.id !== entryId);
    persist();
  }

  // Rendering
  function renderChildChips(){
    const wrap = $("#child-chips").empty();
    S.state.children.forEach(c => {
      const btn = $(`<button class="pill" data-id="${c.id}" aria-pressed="${S.state.activeChildId===c.id}">${c.name}</button>`);
      if (S.state.activeChildId === c.id) btn.addClass("active");
      wrap.append(btn);
    });
  }

  function summaryFromEntries(c){
    if (!c || !c.entries.length) return { weight: "—", height: "—", bmi: "—" };
    const last = c.entries[c.entries.length - 1];
    let weight = last.weightKg;
    let height = last.heightCm;
    if (S.state.unitSystem === "imperial") {
      weight = U.pos(weight) ? U.Units.kgToLb(weight) : NaN;
      height = U.pos(height) ? U.Units.cmToIn(height) : NaN;
    }
    const weightStr = U.pos(weight) ? (S.state.unitSystem === "metric" ? `${weight.toFixed(2)} kg` : `${weight.toFixed(1)} lb`) : "—";
    const heightStr = U.pos(height) ? (S.state.unitSystem === "metric" ? `${height.toFixed(1)} cm` : `${height.toFixed(1)} in`) : "—";
    const bmiStr = U.pos(last.weightKg) && U.pos(last.heightCm) ? U.calcBmi(last.weightKg, last.heightCm).toFixed(1) : "—";
    return { weight: weightStr, height: heightStr, bmi: bmiStr };
  }

  function renderHighlights(){
    const c = getActiveChild();
    const s = summaryFromEntries(c);
    $("#stat-weight").text(s.weight);
    $("#stat-height").text(s.height);
    $("#stat-bmi").text(s.bmi);
  }

  function renderFormUnits(){
    const unit = S.state.unitSystem;
    $("#weight-unit").text(unit === "metric" ? "kg" : "lb");
    $("#height-unit, #head-unit").text(unit === "metric" ? "cm" : "in");
  }

  function renderEntries(){
    const c = getActiveChild();
    const tbody = $("#entries").empty();
    if (!c) return;
    $("#entries-count").text(`${c.entries.length} entr${c.entries.length===1?"y":"ies"}`);
    if (!c.entries.length) {
      tbody.append(`<tr><td class="py-3 text-slate-500" colspan="8">No entries yet. Add your first measurement above.</td></tr>`);
      return;
    }
    c.entries.forEach(e => {
      const bmi = U.calcBmi(e.weightKg, e.heightCm);
      let w = e.weightKg, h = e.heightCm, head = e.headCm;
      if (S.state.unitSystem === "imperial") {
        w = U.pos(w) ? U.Units.kgToLb(w) : NaN;
        h = U.pos(h) ? U.Units.cmToIn(h) : NaN;
        head = U.pos(head) ? U.Units.cmToIn(head) : NaN;
      }
      const wStr = U.pos(w) ? (S.state.unitSystem === "metric" ? `${w.toFixed(2)} kg` : `${w.toFixed(1)} lb`) : "—";
      const hStr = U.pos(h) ? (S.state.unitSystem === "metric" ? `${h.toFixed(1)} cm` : `${h.toFixed(1)} in`) : "—";
      const headStr = U.pos(head) ? (S.state.unitSystem === "metric" ? `${head.toFixed(1)} cm` : `${head.toFixed(1)} in`) : "—";
      const bmiStr = isFinite(bmi) ? bmi.toFixed(1) : "—";
      const tr = $(`
        <tr>
          <td class="py-3 pr-4">${U.formatDateNice(e.date)}</td>
          <td class="py-3 pr-4 text-slate-500">${U.ageNice(e.date, c.birthdate)}</td>
          <td class="py-3 pr-4">${wStr}</td>
          <td class="py-3 pr-4">${hStr}</td>
          <td class="py-3 pr-4">${headStr}</td>
          <td class="py-3 pr-4">${bmiStr}</td>
          <td class="py-3 pr-4 max-w-[220px] whitespace-normal">${e.notes ? $('<div/>').text(e.notes).html() : ""}</td>
          <td class="py-3 pr-4">
            <div class="flex items-center gap-2">
              <button class="btn-ghost text-xs edit-entry" data-id="${e.id}">Edit</button>
              <button class="btn-ghost text-xs text-rose-600 delete-entry" data-id="${e.id}">Delete</button>
            </div>
          </td>
        </tr>`);
      tbody.append(tr);
    });
  }

  // Chart rendering
  function getMetricSeries(c){
    const data = c.entries.map(e => ({
      t: new Date(e.date + "T00:00:00").getTime(),
      months: U.monthsBetween(e.date, c.birthdate),
      w: e.weightKg,
      h: e.heightCm,
      head: e.headCm,
      bmi: U.calcBmi(e.weightKg, e.heightCm)
    })).filter(d => {
      if (S.chartMetric === "weight") return U.pos(d.w);
      if (S.chartMetric === "height") return U.pos(d.h);
      if (S.chartMetric === "head") return U.pos(d.head);
      if (S.chartMetric === "bmi") return isFinite(d.bmi);
      return false;
    });
    const unit = S.state.unitSystem;
    return data.map(d => {
      let v = 0;
      if (S.chartMetric === "weight") v = unit === "metric" ? d.w : U.Units.kgToLb(d.w);
      if (S.chartMetric === "height") v = unit === "metric" ? d.h : U.Units.cmToIn(d.h);
      if (S.chartMetric === "head") v = unit === "metric" ? d.head : U.Units.cmToIn(d.head);
      if (S.chartMetric === "bmi") v = d.bmi;
      return { t: d.t, months: d.months, v };
    });
  }

  function drawChart(){
    const c = getActiveChild();
    const canvas = document.getElementById("chart");
    const tooltip = $("#chart-tooltip");
    if (!canvas || typeof canvas.getContext !== "function") { tooltip.addClass("hidden"); return; }
    const ctx = canvas.getContext("2d");
    // Resize with device pixel ratio
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!c || !c.entries.length) { tooltip.addClass("hidden"); return; }
    const series = getMetricSeries(c);
    if (!series.length) { tooltip.addClass("hidden"); return; }

    const padding = { l: 42, r: 14, t: 12, b: 28 };
    const W = rect.width - padding.l - padding.r;
    const H = rect.height - padding.t - padding.b;

    const xs = series.map(d => d.months);
    const ys = series.map(d => d.v);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    const yPad = (maxY - minY) * 0.1 || 1;

    function xScale(x){
      if (maxX === minX) return padding.l + W/2;
      return padding.l + (x - minX) / (maxX - minX) * W;
    }
    function yScale(y){
      if (maxY === minY) return padding.t + H/2;
      return padding.t + (1 - (y - minY + yPad) / ((maxY - minY) + 2*yPad)) * H;
    }

    // Grid
    ctx.strokeStyle = "rgba(15,23,42,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0;i<=4;i++){
      const y = padding.t + i*(H/4);
      ctx.moveTo(padding.l, y); ctx.lineTo(padding.l+W, y);
    }
    ctx.stroke();

    // Axes labels
    ctx.fillStyle = "#64748b"; // slate-500
    ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    const unitLabel = (function(){
      if (S.chartMetric === "weight") return S.state.unitSystem === "metric" ? "kg" : "lb";
      if (S.chartMetric === "height" || S.chartMetric === "head") return S.state.unitSystem === "metric" ? "cm" : "in";
      return "BMI";
    })();
    ctx.fillText(`Age (months)`, padding.l, rect.height - 6);
    const yTitle = `${S.chartMetric.charAt(0).toUpperCase()}${S.chartMetric.slice(1)} (${unitLabel})`;
    ctx.save(); ctx.translate(10, padding.t + H/2); ctx.rotate(-Math.PI/2);
    ctx.fillText(yTitle, 0, 0); ctx.restore();

    // Line
    const color = S.chartMetric === "weight" ? "#1f62ff" : (S.chartMetric === "height" ? "#ff7b54" : (S.chartMetric === "head" ? "#f5b800" : "#0ea5e9"));
    ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    series.forEach((d,i)=>{ const x = xScale(d.months), y = yScale(d.v); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();

    // Points
    ctx.fillStyle = color;
    series.forEach(d=>{ const x = xScale(d.months), y = yScale(d.v); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });

    // Hover interaction
    $(canvas).off("mousemove mouseleave");
    $(canvas).on("mousemove", function(evt){
      const rect2 = canvas.getBoundingClientRect();
      const mx = evt.clientX - rect2.left;
      const my = evt.clientY - rect2.top;
      // Find nearest in screen coords
      let ni = -1; let nd = 1e9; let nx=0, ny=0;
      series.forEach((d,i)=>{
        const x = xScale(d.months), y = yScale(d.v);
        const dx = x - mx; const dy = y - my; const dist = Math.hypot(dx,dy);
        if (dist < nd) { nd = dist; ni = i; nx = x; ny = y; }
      });
      if (ni >= 0 && nd < 40) {
        const d = series[ni];
        const unit = unitLabel;
        tooltip.removeClass("hidden").css({ left: Math.min(rect2.width - 120, Math.max(8, nx + 12)), top: Math.max(8, ny - 10) });
        tooltip.html(`${d.months} mo • ${d.v.toFixed(2)} ${unit}`);
      } else tooltip.addClass("hidden");
    }).on("mouseleave", function(){ tooltip.addClass("hidden"); });
  }

  // Modal helpers
  function openModal(contentHtml){
    const root = $("#modal-root").empty().removeClass("hidden");
    const overlay = $(`<div class="modal-overlay" role="dialog" aria-modal="true"></div>`);
    const modal = $(`<div class="modal"></div>`).append($(`<div class="p-5">${contentHtml}<\/div>`));
    overlay.append(modal); root.append(overlay);
    // Animate
    modal.addClass("modal-enter");
    setTimeout(()=>{ modal.addClass("modal-enter-active"); }, 10);

    overlay.on("click", function(e){ if (e.target === this) closeModal(); });
    $(document).on("keydown.modal", function(e){ if (e.key === "Escape") closeModal(); });
  }
  function closeModal(){
    const root = $("#modal-root");
    const modal = root.find(".modal");
    modal.removeClass("modal-enter-active").addClass("modal-leave");
    setTimeout(()=>{ root.addClass("hidden").empty(); $(document).off("keydown.modal"); }, 180);
  }

  // Export/Import
  function doExport(){
    // Build external schema payload
    const payload = {
      version: 1,
      units: S.state.unitSystem === "imperial" ? "imperial" : "metric",
      children: (S.state.children || []).map(c => ({
        id: c.id,
        name: c.name,
        birthdate: c.birthdate,
        sex: typeof c.sex !== "undefined" ? c.sex : null,
        color: typeof c.color !== "undefined" ? c.color : null,
        measurements: (c.entries || []).map(e => ({
          id: e.id,
          date: e.date,
          weightKg: Number.isFinite(e.weightKg) ? Number(e.weightKg) : null,
          heightCm: Number.isFinite(e.heightCm) ? Number(e.heightCm) : null,
          headCm: Number.isFinite(e.headCm) ? Number(e.headCm) : null,
          notes: e.notes || ""
        }))
      })),
      selectedChildId: S.state.activeChildId || null
    };

    const json = JSON.stringify(payload, null, 2);
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bloom-export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      // Fallback: show modal with JSON to copy
      openModal(`
        <div class="flex items-start justify-between gap-3 mb-3">
          <h3 class="font-semibold">Export data</h3>
          <button class="icon-btn" id="modal-close" aria-label="Close">✕</button>
        </div>
        <p class="text-sm text-slate-600 mb-3">Copy the JSON below and save it somewhere safe.</p>
        <textarea class="input !h-48" readonly>${$('<div/>').text(json).html()}</textarea>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button class="btn-primary" id="copy-json">Copy</button>
        </div>
      `);
      $("#modal-close").on("click", closeModal);
      $("#copy-json").on("click", function(){
        const ta = $("textarea").get(0);
        if (ta) { ta.select(); document.execCommand("copy"); }
      });
    }
  }

  function doImport(){
    openModal(`
      <div class="flex items-start justify-between gap-3 mb-3">
        <h3 class="font-semibold">Import data</h3>
        <button class="icon-btn" id="modal-close" aria-label="Close">✕</button>
      </div>
      <p class="text-sm text-slate-600 mb-3">Paste your exported JSON below. This will replace your current data.</p>
      <textarea class="input !h-48" placeholder="{ ... }"></textarea>
      <div class="mt-4 flex items-center justify-between gap-2">
        <button class="btn-ghost text-rose-600" id="wipe">Erase everything</button>
        <div class="flex items-center gap-2">
          <button class="btn-secondary" id="cancel">Cancel</button>
          <button class="btn-primary" id="confirm">Import</button>
        </div>
      </div>
    `);
    $("#modal-close, #cancel").on("click", closeModal);
    $("#wipe").on("click", function(){
      if (confirm("Erase all data? This cannot be undone.")) {
        S.state = window.App.defaultState();
        U.saveState(S.state);
        closeModal();
        window.App.render();
      }
    });
    $("#confirm").on("click", function(){
      const raw = $("textarea").val();
      const parsed = U.safeParse(raw, null);
      if (!parsed || !Array.isArray(parsed.children)) {
        alert("Invalid JSON"); return;
      }
      // Normalize external schema (versioned) into internal state
      const ns = { unitSystem: parsed.units === "imperial" ? "imperial" : "metric", activeChildId: parsed.selectedChildId || parsed.activeChildId || null, children: [] };
      ns.children = (parsed.children || []).map(ch => {
        const src = Array.isArray(ch.measurements) ? ch.measurements : (Array.isArray(ch.entries) ? ch.entries : []);
        const child = {
          id: ch.id || U.uid(),
          name: ch.name || "Child",
          birthdate: ch.birthdate || U.todayStr(),
          entries: (src || []).map(m => ({
            id: m.id || U.uid(),
            date: m.date || U.todayStr(),
            weightKg: Number.isFinite(m.weightKg) ? Number(m.weightKg) : NaN,
            heightCm: Number.isFinite(m.heightCm) ? Number(m.heightCm) : NaN,
            headCm: Number.isFinite(m.headCm) ? Number(m.headCm) : NaN,
            notes: m.notes || ""
          })).sort((a,b)=> new Date(a.date) - new Date(b.date))
        };
        if (typeof ch.sex !== "undefined") child.sex = ch.sex;
        if (typeof ch.color !== "undefined") child.color = ch.color;
        return child;
      });
      if (!ns.children.length) { alert("No children found in JSON"); return; }
      if (!ns.activeChildId || !ns.children.find(c => c.id === ns.activeChildId)) {
        ns.activeChildId = ns.children[0].id;
      }
      S.state = ns; U.saveState(S.state); closeModal(); window.App.render();
    });
  }

  // Form handling
  function bindForm(){
    const unit = S.state.unitSystem;
    $("#date").val(U.todayStr());
    renderFormUnits();
    $("#toggle-form").off("click").on("click", function(){
      const form = $("#measurement-form");
      if (form.is(":visible")) { form.slideUp(160); $(this).text("Show").attr("aria-expanded", "false"); }
      else { form.slideDown(160); $(this).text("Hide").attr("aria-expanded", "true"); }
    });
    $("#measurement-form").off("submit").on("submit", function(e){
      e.preventDefault();
      const c = getActiveChild(); if (!c) return;
      const date = String($("#date").val()||"");
      const w = U.parseNum($("#weight").val());
      const h = U.parseNum($("#height").val());
      const head = U.parseNum($("#head").val());
      const notes = String($("#notes").val()||"").trim();

      // Validate
      let ok = true;
      const future = U.isValidDateStr(date) ? new Date(date) > new Date() : true;
      if (!U.isValidDateStr(date) || future) { $("#date").siblings(".form-error").removeClass("hidden"); ok=false; } else $("#date").siblings(".form-error").addClass("hidden");
      if (!U.pos(w) && !U.pos(h) && !U.pos(head)) { // at least one
        $("#weight").siblings(".form-error").removeClass("hidden");
        $("#height").siblings(".form-error").removeClass("hidden");
        ok=false;
      } else {
        $("#weight").siblings(".form-error").addClass("hidden");
        $("#height").siblings(".form-error").addClass("hidden");
      }
      if (!ok) return;

      // Convert to metric for storage
      let weightKg = U.pos(w) ? w : NaN;
      let heightCm = U.pos(h) ? h : NaN;
      let headCm = U.pos(head) ? head : NaN;
      if (S.state.unitSystem === "imperial") {
        if (U.pos(w)) weightKg = U.Units.lbToKg(w);
        if (U.pos(h)) heightCm = U.Units.inToCm(h);
        if (U.pos(head)) headCm = U.Units.inToCm(head);
      }

      addEntry(c.id, { date, weightKg, heightCm, headCm, notes });
      persist();
      window.App.render();
      // Reset inputs except date
      $("#weight, #height, #head, #notes").val("");
    });
  }

  // Edit entry modal
  function openEditEntry(entryId){
    const c = getActiveChild(); if (!c) return;
    const e = c.entries.find(x => x.id === entryId); if (!e) return;
    // Prepare display values based on unit
    let w = e.weightKg, h = e.heightCm, head = e.headCm;
    if (S.state.unitSystem === "imperial") {
      if (U.pos(w)) w = U.Units.kgToLb(w);
      if (U.pos(h)) h = U.Units.cmToIn(h);
      if (U.pos(head)) head = U.Units.cmToIn(head);
    }
    openModal(`
      <div class="flex items-start justify-between gap-3 mb-3">
        <h3 class="font-semibold">Edit entry</h3>
        <button class="icon-btn" id="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="edit-date">Date</label>
          <input id="edit-date" type="date" class="input" value="${e.date}" />
        </div>
        <div>
          <label class="label">Weight (${S.state.unitSystem === 'metric' ? 'kg' : 'lb'})</label>
          <input id="edit-weight" type="number" class="input" step="0.01" value="${U.pos(w)?w.toFixed(2):''}" />
        </div>
        <div>
          <label class="label">Height (${S.state.unitSystem === 'metric' ? 'cm' : 'in'})</label>
          <input id="edit-height" type="number" class="input" step="0.1" value="${U.pos(h)?h.toFixed(1):''}" />
        </div>
        <div>
          <label class="label">Head (${S.state.unitSystem === 'metric' ? 'cm' : 'in'})</label>
          <input id="edit-head" type="number" class="input" step="0.1" value="${U.pos(head)?head.toFixed(1):''}" />
        </div>
        <div class="col-span-2">
          <label class="label">Notes</label>
          <input id="edit-notes" type="text" class="input" value="${$('<div/>').text(e.notes||'').html()}" />
        </div>
      </div>
      <div class="mt-4 flex items-center justify-end gap-2">
        <button class="btn-secondary" id="cancel">Cancel</button>
        <button class="btn-primary" id="save">Save changes</button>
      </div>
    `);
    $("#modal-close, #cancel").on("click", closeModal);
    $("#save").on("click", function(){
      const date = String($("#edit-date").val()||"");
      const w2 = U.parseNum($("#edit-weight").val());
      const h2 = U.parseNum($("#edit-height").val());
      const head2 = U.parseNum($("#edit-head").val());
      const notes = String($("#edit-notes").val()||"");

      if (!U.isValidDateStr(date)) { alert("Enter a valid date"); return; }
      let weightKg = U.pos(w2) ? w2 : NaN;
      let heightCm = U.pos(h2) ? h2 : NaN;
      let headCm = U.pos(head2) ? head2 : NaN;
      if (S.state.unitSystem === "imperial") {
        if (U.pos(w2)) weightKg = U.Units.lbToKg(w2);
        if (U.pos(h2)) heightCm = U.Units.inToCm(h2);
        if (U.pos(head2)) headCm = U.Units.inToCm(head2);
      }
      updateEntry(c.id, e.id, { date, weightKg, heightCm, headCm, notes });
      closeModal();
      window.App.render();
    });
  }

  // Child modal
  function openChildModal(){
    const c = getActiveChild();
    const isEditing = !!c;
    openModal(`
      <div class="flex items-start justify-between gap-3 mb-3">
        <h3 class="font-semibold">Manage child</h3>
        <button class="icon-btn" id="modal-close" aria-label="Close">✕</button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="label">Name</label>
          <input id="child-name" class="input" value="${c? $('<div/>').text(c.name).html() : ''}" placeholder="e.g. Olivia" />
        </div>
        <div>
          <label class="label">Birthdate</label>
          <input id="child-birth" type="date" class="input" value="${c?c.birthdate:''}" />
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between gap-2">
        <button class="btn-ghost text-rose-600 ${isEditing?'':'hidden'}" id="delete-child">Delete</button>
        <div class="flex items-center gap-2">
          <button class="btn-secondary" id="cancel">Cancel</button>
          <button class="btn-primary" id="save">${isEditing? 'Save' : 'Add child'}</button>
        </div>
      </div>
    `);
    $("#modal-close, #cancel").on("click", closeModal);
    $("#delete-child").on("click", function(){
      if (confirm("Delete this child and all entries?")) { deleteChild(c.id); closeModal(); window.App.render(); }
    });
    $("#save").on("click", function(){
      const name = String($("#child-name").val()||"").trim();
      const birth = String($("#child-birth").val()||"");
      if (!name || !U.isValidDateStr(birth)) { alert("Enter name and valid birthdate"); return; }
      if (isEditing) { renameChild(c.id, name); setBirthdate(c.id, birth); }
      else { addChild(name, birth); }
      closeModal();
      window.App.render();
    });
  }

  // Event bindings for main UI
  function bindEvents(){
    // Unit switches
    $("[data-unit]").off("click").on("click", function(){
      const unit = $(this).data("unit");
      S.state.unitSystem = unit;
      $("[data-unit]").removeClass("active");
      $(this).addClass("active");
      persist();
      renderFormUnits();
      window.App.render();
    });

    // Metric pills default state handled in render()
    // Chart metric pills
    $("[data-metric]").off("click").on("click", function(){
      S.chartMetric = $(this).data("metric");
      $("[data-metric]").removeClass("active");
      $(this).addClass("active");
      drawChart();
    });

    // Child chips
    $("#child-chips").off("click").on("click", ".pill", function(){
      const id = $(this).data("id");
      S.state.activeChildId = id; persist(); window.App.render();
    });

    // Add child
    $("#btn-add-child").off("click").on("click", function(){ openChildModal(); });

    // Export/Import
    $("#btn-export").off("click").on("click", doExport);
    $("#btn-import").off("click").on("click", doImport);

    // Edit/Delete entry
    $("#entries").off("click").on("click", ".edit-entry", function(){ openEditEntry($(this).data("id")); })
                               .on("click", ".delete-entry", function(){ const c = getActiveChild(); if (!c) return; const id = $(this).data("id"); if (confirm("Delete this entry?")) { deleteEntry(c.id, id); window.App.render(); } });

    // Redraw on resize
    $(window).off("resize.chart").on("resize.chart", function(){ drawChart(); });
  }

  // Public API
  window.App.init = function(){
    initState();
  };

  window.App.render = function(){
    // Unit pills visuals
    $("[data-unit]").removeClass("active");
    $(`[data-unit='${S.state.unitSystem}']`).addClass("active");

    renderChildChips();
    renderHighlights();
    bindForm();
    renderEntries();
    bindEvents();
    drawChart();
  };

})();
