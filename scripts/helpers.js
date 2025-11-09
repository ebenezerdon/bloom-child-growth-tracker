(function(){
  "use strict";
  // Global namespace
  window.App = window.App || {};

  // Storage keys and utilities
  const STORAGE_KEY = "bloom.tracker.v1";

  function safeParse(json, fallback){
    try { return JSON.parse(json); } catch (e) { return fallback; }
  }

  function loadState(){
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw, null);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  }

  function saveState(state){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch(e){ console.error("Save failed", e); }
  }

  // ID generator
  function uid(){ return "id-" + Math.random().toString(36).slice(2, 10); }

  // Date helpers
  function todayStr(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isValidDateStr(s){
    if (!s) return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }

  function formatDateNice(s){
    if (!isValidDateStr(s)) return "";
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  // Unit conversion
  const Units = {
    kgToLb: kg => kg * 2.2046226218,
    lbToKg: lb => lb / 2.2046226218,
    cmToIn: cm => cm / 2.54,
    inToCm: inch => inch * 2.54,
    mFromCm: cm => cm / 100,
  };

  // Validation
  function parseNum(v){ const n = Number(v); return isFinite(n) ? n : NaN; }
  function pos(v){ return isFinite(v) && v > 0; }

  // BMI
  function calcBmi(weightKg, heightCm){
    if (!pos(weightKg) || !pos(heightCm)) return NaN;
    const m = Units.mFromCm(heightCm);
    return weightKg / (m*m);
  }

  // Age helpers
  function monthsBetween(dateStr, birthStr){
    if (!isValidDateStr(dateStr) || !isValidDateStr(birthStr)) return 0;
    const d = new Date(dateStr + "T00:00:00");
    const b = new Date(birthStr + "T00:00:00");
    const years = d.getFullYear() - b.getFullYear();
    const months = d.getMonth() - b.getMonth();
    const total = years * 12 + months - (d.getDate() < b.getDate() ? 1 : 0);
    return Math.max(0, total);
  }

  function ageNice(dateStr, birthStr){
    const m = monthsBetween(dateStr, birthStr);
    if (m < 12) return `${m} mo`;
    const y = Math.floor(m/12); const rm = m % 12;
    return rm ? `${y}y ${rm}m` : `${y}y`;
  }

  // Public API on App
  window.App.utils = {
    safeParse, loadState, saveState, uid, todayStr, isValidDateStr, formatDateNice,
    clamp, Units, parseNum, pos, calcBmi, monthsBetween, ageNice
  };

  // Default state factory
  window.App.defaultState = function(){
    return {
      unitSystem: "metric", // metric or imperial
      activeChildId: null,
      children: [] // {id, name, birthdate, entries: [{id, date, weightKg, heightCm, headCm, notes}]}
    };
  };

})();