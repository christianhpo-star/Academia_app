/* FORJA nutrition contract v1. No user meals or prescribed targets in source. */
(function installNutrition(root) {
  'use strict';

  const VERSION = 1;
  const NUTRIENTS = ['energyKcal', 'proteinG', 'carbsG', 'fatG'];
  const MEALS = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];
  const UNITS = ['g', 'ml', 'unit', 'spoon', 'ladle', 'portion'];
  const PREPARATIONS = ['raw', 'cooked', 'other'];
  const MODES = ['simple', 'detailed'];
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const textOk = (value, max = 120, min = 1) =>
    typeof value === 'string' && value.trim().length >= min && value.length <= max;
  const idOk = value => typeof value === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(value);
  const numberOk = (value, min, max) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

  function dateOk(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const parsed = new Date(day + 'T12:00:00Z');
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
  }

  const optionalString = (value, max) =>
    value === undefined || value === null || (typeof value === 'string' && value.length <= max);
  const optionalNumber = (value, min, max) =>
    value === undefined || value === null || numberOk(value, min, max);
  const uniqueIds = values => new Set(values.map(value => value.id)).size === values.length;
  const archive = () => ({
    schemaVersion: VERSION, foods: [], mealTemplates: [], entries: [],
    settings: { mode: 'simple' },
  });

  function nutrientsOk(value) {
    if (!isObject(value)) return false;
    return NUTRIENTS.every(key =>
      Object.hasOwn(value, key) &&
      (value[key] === null || numberOk(value[key], 0, key === 'energyKcal' ? 1200 : 100))
    );
  }

  function sourceOk(value) {
    return isObject(value) && textOk(value.name, 80) &&
      optionalString(value.reference, 200) && optionalString(value.license, 100);
  }

  function validFood(food) {
    return isObject(food) && idOk(food.id) && textOk(food.name) &&
      (food.preparation === null || food.preparation === undefined ||
        PREPARATIONS.includes(food.preparation)) &&
      nutrientsOk(food.nutrientsPer100g) && sourceOk(food.source);
  }

  function validPortion(item, withSnapshot) {
    if (!isObject(item) || !idOk(item.id) ||
        !numberOk(item.quantity, 0.001, 10000) || !UNITS.includes(item.unit) ||
        !optionalNumber(item.grams, 0.001, 10000)) return false;

    if (item.nutrientsPerServing !== undefined && !nutrientsOk(item.nutrientsPerServing)) return false;
    if (!withSnapshot) return idOk(item.foodId);
    if (!textOk(item.label) ||
        !(item.foodId === undefined || item.foodId === null || idOk(item.foodId)) ||
        !nutrientsOk(item.nutrientsPer100g) ||
        !(item.source === null || sourceOk(item.source))) return false;

    // A numeric nutrient without a traceable source must not enter calculations.
    return item.source !== null ||
      NUTRIENTS.every(key => item.nutrientsPer100g[key] === null);
  }

  function validTemplate(template) {
    return isObject(template) && idOk(template.id) && textOk(template.name) &&
      Array.isArray(template.items) && template.items.length > 0 &&
      template.items.length <= 30 && uniqueIds(template.items) &&
      template.items.every(item => validPortion(item, false));
  }

  function validEntry(entry) {
    return isObject(entry) && idOk(entry.id) && dateOk(entry.date) &&
      MEALS.includes(entry.mealType) &&
      optionalString(entry.notes, 500) &&
      (entry.time === null || entry.time === undefined ||
        (typeof entry.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time))) &&
      Array.isArray(entry.items) && entry.items.length > 0 &&
      entry.items.length <= 30 && uniqueIds(entry.items) &&
      entry.items.every(item => validPortion(item, true));
  }

  function validArchive(value) {
    if (value === undefined) return true; // Pre-nutrition FORJA v1 backups.
    return isObject(value) && value.schemaVersion === VERSION &&
      isObject(value.settings) && MODES.includes(value.settings.mode) &&
      Array.isArray(value.foods) && value.foods.length <= 500 &&
      Array.isArray(value.mealTemplates) && value.mealTemplates.length <= 300 &&
      Array.isArray(value.entries) && value.entries.length <= 10000 &&
      uniqueIds(value.foods) && uniqueIds(value.mealTemplates) && uniqueIds(value.entries) &&
      value.foods.every(validFood) &&
      value.mealTemplates.every(validTemplate) &&
      value.entries.every(validEntry);
  }

  function ensureArchive(state) {
    if (!isObject(state)) throw new Error('Estado incompatível.');
    if (state.nutrition !== undefined) return false;
    state.nutrition = archive();
    return true;
  }

  function merge(current, incoming) {
    if (!validArchive(current) || !validArchive(incoming))
      throw new Error('Histórico alimentar inválido.');
    const a = current === undefined ? archive() : current;
    const b = incoming === undefined ? archive() : incoming;
    const union = (own, restored) => {
      const result = own.slice(), ids = new Set(own.map(row => row.id));
      for (const row of restored) {
        if (!ids.has(row.id)) { result.push(row); ids.add(row.id); }
      }
      return result;
    };
    const merged = {
      schemaVersion: VERSION,
      foods: union(a.foods, b.foods),
      mealTemplates: union(a.mealTemplates, b.mealTemplates),
      entries: union(a.entries, b.entries),
      settings: { ...b.settings, ...a.settings },
    };
    if (!validArchive(merged)) throw new Error('Mesclagem alimentar inválida.');
    return merged;
  }

  function observedTotals(entries, date) {
    if (!dateOk(date) || !Array.isArray(entries) || !entries.every(validEntry))
      throw new Error('Período ou refeições inválidos.');
    const daily = entries.filter(entry => entry.date === date);
    const items = daily.flatMap(entry => entry.items);
    const totals = Object.fromEntries(NUTRIENTS.map(key => [key, null]));
    const known = Object.fromEntries(NUTRIENTS.map(key => [key, 0]));
    if (items.length) {
      for (const key of NUTRIENTS) {
        let total = 0, complete = true;
        for (const item of items) {
          // Verified per-package facts work for liquids without assuming millilitres equal grams.
          if (item.nutrientsPerServing) {
            const nutrient = item.nutrientsPerServing[key];
            if (nutrient === null || item.unit !== 'portion') { complete = false; break; }
            total += nutrient * item.quantity;
            continue;
          }
          const grams = item.unit === 'g' ? item.quantity : item.grams;
          const nutrient = item.nutrientsPer100g[key];
          if (grams == null || nutrient === null) { complete = false; break; }
          total += nutrient * grams / 100;
        }
        if (complete) {
          totals[key] = Math.round((total + Number.EPSILON) * 100) / 100;
          known[key] = items.length;
        }
      }
    }
    // Observed totals never assert that every meal of the day was recorded.
    return { date, mealsRecorded: daily.length, itemsRecorded: items.length,
      observedOnly: true, totals, knownItems: known };
  }

  const api = {
    VERSION, NUTRIENTS, MEALS, UNITS, archive, dateOk, nutrientsOk, validFood,
    validEntry, validTemplate, validArchive, ensureArchive, merge, observedTotals,
  };
  root.ForjaNutrition = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
