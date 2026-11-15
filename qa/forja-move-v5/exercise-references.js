/* FORJA MOVE v5: curated official external 3D references.
 * Media copyright remains with Fitlapse; we DO NOT download, host, copy,
 * screenshot, hotlink, iframe or proxy its video/image assets.
 * These are normal links to the publisher's own exercise pages.
 */
(function installExerciseReferences(root) {
  'use strict';
  const pages = Object.freeze({
  "remada-baixa": "seated-cable-row",
  "rosca-w": "ez-bar-curl",
  "rosca-martelo": "dumbbell-hammer-curl",
  "supino-halteres": "dumbbell-bench-press",
  "supino-barra": "barbell-bench-press",
  "supino-inclinado": "dumbbell-incline-bench-press",
  "voador": "pec-fly",
  "elevacao-lateral": "dumbbell-lateral-raise",
  "triceps-corda": "cable-rope-triceps-pushdown",
  "agachamento-hack": "hack-squat",
  "bulgaro": "dumbbell-bulgarian-split-squat",
  "leg-press": "leg-press",
  "extensora": "leg-extension",
  "extensora-d": "leg-extension",
  "flexora-c": "prone-leg-curl",
  "panturrilha-leg": "leg-press-calves",
  "abdutora": "hip-abduction",
  "remada-unilateral-halter": "single-arm-dumbbell-row",
  "remada-articulada": "seated-diverging-row",
  "pullover-polia": "cable-straight-arm-pulldown",
  "crucifixo-cabo": "cable-chest-fly",
  "supino-canadense": "barbell-decline-bench-press",
  "crossover-polia": "high-to-low-cable-chest-fly",
  "triceps-frances": "cable-overhead-triceps-extension",
  "cadeira-adutora": "hip-adduction",
  "panturrilha-em-pe": "machine-standing-calf-raise",
  "flexora-sentada": "seated-leg-curl",
  "ponte-gluteo": "glute-bridge",
  "step-up-baixo": "step-up"
});
  const prefix = 'https://fitlapse.com/en/exercise/';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  function has(id) { return Object.prototype.hasOwnProperty.call(pages, id); }
  function get(id) {
    if (!has(id)) return null;
    const slug = pages[id];
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
    return Object.freeze({id, slug, url: prefix + slug + '/', provider:'Fitlapse', type:'external-reference', license:'link-only'});
  }
  function link(id, exerciseName = 'exercício') {
    const ref = get(id);
    if (!ref) return '';
    return '<a class="forja-ref3d-link" href="' + ref.url +
      '" target="_blank" rel="noopener noreferrer" ' +
      'aria-label="Abrir referência 3D de ' + esc(exerciseName) + ' no Fitlapse, em nova aba">' +
      '<span aria-hidden="true">◩</span> Ver referência 3D ' +
      '<span class="ref3d-arrow" aria-hidden="true">↗</span></a>';
  }
  root.ForjaExerciseReferences = Object.freeze({
    get, has, link, count:Object.keys(pages).length, provider:'Fitlapse'
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ForjaExerciseReferences;
})(typeof globalThis !== 'undefined' ? globalThis : this);
