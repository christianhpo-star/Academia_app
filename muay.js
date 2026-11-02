(function installMuay(root) {
  'use strict';
  const places = { casa: 'Em casa', academia: 'Na academia', outro: 'Outro local' };
  const kinds = { individual: 'Treino individual', aula: 'Aula de Muay Thai' };
  const units = { reps: 'repetições', min: 'minutos', rounds: 'rounds' };
  const fatigueLabels = { '': 'Não informado', normal: 'Normal', moderada: 'Moderada', alta: 'Alta' };
  const PRESETS = [
    { name: 'Polichinelos', unit: 'reps' },
    { name: 'Agachamento com salto', unit: 'reps' },
    { name: 'Afundos', unit: 'reps' },
    { name: 'Pular corda', unit: 'min' },
    { name: 'Sombra', unit: 'rounds' },
    { name: 'Técnica de golpes', unit: 'rounds' },
    { name: 'Saco de pancadas', unit: 'rounds' },
    { name: 'Manoplas', unit: 'rounds' },
    { name: 'Deslocamentos', unit: 'min' },
    { name: 'Mobilidade', unit: 'min' },
  ];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  const uid = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const integer = (n, min, max) => Number.isInteger(Number(n)) && Number(n) >= min && Number(n) <= max;
  const decimal = (n, min, max) => n !== '' && n !== null && n !== undefined &&
    Number.isFinite(Number(n)) && Number(n) >= min && Number(n) <= max;
  const optional = (n, min, max, int = false) =>
    n === '' || n == null || (int ? integer(n, min, max) : decimal(n, min, max));
  const numeric = n => n === '' || n == null ? null : Number(n);
  const dateOk = day => {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const time = Date.parse(day + 'T12:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === day;
  };
  const textOk = (v, max) => typeof v === 'string' && v.length <= max;
  const archive = () => ({ sessions: [], draft: null });
  const activity = (name = '', unit = 'reps') =>
    ({ id: uid('exercise'), name, quantity: '', unit, sets: '' });
  const draft = (day, place = 'casa') => ({
    day, place, kind: place === 'academia' ? 'aula' : 'individual',
    duration: '', intensity: '', fatigue: '', kneePain: '', notes: '',
    activities: [], editingId: null,
  });
  const validActivity = (value, complete = false) => !!value && typeof value === 'object' &&
    textOk(value.id, 100) && textOk(value.name, 100) &&
    (!complete || value.name.trim().length > 0) &&
    Object.hasOwn(units, value.unit) && optional(value.quantity, 0.1, 3000, value.unit !== 'min') &&
    optional(value.sets, 1, 30, true);
  const validDraft = value => !!value && typeof value === 'object' &&
    dateOk(value.day) && Object.hasOwn(places, value.place) && Object.hasOwn(kinds, value.kind) &&
    optional(value.duration, 1, 360, true) && optional(value.intensity, 1, 10, true) &&
    optional(value.kneePain, 0, 10, true) && Object.hasOwn(fatigueLabels, value.fatigue) &&
    textOk(value.notes, 2000) && Array.isArray(value.activities) && value.activities.length <= 30 &&
    value.activities.every(a => validActivity(a)) &&
    (value.editingId === null || textOk(value.editingId, 100));
  const validSession = value => validDraft({ ...value, editingId: null }) &&
    textOk(value.id, 100) && value.id.length > 0 &&
    typeof value.timestamp === 'string' && Number.isFinite(Date.parse(value.timestamp)) &&
    value.activities.length > 0 && value.activities.every(a => validActivity(a, true));
  const validArchive = value => !!value && typeof value === 'object' &&
    Array.isArray(value.sessions) && value.sessions.length <= 10000 &&
    value.sessions.every(validSession) &&
    (value.draft === null || validDraft(value.draft));
  // Only add the new field when loading an older FORJA backup; never invent sessions.
  function ensureArchive(state) {
    if (state.muay !== undefined) return false;
    state.muay = archive();
    return true;
  }
  function finishDraft(raw, today) {
    if (!validDraft(raw)) return { error: 'Há informações inválidas no formulário.' };
    if (raw.day > today) return { error: 'A data não pode estar no futuro.' };
    if (!raw.activities.length) return { error: 'Adicione ao menos um exercício realizado.' };
    if (raw.activities.some(a => !a.name.trim())) return { error: 'Preencha os nomes dos exercícios.' };
    const values = raw.activities.map(item => ({
      id: item.id, name: item.name.trim(), unit: item.unit,
      quantity: numeric(item.quantity), sets: numeric(item.sets),
    }));
    const session = {
      id: raw.editingId || uid('muay'),
      timestamp: new Date().toISOString(),
      day: raw.day, place: raw.place, kind: raw.kind,
      duration: numeric(raw.duration), intensity: numeric(raw.intensity),
      fatigue: raw.fatigue, kneePain: numeric(raw.kneePain),
      notes: raw.notes.trim().slice(0, 1000), activities: values,
    };
    if (!validSession(session)) return { error: 'Revise os volumes, a duração e a intensidade informados.' };
    return { session };
  }
  function draftFromSession(session) {
    return {
      ...session, editingId: session.id,
      duration: session.duration ?? '', intensity: session.intensity ?? '',
      kneePain: session.kneePain ?? '',
      activities: session.activities.map(a => ({
        ...a, quantity: a.quantity ?? '', sets: a.sets ?? '',
      })),
    };
  }
  const dateBR = day => dateOk(day) ? day.slice(8, 10) + '/' + day.slice(5, 7) + '/' + day.slice(0, 4) : 'Sem data';
  const select = (values, current) => Object.entries(values).map(([value, label]) =>
    '<option value="' + esc(value) + '"' + (String(current) === value ? ' selected' : '') + '>' + esc(label) + '</option>'
  ).join('');
  function volumeText(a) {
    const part = a.quantity == null || a.quantity === '' ? '' : String(a.quantity) + ' ' + units[a.unit];
    const series = a.sets == null || a.sets === '' ? '' : String(a.sets) + ' séries';
    return [series, part].filter(Boolean).join(' × ') || 'Volume não informado';
  }
  function sessionCard(s, showControls = false) {
    return '<article class="card muay-record">' +
      '<div class="card-row"><div><strong>' + esc(dateBR(s.day)) + ' · ' + esc(kinds[s.kind]) + '</strong>' +
      '<p>' + esc(places[s.place]) + (s.duration === null ? ' · duração não informada' : ' · ' + esc(s.duration) + ' min') +
      (s.intensity === null ? '' : ' · esforço ' + esc(s.intensity) + '/10') + '</p></div>' +
      '<span class="pill green">Muay Thai</span></div>' +
      '<ul class="mini-list muay-record-list">' + s.activities.map(a =>
        '<li><span>' + esc(a.name) + '</span><small>' + esc(volumeText(a)) + '</small></li>'
      ).join('') + '</ul>' +
      (s.fatigue ? '<p class="small muted">Fadiga: ' + esc(fatigueLabels[s.fatigue]) + '</p>' : '') +
      (s.kneePain == null ? '' : '<p class="small muted">Joelho após treino: ' + esc(s.kneePain) + '/10</p>') +
      (s.notes ? '<p class="small muted">Observações: ' + esc(s.notes) + '</p>' : '') +
      (showControls ? '<div class="btnrow mt-12"><button class="secondary small-button" data-action="muay-edit" data-id="' + esc(s.id) + '">Editar registro</button>' +
        '<button class="ghost small-button" data-action="muay-delete" data-id="' + esc(s.id) + '">Excluir</button></div>' : '') +
      '</article>';
  }
  function sortedSessions(sessions) {
    return [...sessions].sort((a, b) => b.day.localeCompare(a.day) || b.timestamp.localeCompare(a.timestamp));
  }
  function historySection(sessions) {
    return '<div class="section-row"><h2 class="section-title">Muay Thai</h2><small>' + sessions.length + ' registro(s)</small></div>' +
      (sessions.length ? sortedSessions(sessions).map(s => sessionCard(s, true)).join('') :
        '<div class="empty">Nenhum treino de Muay Thai registrado.</div>');
  }
  function renderEditor(d) {
    return '<section class="card"><div class="row-between"><h2 class="section-title">' +
      (d.editingId ? 'Editar Muay Thai' : 'Treino em andamento') + '</h2><span class="pill green">Rascunho automático</span></div>' +
      '<p class="small muted">Este rascunho é salvo no aparelho a cada edição e incluído no backup JSON.</p>' +
      '<div class="field-row mt-12"><div class="field"><label for="muay-day">Data</label>' +
      '<input id="muay-day" type="date" data-muay-field="day" value="' + esc(d.day) + '" /></div>' +
      '<div class="field"><label for="muay-place">Local</label><select id="muay-place" data-muay-field="place">' +
      select(places, d.place) + '</select></div></div>' +
      '<div class="field-row mt-12"><div class="field"><label for="muay-kind">Tipo</label><select id="muay-kind" data-muay-field="kind">' +
      select(kinds, d.kind) + '</select></div><div class="field"><label for="muay-duration">Duração (min, opcional)</label>' +
      '<input id="muay-duration" type="number" min="1" max="360" step="1" inputmode="numeric" placeholder="Ex.: 50" data-muay-field="duration" value="' + esc(d.duration) + '" /></div></div>' +
      '<div class="field-row mt-12"><div class="field"><label for="muay-intensity">Esforço percebido (0–10)</label>' +
      '<select id="muay-intensity" data-muay-field="intensity">' +
      select({ '': 'Não informado', 1:'1 · Muito leve', 2:'2', 3:'3', 4:'4', 5:'5 · Moderado', 6:'6', 7:'7', 8:'8', 9:'9', 10:'10 · Máximo' }, d.intensity) +
      '</select></div><div class="field"><label for="muay-fatigue">Fadiga das pernas</label>' +
      '<select id="muay-fatigue" data-muay-field="fatigue">' + select(fatigueLabels, d.fatigue) + '</select></div></div>' +
      '<div class="field mt-12"><label for="muay-knee">Desconforto no joelho após o treino (0–10, opcional)</label>' +
      '<select id="muay-knee" data-muay-field="kneePain">' +
      select({ '': 'Não informado', 0:'0 · Sem dor', 1:'1', 2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8', 9:'9', 10:'10 · Máximo' }, d.kneePain) +
      '</select></div></section>' +
      '<div class="section-row"><h2 class="section-title">Exercícios realizados</h2><small>' + d.activities.length + ' selecionado(s)</small></div>' +
      '<p class="small muted">Toque nos exercícios que fez. Séries, repetições e duração de cada um são opcionais; não serão presumidas.</p>' +
      '<div class="muay-presets" role="group" aria-label="Adicionar exercício realizado">' +
      PRESETS.map((p, i) => '<button type="button" class="secondary small-button" data-action="muay-preset" data-preset="' + i + '">+ ' + esc(p.name) + '</button>').join('') +
      '<button type="button" class="secondary small-button" data-action="muay-custom">+ Outro exercício</button></div>' +
      (d.activities.length ? d.activities.map((a, i) => '<section class="exercise-card muay-activity">' +
        '<div class="row-between"><h3>Exercício ' + (i + 1) + '</h3><button class="button-inline" data-action="muay-remove" data-id="' + esc(a.id) + '">Remover</button></div>' +
        '<div class="field mt-12"><label for="muay-name-' + esc(a.id) + '">Nome do exercício</label><input id="muay-name-' + esc(a.id) + '" data-muay-id="' + esc(a.id) + '" data-muay-prop="name" maxlength="100" value="' + esc(a.name) + '" placeholder="Ex.: sequência de chutes" /></div>' +
        '<div class="muay-volume mt-12"><div class="field"><label for="muay-sets-' + esc(a.id) + '">Séries (opcional)</label><input id="muay-sets-' + esc(a.id) + '" type="number" min="1" max="30" step="1" inputmode="numeric" data-muay-id="' + esc(a.id) + '" data-muay-prop="sets" value="' + esc(a.sets) + '" /></div>' +
        '<div class="field"><label for="muay-quantity-' + esc(a.id) + '">Quantidade (opcional)</label><input id="muay-quantity-' + esc(a.id) + '" type="number" min="0.1" max="3000" step="any" inputmode="decimal" data-muay-id="' + esc(a.id) + '" data-muay-prop="quantity" value="' + esc(a.quantity) + '" /></div>' +
        '<div class="field"><label for="muay-unit-' + esc(a.id) + '">Unidade</label><select id="muay-unit-' + esc(a.id) + '" data-muay-id="' + esc(a.id) + '" data-muay-prop="unit">' + select(units, a.unit) + '</select></div></div></section>').join('') :
        '<div class="empty mt-12">Adicione somente os exercícios que realmente realizou.</div>') +
      '<section class="card"><div class="field"><label for="muay-notes">Observações (opcional)</label>' +
      '<textarea id="muay-notes" data-muay-field="notes" maxlength="1000" placeholder="Ex.: aquecimento, sequências de golpes, recuperação, alterações na aula">' + esc(d.notes) + '</textarea></div>' +
      '<div class="btnrow mt-16"><button class="primary" data-action="muay-finish">Salvar treino</button>' +
      '<button class="ghost" data-action="muay-cancel">Descartar rascunho</button></div></section>';
  }
  function renderPage(muay, today) {
    const last = sortedSessions(muay.sessions).slice(0, 3);
    return '<p class="eyebrow">Diário de atividades</p><h1 class="page-title">Muay Thai</h1>' +
      '<p class="lead">Registre aulas e treinos feitos em casa. Eles não substituem nem concluem os blocos de musculação.</p>' +
      (muay.draft ? renderEditor(muay.draft) :
        '<section class="card"><h2 class="section-title">Como você treinou?</h2><p class="small muted">' +
        'Registre a sessão depois de realizá-la, sem criar treinos fictícios.</p>' +
        '<div class="muay-choices mt-12"><button class="primary" data-action="muay-start" data-place="casa">Treino em casa</button>' +
        '<button class="secondary" data-action="muay-start" data-place="academia">Aula na academia</button>' +
        '<button class="ghost" data-action="muay-start" data-place="outro">Outro local</button></div></section>') +
      '<div class="section-row"><h2 class="section-title">Últimos registros</h2><small>' + muay.sessions.length + ' no total</small></div>' +
      (last.length ? last.map(s => sessionCard(s)).join('') :
        '<div class="empty">Sem registros de Muay Thai. Seu primeiro treino ainda não foi salvo.</div>') +
      '<button class="secondary full" data-action="navigate" data-to="history">Ver histórico completo</button>';
  }
  root.AcademiaMuay = {
    PRESETS, archive, activity, draft, ensureArchive, validDraft, validSession,
    validArchive, finishDraft, draftFromSession, volumeText, sortedSessions,
    renderPage, historySection,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AcademiaMuay;
})(typeof globalThis !== 'undefined' ? globalThis : this);
