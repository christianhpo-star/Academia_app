/* Shared interpretation of an executed strength set. A zero external load is
 * meaningful only for these reviewed bodyweight movements; it never implies
 * execution when repetitions are missing, or when a different ID is supplied. */
(function installTrainingSets(root) {
  'use strict';
  const bodyweightIds = new Set(['abdominal-solo', 'abdominal-inverso', 'abdominal-bicicleta', 'elevacao-joelhos-suspenso', 'dead-bug', 'extensao-lombar-45']);
  const idFor = value => typeof value === 'string' ? value : value?.id;
  const numeric = value => (typeof value === 'number' ||
    (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
  const allowsZero = idOrEntry => bodyweightIds.has(idFor(idOrEntry));
  function validLoad(value, idOrEntry) {
    if (!numeric(value)) return false;
    const load = Number(value);
    return load <= 1500 && (load > 0 || (load === 0 && allowsZero(idOrEntry)));
  }
  function performed(set, idOrEntry) {
    if (!set || typeof set !== 'object' || Array.isArray(set) ||
        !validLoad(set.load, idOrEntry) || !numeric(set.reps)) return false;
    const reps = Number(set.reps);
    return Number.isInteger(reps) && reps >= 1 && reps <= 100;
  }
  function workSets(entry) {
    return (Array.isArray(entry?.sets) ? entry.sets : [])
      .filter(set => performed(set, entry) && !set.warmup);
  }
  const api = Object.freeze({allowsZero, validLoad, performed, workSets});
  root.ForjaTrainingSets = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
