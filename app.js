(function () {
  'use strict';
  const DATA = window.AcademiaData;
  const E = window.AcademiaEngine;
  const M = window.AcademiaMuay;
  const CAL = window.ForjaCalendar;
  const F = window.ForjaFlex;
  const KEY = 'forja.academia.v1';
  const DRAFT_KEY = 'forja.academia.draft.v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fmt = E.formatWeight;
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateBR = date => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Sem data';
    const [y,m,d] = date.split('-'); return `${d}/${m}/${y}`;
  };
  const dayGap = (from, to) => {
    const parse = str => { const [y,m,d] = str.split('-').map(Number); return Date.UTC(y,m-1,d); };
    return Math.round((parse(to) - parse(from))/86400000);
  };
  const copy = obj => JSON.parse(JSON.stringify(obj));
  function initial() {
    return {
      version: 1,
      referenceDefaultsVersion: 1,
      settings: { startWeight: 88.3, targetWeight: 82, goalDate: '2027-01-14', fatigue: 'normal', kneePain: '' },
      weights: [{ id:'initial-2026-10-30', date:'2026-10-30', weight:88.3, initial:true }],
      sessions: [], exercises: copy(DATA.exercises), muay: M.archive(),
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return initial();
      const parsed = JSON.parse(raw);
      if (!validState(parsed)) throw new Error('Backup incompatível');
      const upgradedMuay = M.ensureArchive(parsed);
      if (!M.validArchive(parsed.muay)) throw new Error('Dados Muay Thai incompatíveis');
      const upgradedReferences = migrateReferences(parsed);
      if (upgradedMuay || upgradedReferences) {
        try { localStorage.setItem(KEY, JSON.stringify(parsed)); }
        catch (err) { console.warn('Não foi possível persistir as referências iniciais.', err); }
      }
      return parsed;
    } catch (err) { console.warn('Não foi possível ler os registros',err); return initial(); }
  }
  function validState(value) {
    return value && value.version === 1 && value.settings &&
      Number.isFinite(Number(value.settings.startWeight)) &&
      Number.isFinite(Number(value.settings.targetWeight)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.settings.goalDate || '') &&
      Array.isArray(value.weights) && value.weights.length <= 10000 &&
      value.weights.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') && Number(x.weight)>0 && Number(x.weight)<500) &&
      Array.isArray(value.sessions) && value.sessions.length <= 30000 &&
      value.sessions.every(s => typeof s.timestamp === 'string' && typeof s.planId === 'string' && Array.isArray(s.entries)) &&
      Array.isArray(value.exercises) && value.exercises.length <= 200 &&
      value.exercises.every(x => typeof x.id === 'string' && typeof x.name === 'string' && x.name.length < 120 &&
        ['A','B','C','D'].includes(x.group) && Number(x.sets)>=1 && Number(x.sets)<=12 && Number(x.low)>0 &&
        Number(x.high)>=Number(x.low) && Number(x.high)<=50 && Number(x.step)>0);
  }
  // Atualiza somente exercícios que ainda conservam a configuração original.
  // Histórico real, exercícios personalizados e rascunhos em andamento são preservados.
  function migrateReferences(value) {
    if (value.referenceDefaultsVersion >= 1) return false;
    const previous = {
      'supino-inclinado': {name:'Supino inclinado', sets:3, unit:'kg'},
      'voador': {name:'Voador (peck deck)', sets:3, unit:'kg'},
      'triceps-testa': {name:'Tríceps testa', sets:3, unit:'kg'},
    };
    for (const [id, old] of Object.entries(previous)) {
      const current = value.exercises.find(ex => ex.id === id);
      const template = DATA.exercises.find(ex => ex.id === id);
      if (!current || !template || !Array.isArray(template.example)) continue;
      const unchanged = current.name === old.name &&
        Number(current.sets) === old.sets && current.unit === old.unit;
      if (!unchanged) continue;
      current.name = template.name;
      current.sets = template.sets;
      current.unit = template.unit;
      if (!Array.isArray(current.example) || current.example.length === 0)
        current.example = copy(template.example);
    }
    value.referenceDefaultsVersion = 1;
    return true;
  }
  function loadDraft(exercises) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const record = JSON.parse(raw);
      const draft = record?.draft;
    F.ensureDraft(draft);
      if (record.version !== 1 || !draft || !DATA.rotation.includes(draft.planId) ||
          !draft.entries || typeof draft.entries !== 'object' || Array.isArray(draft.entries) ||
          !Object.entries(draft.entries).every(([key, en]) => en && en.id === key &&
            exercises.some(ex => ex.id === key) && Array.isArray(en.sets) && en.sets.length > 0 &&
            en.sets.length <= 12 && en.sets.every(set => set && typeof set === 'object')))
        throw new Error('Rascunho inválido');
      return {draft, savedAt:record.savedAt};
    } catch (err) {
      console.warn('Rascunho não pôde ser recuperado; o histórico salvo foi preservado.', err);
      return null;
    }
  }
  let state = load();
  const recoveredDraft = loadDraft(state.exercises);
  // Return directly to the in-progress Muay form after closing the browser.
  // Prefer a separately recovered strength draft when both exist.
  let muayMode = !recoveredDraft && Boolean(state.muay.draft);
  const ui = {
    tab: (recoveredDraft || state.muay.draft) ? 'plans' : 'home',
    plan: recoveredDraft?.draft.planId || 'A', editor:null,
    draft: recoveredDraft?.draft || null,
    recovered: Boolean(recoveredDraft),
    draftSavedAt: recoveredDraft?.savedAt || null,
    draftSaveOk: Boolean(recoveredDraft),
    strengthGroup: null, strengthExercise: null,
    catalogOpen: false,
    calendarMonth: today().slice(0,7), calendarDay: today(),
  };
  let toastTimeout;
  function draftStatusText() {
    if (!ui.draftSaveOk) return 'Salvamento automático indisponível: não feche a página.';
    const date = ui.draftSavedAt ? new Date(ui.draftSavedAt) : null;
    const time = date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'agora';
    return `Rascunho salvo neste aparelho às ${time}.`;
  }
  function updateDraftIndicator() {
    const el = document.getElementById('draft-status');
    if (el) {
      el.textContent = draftStatusText();
      el.classList.toggle('save-error', !ui.draftSaveOk);
    }
  }
  function persistDraft() {
    if (!ui.draft) return false;
    const savedAt = new Date().toISOString();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({version:1, savedAt, draft:ui.draft}));
      ui.draftSavedAt = savedAt;
      ui.draftSaveOk = true;
      ui.recovered = false;
      updateDraftIndicator();
      return true;
    } catch (err) {
      console.error('Falha no salvamento automático', err);
      ui.draftSaveOk = false;
      updateDraftIndicator();
      return false;
    }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); }
    catch (err) { console.warn('Não foi possível limpar o rascunho local.', err); }
    ui.draft = null;
    ui.draftSavedAt = null;
    ui.recovered = false;
    ui.draftSaveOk = false;
  }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(state)); return true; }
    catch (err) { notify('Armazenamento indisponível. Exporte um backup antes de sair.'); return false; }
  }
  function notify(message) {
    const el = document.getElementById('toast');
    el.textContent = message; el.hidden = false;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(()=>{el.hidden=true;},4800);
  }
  const planFor = id => DATA.plans.find(p => p.id === id) || DATA.plans[0];
  const exerciseFor = id => state.exercises.find(x => x.id === id);
  const currentExercises = id => state.exercises.filter(x=>x.group===id && x.active);
  const history = id => E.historyOf(state.sessions,id);
  const maxKneePain = () => state.settings.kneePain === '' ? null : Number(state.settings.kneePain);
  const getNext = () => E.nextWorkout(state.sessions,state.settings.fatigue,maxKneePain(),DATA.rotation);
  const latestSessions = () => [...state.sessions].sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
  function dueKnee() {
    return latestSessions().filter(s => s.kneeNextDay == null &&
      s.entries.some(en=>exerciseFor(en.id)?.knee && E.workSets(en).length) &&
      dayGap(s.day,today()) >= 1 && Date.now()-new Date(s.timestamp).getTime()>=86400000);
  }
  const tag = (name, className='') => `<span class="pill ${className}">${esc(name)}</span>`;
  const setSummary = (set, unit) => set ? `${fmt(set.load)} ${unit} × ${set.reps} rep.${set.rir == null || set.rir === '' ? '' : ` · RIR ${set.rir}`}` : '—';
  const planShort = plan => plan.title.split('+')[0].trim();
  const strengthTone = delta => delta >= 5 ? 'good' : delta < 0 ? 'warn' : 'neutral';
  function strengthOverview(days = 90) {
    const active = state.exercises.filter(ex => ex.active !== false);
    return {
      days,
      groups: E.groupStrength(active, state.sessions, days)
        .sort((a,b) => DATA.rotation.indexOf(a.group) - DATA.rotation.indexOf(b.group))
        .map(item => ({ ...item, plan: planFor(item.group) })),
      leaders: E.strengthLeaders(active, state.sessions, days, 6).map(item => ({ ...item, plan: planFor(item.group) })),
    };
  }
  function radarChart(groups, days = 90) {
    const tracked = groups.filter(group => group.tracked > 0);
    const cx = 180, cy = 150, radius = 106;
    const maxScore = Math.max(120, Math.ceil(Math.max(100, ...tracked.map(group => group.current)) / 10) * 10);
    const count = groups.length;
    const point = (score, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
      const r = radius * Math.max(0, Math.min(maxScore, score)) / maxScore;
      return {x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r};
    };
    const coords = values => values.map((value, i) => {
      const p = point(value, i);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');
    const selected = ui.strengthGroup;
    return `<div class="strength-radar-plot mt-12">
      <svg viewBox="0 0 360 300" aria-hidden="true" focusable="false">
        ${[0.25,0.5,0.75,1].map(level =>
          `<polygon points="${coords(groups.map(() => maxScore * level))}" fill="none" stroke="#334b5e" stroke-width="1"/>`).join('')}
        ${groups.map((_, i) => {
          const end = point(maxScore, i);
          return `<line x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}" stroke="#334b5e" stroke-width="1"/>`;
        }).join('')}
        <polygon points="${coords(groups.map(() => 100))}" fill="#80beff" fill-opacity=".08" stroke="#80beff" stroke-width="2" stroke-dasharray="5 5"/>
        ${tracked.length === groups.length
          ? `<polygon points="${coords(groups.map(group => group.current))}" fill="#c5f56b" fill-opacity=".18" stroke="#c5f56b" stroke-width="3" stroke-linejoin="round"/>`
          : groups.map((group, i) => {
            const next = (i + 1) % groups.length, other = groups[next];
            if (!group.tracked || !other.tracked) return '';
            const a = point(group.current, i), b = point(other.current, next);
            return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#c5f56b" stroke-width="3"/>`;
          }).join('')}
        ${groups.map((group, i) => {
          const base = point(100, i);
          const dot = group.tracked ? point(group.current, i) : null;
          return `<circle cx="${base.x}" cy="${base.y}" r="3" fill="#80beff"/>${dot ? `<circle cx="${dot.x}" cy="${dot.y}" r="5" fill="#c5f56b"/>` : ''}`;
        }).join('')}
      </svg>
      ${groups.map((group, index) => `<button type="button" class="radar-axis-button radar-axis-button--${index} ${selected === group.group ? 'selected' : ''}"
          data-action="strength-group" data-group="${esc(group.group)}" aria-pressed="${selected === group.group}"
          aria-label="Ver gráficos de ${esc(group.plan.title)}">
          <strong>${esc(planShort(group.plan))}</strong>
          <span>${group.tracked ? `${fmt(group.current)}%` : 'sem dados'}</span>
        </button>`).join('')}
    </div>
    <div class="strength-radar-legend" aria-label="Legenda do radar">
      <span><i class="strength-key base" aria-hidden="true"></i>Base 100%</span>
      <span><i class="strength-key current" aria-hidden="true"></i>Força estimada</span>
    </div>
    <p class="chart-caption">Toque no nome de um grupo para abrir seus exercícios. Sem registros suficientes, o eixo não recebe ponto verde. Janela: ${days} dias.</p>`;
  }
  function strengthLineChart(ex, days) {
    const series = E.strengthSeries(ex, state.sessions, days);
    const summary = E.exerciseStrength(ex, state.sessions, days);
    if (!series.length) return `<div class="empty strength-empty">
      <span class="empty-icon" aria-hidden="true">↗</span>
      Ainda não há séries efetivas registradas para ${esc(ex.name)} nos últimos ${days} dias.
    </div>`;
    const shown = series.slice(-18);
    const values = shown.map(row => row.strength);
    const valueMin = Math.min(...values), valueMax = Math.max(...values);
    const padding = Math.max(1, (valueMax - valueMin) * 0.18, valueMax * 0.045);
    const low = Math.max(0, valueMin - padding), high = valueMax + padding;
    const X = i => shown.length === 1 ? 190 : 44 + i * (310 / (shown.length - 1));
    const Y = value => 170 - (value - low) / Math.max(1, high - low) * 128;
    const line = shown.map((item,i) => `${X(i).toFixed(1)},${Y(item.strength).toFixed(1)}`).join(' ');
    const label = `${ex.name}: ${shown.length} sessão(ões) exibida(s) com estimativas de força entre ${fmt(valueMin)} e ${fmt(valueMax)} ${ex.unit}.`;
    return `<div class="strength-chart-wrap mt-12"><svg viewBox="0 0 380 222" role="img" aria-label="${esc(label)}">
      ${[0,0.5,1].map(level => {
        const val = low + (high - low) * level, y = Y(val);
        return `<line x1="44" y1="${y}" x2="357" y2="${y}" stroke="#344c60" stroke-width="1" stroke-dasharray="3 5"/>
          <text x="37" y="${y+4}" font-size="10" text-anchor="end" fill="#a1b4c6">${fmt(val)}</text>`;
      }).join('')}
      ${shown.length > 1 ? `<polyline points="${line}" fill="none" stroke="#c5f56b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      ${shown.map((row,i) => `<circle cx="${X(i)}" cy="${Y(row.strength)}" r="4.6" fill="#c5f56b" stroke="#12202c" stroke-width="1.5">
        <title>${esc(`${dateBR(row.day)}: ${fmt(row.strength)} ${ex.unit} (estimado) · ${setSummary(row.top, ex.unit)}`)}</title>
      </circle>`).join('')}
      <text x="44" y="205" fill="#9eb2c4" font-size="10">${dateBR(shown[0].day)}</text>
      <text x="355" y="205" fill="#9eb2c4" font-size="10" text-anchor="end">${dateBR(shown[shown.length-1].day)}</text>
    </svg></div>
    <div class="strength-metrics">
      <div><span>Primeira estimativa</span><strong>${fmt(summary.baseline)} ${esc(ex.unit)}</strong></div>
      <div><span>Última estimativa</span><strong>${fmt(summary.current)} ${esc(ex.unit)}</strong></div>
      <div><span>Variação</span><strong class="strength-delta ${strengthTone(summary.percent)}">${summary.count >= 2 ? `${summary.percent >= 0 ? '+' : ''}${fmt(summary.percent)}%` : 'Aguardando base'}</strong></div>
    </div>
    ${series.length < 2 ? '<p class="small muted mt-12">Registre outra sessão para comparar a evolução. Uma sessão isolada não demonstra ganho de força.</p>' : ''}
    <details class="strength-records mt-12"><summary>Ver séries usadas no gráfico (${series.length})</summary>
      <ol>${series.slice().reverse().map(row => `<li><span>${dateBR(row.day)}</span><span>${esc(setSummary(row.top, ex.unit))}</span><strong>${fmt(row.strength)} ${esc(ex.unit)}*</strong></li>`).join('')}</ol>
    </details>
    <p class="chart-caption">*Estimativa pela fórmula de Epley, não teste de 1RM. Máquinas, amplitude, técnica e fadiga podem alterar a comparação.</p>`;
  }
  function strengthGroupDetails(days = 90) {
    const groupId = ui.strengthGroup;
    if (!groupId || !DATA.rotation.includes(groupId)) {
      return `<div class="strength-hint" role="status">Selecione um dos grupos do radar para visualizar os exercícios e sua evolução em cada sessão.</div>`;
    }
    const group = planFor(groupId);
    const exercises = state.exercises.filter(ex => ex.group === groupId && (ex.active !== false || history(ex.id).length > 0));
    const scored = exercises.map(ex => ({ex, stat: E.exerciseStrength(ex, state.sessions, days)}))
      .sort((a,b) => b.stat.count - a.stat.count || a.ex.name.localeCompare(b.ex.name));
    const selected = scored.find(item => item.ex.id === ui.strengthExercise) || scored[0];
    return `<section class="card strength-detail-card mt-12" id="strength-group-details" aria-labelledby="strength-group-heading">
      <div class="row-between strength-detail-head"><div>
        <p class="eyebrow">DETALHAMENTO DO GRUPO ${esc(groupId)}</p>
        <h2 class="section-title" id="strength-group-heading">${esc(group.title)}</h2>
      </div><button type="button" class="ghost small-button" data-action="strength-close" aria-label="Fechar detalhamento">Fechar</button></div>
      ${scored.length ? `<p class="small muted mt-8">Escolha um exercício para acompanhar a força estimada nas sessões registradas.</p>
        <div class="strength-exercise-choices" role="group" aria-label="Exercícios do grupo ${esc(group.title)}">
          ${scored.map(item => `<button type="button" class="strength-exercise-choice ${item.ex.id === selected.ex.id ? 'selected' : ''}"
              data-action="strength-exercise" data-ex="${esc(item.ex.id)}" aria-pressed="${item.ex.id === selected.ex.id}">
              <strong>${esc(item.ex.name)}</strong><span>${item.stat.count >= 2 ? `${item.stat.percent >= 0 ? '+' : ''}${fmt(item.stat.percent)}%` : item.stat.count ? '1 sessão' : 'sem registros'}</span>
            </button>`).join('')}
        </div>
        <div class="strength-exercise-panel" id="strength-exercise-panel">
          <div class="row-between"><h3>${esc(selected.ex.name)}</h3>${tag(`${E.strengthSeries(selected.ex,state.sessions,days).length} sessão(ões)`,'green')}</div>
          ${strengthLineChart(selected.ex,days)}
        </div>` : `<div class="empty">Nenhum exercício ativo neste bloco. Ative um exercício na aba Treinos para começar a acompanhar a evolução.</div>`}
    </section>`;
  }
  function strengthSection(days = 90) {
    const overview = strengthOverview(days);
    const trackedGroups = overview.groups.filter(group => group.tracked > 0);
    return `<section class="card mt-16" aria-labelledby="strength-radar-title">
      <div class="row-between"><h2 class="section-title" id="strength-radar-title">Mapa de força</h2>${tag(`${days} dias`,'green')}</div>
      <p class="small muted mb-0">Compare a força estimada por grupo muscular. Cada exercício é normalizado por sua própria primeira sessão na janela; carga de máquinas diferentes não é somada.</p>
      ${radarChart(overview.groups, days)}
      ${trackedGroups.length ? `<ul class="mini-list strength-summary-list">${overview.groups.map(group => `<li><div class="strength-group-block"><strong>${esc(group.plan.title)}</strong><span>${group.tracked ? `${group.tracked} exercício(s) comparável(is)` : 'Registros insuficientes'}</span>${group.best ? `<small>Maior avanço: ${esc(group.best.name)} · ${fmt(group.best.percent)}%</small>` : ''}</div><div class="text-right"><strong>${group.tracked ? `${fmt(group.current)}%` : '—'}</strong><br><span class="strength-delta ${strengthTone(group.delta ?? 0)}">${group.tracked ? `${group.delta >= 0 ? '+' : ''}${fmt(group.delta)}%` : 'sem base'}</span></div></li>`).join('')}</ul>` : `<p class="small muted mt-12">O radar começará a mostrar evolução depois que você registrar pelo menos duas sessões do mesmo exercício. É possível explorar os grupos antes disso.</p>`}
    </section>
    ${strengthGroupDetails(days)}
    ${overview.leaders.length ? `<section class="card mt-12" aria-labelledby="strength-leaders-title">
      <div class="row-between"><h2 class="section-title" id="strength-leaders-title">Evolução por exercício</h2>${tag(`${overview.leaders.length} exercícios`,'green')}</div>
      <ul class="mini-list">${overview.leaders.map(item => `<li><div class="history-exercise"><strong>${esc(item.name)}</strong><br><span>${esc(item.plan.title)} · ${dateBR(item.firstDate)} → ${dateBR(item.lastDate)}</span><br><small class="leader-detail">${esc(setSummary(item.firstTop, item.unit))} → ${esc(setSummary(item.latestTop, item.unit))}</small></div><div class="text-right"><strong>${fmt(item.current)}%</strong><br><span class="strength-delta ${strengthTone(item.percent)}">${item.percent >= 0 ? '+' : ''}${fmt(item.percent)}%</span></div></li>`).join('')}</ul>
    </section>` : ''}`;
  }
  function render() {
    const main = document.getElementById('screen');
    main.innerHTML = ui.tab === 'plans' && muayMode ? renderMuay() : ui.editor ? renderEditor() : ui.draft && ui.tab === 'plans' ? renderTraining() :
      ui.tab === 'home' ? renderHome() : ui.tab === 'plans' ? renderPlans() :
      ui.tab === 'progress' ? renderProgress() : ui.tab === 'history' ? renderHistory() : renderSettings();
    document.querySelectorAll('#nav [data-tab]').forEach(btn=>{
      const active=btn.dataset.tab===ui.tab;
      btn.classList.toggle('active',active);
      if(active) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
    });
  }
  function headline(kicker,title,desc='') {
    return `<p class="eyebrow">${esc(kicker)}</p><h1 class="page-title">${esc(title)}</h1>${desc?`<p class="lead">${esc(desc)}</p>`:''}`;
  }
  function weightForm() {
    const progress = E.progress(state.weights,state.settings.startWeight,state.settings.targetWeight);
    return `<form id="weight-form" class="card">
      <div class="row-between"><h2 class="section-title">Registrar pesagem</h2>${tag('kg','green')}</div>
      <div class="field-row mt-12"><div class="field"><label for="new-weight">Peso atual</label><input id="new-weight" name="weight" type="number" inputmode="decimal" min="30" max="350" step="0.1" value="${esc(progress.current)}" required /></div>
      <div class="field"><label for="weight-date">Data</label><input id="weight-date" name="date" type="date" value="${today()}" required /></div></div>
      <button class="primary full mt-12" type="submit">Salvar peso</button>
    </form>`;
  }
  function renderQueue(queue) {
    return `<section class="queue-panel" aria-label="Treinos pendentes da rodada">
      <div class="row-between"><strong>Rodada ${queue.completedRounds + 1}</strong><span class="tiny muted">${queue.completed.length} de ${DATA.rotation.length} blocos concluídos</span></div>
      <div class="queue-chips">${DATA.rotation.map(id => {
        const pending = queue.pending.includes(id);
        return `<span class="queue-chip ${pending?'pending':'done'}">${pending?'◦':'✓'} ${esc(id)} · ${esc(planFor(id).title.split(' + ')[0])}${pending?'':' · feito'}</span>`;
      }).join('')}</div>
      <p class="tiny muted">Trocar a ordem não apaga os pendentes; repetir um bloco não conclui os demais.</p>
    </section>`;
  }
  function resumeBanner() {
    if (!ui.draft) return '';
    return `<div class="callout good"><strong>Você tem um treino em andamento.</strong>
      <p class="small mb-8">${esc(planFor(ui.draft.planId).title)} · ${esc(draftStatusText())}</p>
      <button class="button-inline" data-action="resume">Continuar treino salvo</button></div>`;
  }
  function renderHome() {
    const goal = E.progress(state.weights,state.settings.startWeight,state.settings.targetWeight);
    const left = dayGap(today(),state.settings.goalDate);
    const next = getNext(), plan = next.id ? planFor(next.id) : null;
    const pending = dueKnee();
    const last = latestSessions()[0];
    const lastTop = state.exercises.map(x=>({x,r:E.recommend(x,state.sessions)}))
      .filter(item=>item.r.last).sort((a,b)=>(history(b.x.id)[0]?.session.timestamp||'').localeCompare(history(a.x.id)[0]?.session.timestamp||''))[0];
    return `${headline('Seu painel','Evolua com método.','Cargas, recuperação e constância em um único lugar.')}
      <section class="card hero" aria-label="Progresso até o objetivo">
        <div class="row-between"><span class="pill green">META DE RECOMPOSIÇÃO</span><span class="small muted">${left>=0?`${left} dias restantes`:'Data-alvo encerrada'}</span></div>
        <div class="hero-rows mt-16"><div><span class="metric-label">PESO ATUAL</span><div class="hero-weight">${fmt(goal.current)} <small>kg</small></div></div>
        <div><span class="metric-label">OBJETIVO</span><div class="hero-weight">${fmt(state.settings.targetWeight)} <small>kg</small></div></div></div>
        <div class="progress-track" role="progressbar" aria-label="Progresso do peso" aria-valuenow="${goal.percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${goal.percent}%"></span></div>
        <div class="progress-legend"><span>${goal.percent}% do percurso</span><span>${goal.remaining>0?`${fmt(goal.remaining)} kg até a meta`: 'Meta de peso atingida'}</span></div>
      </section>
      <div class="kpi-row"><div class="kpi"><strong>${state.sessions.length}</strong><span>treinos salvos</span></div><div class="kpi"><strong>${goal.lost>0?'−':''}${fmt(Math.abs(goal.lost))}</strong><span>kg desde o início</span></div><div class="kpi"><strong>14/01</strong><span>meta de 2027</span></div></div>
      ${resumeBanner()}
      ${renderAdherencePanel()}
      ${pending.length?`<div class="callout warn"><strong>Cheque o joelho no dia seguinte.</strong> Há ${pending.length} treino(s) de pernas aguardando registro. <button class="button-inline" data-action="navigate" data-to="history">Registrar agora</button></div>`:''}
      <div class="section-row"><h2 class="section-title">Seu próximo treino</h2>${tag(next.rest?'Recuperação':`Bloco ${next.id}`,'green')}</div>
      <section class="card"><div class="card-row"><div><h3>${plan?esc(plan.title):'Recuperação antes do próximo bloco'}</h3><p>${plan?esc(plan.subtitle):'Não há bloco de superiores pendente e liberado pela recuperação atual.'}</p></div><span class="rounded-emoji" aria-hidden="true">${plan?.type==='upper'?'↗':'⌁'}</span></div>
        <p class="bodycopy mt-12">${esc(next.reason)}</p>
        ${renderQueue(next)}
        <div class="field-row mt-12"><div class="field"><label for="fatigue-home">Fadiga das pernas</label><select id="fatigue-home" data-setting="fatigue"><option value="normal" ${state.settings.fatigue==='normal'?'selected':''}>Normal</option><option value="moderada" ${state.settings.fatigue==='moderada'?'selected':''}>Moderada</option><option value="alta" ${state.settings.fatigue==='alta'?'selected':''}>Alta</option></select></div>
        <div class="field"><label for="knee-home">Dor no joelho agora</label><select id="knee-home" data-setting="kneePain">${painOptions(state.settings.kneePain)}</select></div></div>
        ${plan?`<button class="primary full mt-12" data-action="start" data-plan="${next.id}">Iniciar ${esc(plan.title)}</button>`:''}
        <button class="button-inline mt-8" data-action="navigate" data-to="plans">Escolher outro bloco</button>
      </section>
      ${last?`<div class="section-row"><h2 class="section-title">Última atividade</h2><span class="tiny muted">${dateBR(last.day)}</span></div><div class="card"><strong>${esc(planFor(last.planId).title)}</strong><p class="small muted mt-8">${last.entries.length} exercícios registrados · ${esc(last.energy||'Esforço não informado')}</p></div>`:''}
      ${lastTop?`<div class="section-row"><h2 class="section-title">Seu último peso de treino</h2></div><div class="card"><div class="card-row"><div><strong>${esc(lastTop.x.name)}</strong><p class="last">${esc(lastTop.r.last)}</p></div>${tag(lastTop.r.level==='increase'?'Pode subir':'Em evolução',lastTop.r.level==='increase'?'green':'')}</div><p class="small muted mt-12">${esc(lastTop.r.title)}. ${esc(lastTop.r.explanation)}</p></div>`:''}
      <div class="section-row"><h2 class="section-title">Muay Thai</h2></div>
      <section class="card"><p class="small muted">Aulas e treinos em casa também entram no seu diário, sem concluir blocos de musculação.</p><button class="secondary full" data-action="open-muay">Registrar Muay Thai</button></section>
      ${weightForm()}
      <p class="small muted">As recomendações são regras de acompanhamento, não substituem orientação de um profissional. Dor no joelho ou piora após treino bloqueiam sugestões automáticas de aumento.</p>`;
  }
  function painOptions(current) {
    return [['','Não informado'],['0','0 · Sem dor'],['1','1 · Mínima'],['2','2 · Leve'],['3','3 · Moderada'],['4','4 · Importante'],['5','5+ · Forte']]
      .map(([v,label])=>`<option value="${v}" ${String(current??'')===v?'selected':''}>${label}</option>`).join('');
  }
  function renderMuay() {
    return '<div class="tabs muay-mode-tabs"><button class="tab-chip" data-action="mode-strength">Musculação</button><button class="tab-chip selected" aria-current="page">Muay Thai</button></div>' + M.renderPage(state.muay, today());
  }
  function renderPlans() {
    const next=getNext(), p=planFor(ui.plan);
    const all=state.exercises.filter(x=>x.group===ui.plan);
    return `<div class="tabs muay-mode-tabs"><button class="tab-chip selected" aria-current="page">Musculação</button><button class="tab-chip" data-action="mode-muay">Muay Thai</button></div>${headline('Seu planejamento','Treinos flexíveis.','A → C → B → D. Cada bloco realizado sai da fila; os outros continuam pendentes.')}
      ${resumeBanner()}
      ${renderQueue(next)}
      <div class="tabs" role="group" aria-label="Escolher grupo de treino">${DATA.plans.map(plan=>`<button class="tab-chip ${ui.plan===plan.id?'selected':''}" data-action="select-plan" data-plan="${plan.id}">${plan.id} · ${esc(plan.title.split(' ')[0])}</button>`).join('')}</div>
      <section class="workout-banner"><div class="row-between"><h2>${esc(p.title)}</h2>${tag(`Bloco ${p.id}`,'green')}</div><p>${esc(p.subtitle)}</p><button class="primary full mt-12" data-action="start" data-plan="${p.id}">Iniciar treino ${p.id}</button></section>
      <div class="section-row"><h2 class="section-title">Exercícios do bloco</h2><small>${all.filter(x=>x.active).length} ativos</small></div>
      <div class="list-settings">${all.map(ex=>`<div class="setting-item"><div><strong>${esc(ex.name)}</strong><span>${ex.sets} × ${ex.low}–${ex.high} · +${fmt(ex.step)} ${esc(ex.unit)} ${ex.knee?'· atenção ao joelho':''}</span><button class="button-inline" data-action="edit-ex" data-ex="${esc(ex.id)}">Editar exercício</button></div><input class="switch" type="checkbox" aria-label="Ativar ${esc(ex.name)}" data-ex-active="${esc(ex.id)}" ${ex.active?'checked':''}/></div>`).join('')}</div>
      <button class="secondary full mt-16" data-action="add-ex" data-plan="${ui.plan}">+ Adicionar exercício</button>
      <div class="callout mt-16">Aquecimentos não contam como séries efetivas. Você pode alterar exercícios, progressão e número de séries em qualquer momento.</div>`;
  }
  function seedSets(ex) {
    const h=history(ex.id);
    if(h.length){
      const s=h[0].entry.sets;
      return s.map(item=>({load:item.load,reps:'',rir:'',warmup:!!item.warmup}));
    }
    if(ex.example) return copy(ex.example);
    return Array.from({length:ex.sets},()=>({load:'',reps:'',rir:'',warmup:false}));
  }
  function startWorkout(id) {
    if (!DATA.rotation.includes(id)) return;
    if (ui.draft && !confirm('Existe um treino em andamento. Descartar esse rascunho e começar outro?')) return;
    if (ui.draft) clearDraft();
    ui.plan=id;
    ui.tab='plans';ui.editor=null;
    ui.draft={planId:id,energy:'normal',notes:'',entries:{},plannedIds:[],skipped:[],addedIds:[]};
    currentExercises(id).forEach(ex => {ui.draft.entries[ex.id]={id:ex.id,sets:seedSets(ex),pain:''};ui.draft.plannedIds.push(ex.id);});
    persistDraft();
    render();window.scrollTo(0,0);
  }
  function renderTraining() {
    F.ensureDraft(ui.draft);
    const p=planFor(ui.draft.planId);
    const entries=ui.draft.entries;
    return `${headline('Sessão em andamento',p.title,'As cargas preenchidas são referência; registre repetições e RIR após cada série.')}
      <div class="callout ${ui.draftSaveOk?'good':'warn'}"><strong>${ui.recovered?'Treino recuperado após interrupção.':'Salvamento automático ativo.'}</strong>
        <span class="draft-status ${ui.draftSaveOk?'':'save-error'}" id="draft-status" role="status">${esc(draftStatusText())}</span>
        <p class="small mb-0">Cada edição é salva neste navegador. Você pode sair desta tela e retomar o treino.</p></div>
      <div class="callout">${p.type==='lower'?'Treino de pernas: registre dor no joelho durante os exercícios e no dia seguinte. Se doer, não aumente a carga.':'Carga por halter significa o peso de cada halter, não a soma do par.'}</div>
      ${Object.values(entries).map(en=>renderExercise(en)).join('')}
      <section class="card"><div class="row-between"><h2 class="section-title">Ajustar este treino</h2>${tag('Só hoje','green')}</div>
        <p class="small muted">Retirar ou adicionar exercícios aqui não altera sua ficha. Exercícios retirados não contam como realizados.</p>
        ${F.ensureDraft(ui.draft) && ui.draft.skipped.length ? '<div class="flex-skipped"><strong>Retirados nesta sessão</strong>' +
          ui.draft.skipped.map(item=>'<div class="flex-skip-item"><span>' + esc(exerciseFor(item.id)?.name||item.id) + '</span><select aria-label="Motivo de retirar ' + esc(exerciseFor(item.id)?.name||item.id) + '" data-skip-reason="' + esc(item.id) + '">' +
          Object.entries(F.reasons).map(([value,label])=>'<option value="' + esc(value) + '"' + (item.reason===value?' selected':'') + '>' + esc(label) + '</option>').join('') +
          '</select><button class="secondary small-button" data-action="flex-restore" data-ex="' + esc(item.id) + '">Restaurar</button></div>').join('') + '</div>' : ''}
        <button class="secondary full mt-12" data-action="flex-catalog-toggle" aria-expanded="${ui.catalogOpen}">${ui.catalogOpen?'Ocultar catálogo':'+ Adicionar exercício do catálogo'}</button>
        ${ui.catalogOpen ? renderFlexCatalog() : ''}
      </section>
      ${renderAdherencePanel(true)}
      <section class="card"><h2 class="section-title">Finalizar sessão</h2><div class="field mt-12"><label for="session-energy">Como foi a sessão?</label>
      <select id="session-energy" data-draft-meta="energy"><option value="leve" ${ui.draft.energy==='leve'?'selected':''}>Leve / sobrou energia</option><option value="normal" ${ui.draft.energy==='normal'?'selected':''}>Normal / esforço esperado</option><option value="intenso" ${ui.draft.energy==='intenso'?'selected':''}>Intensa / muita fadiga</option></select></div>
      <div class="field mt-12"><label for="session-notes">Observações (opcional)</label><textarea id="session-notes" data-draft-meta="notes" placeholder="Ex.: sono, dor, execução, Muay Thai no mesmo dia">${esc(ui.draft.notes)}</textarea></div></section>
      <div class="training-controls"><div class="btnrow"><button class="primary" style="flex:2" data-action="finish">Salvar treino</button><button class="ghost" style="flex:1" data-action="cancel">Cancelar</button></div></div>`;
  }
  function renderFlexCatalog() {
    const choices=F.options(state.exercises,ui.draft);
    return '<div class="flex-catalog mt-12"><label for="flex-catalog-search">Filtrar por nome ou equipamento</label><input id="flex-catalog-search" type="search" placeholder="Buscar exercício..." aria-controls="flex-catalog-list" />' +
      '<p class="small muted">Exercícios de outras fichas também estão disponíveis; o catálogo não altera o bloco salvo.</p>' +
      '<div class="flex-catalog-list" id="flex-catalog-list">' + choices.map(ex=>
        '<div class="flex-catalog-row" data-flex-name="' + esc((ex.name+' '+ex.equipment+' '+ex.muscle).toLocaleLowerCase('pt-BR')) + '">' +
        '<div><strong>' + esc(ex.name) + '</strong><small>' + esc(ex.muscle) + ' · ' + esc(ex.equipment) + '</small></div>' +
        '<button class="secondary small-button" data-action="flex-add" data-ex="' + esc(ex.id) + '">Adicionar</button></div>'
      ).join('') + '</div></div>';
  }
  function renderAdherencePanel(inSession=false) {
    const insight=F.insights({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      exercises:state.exercises,today:today(),draft:inSession?ui.draft:null,settings:state.settings});
    return '<section class="card flex-insights"><div class="row-between"><h2 class="section-title">Constância e recomposição</h2>' + tag('Análise dos registros','green') + '</div>' +
      '<p class="small muted">Um dia sem registro não significa que você faltou. O FORJA não exige justificativa para treinar menos.</p>' +
      '<div class="flex-metrics"><span><strong>' + insight.summary.strengthDays7 + '</strong> dias de musculação em 7 dias</span>' +
      '<span><strong>' + insight.summary.muaySessions7 + '</strong> sessões de Muay Thai em 7 dias</span>' +
      (inSession?'<span><strong>'+insight.summary.completedSetsToday+'</strong> séries efetivas preenchidas hoje</span>':'') + '</div>' +
      insight.signals.map(signal=>'<div class="flex-signal"><strong>' + esc(signal.title) + '</strong><p>' + esc(signal.detail) +
        '</p><p>' + esc(signal.suggestion) + '</p></div>').join('') +
      (!insight.signals.length?'<p class="small muted">Ainda não há padrão consistente de interrupção ou omissão explícita a destacar. Continue registrando somente o que realizar.</p>':'') +
      '<p class="small muted">' + esc(insight.note) + '</p>' +
      '<p class="tiny muted">Regras indicativas, não um diagnóstico nem uma garantia de resultados. Não mudam automaticamente sua ficha ou suas cargas.</p></section>';
  }
  function setComparisonText(previous, current, ex) {
    if (!previous) return `<span class="previous-set">Sem registro anterior desta série.</span>`;
    const previousText = `${fmt(previous.load)} ${ex.unit} × ${previous.reps} rep. · ${previous.warmup?'aquecimento':'efetiva'}${previous.rir == null?'':` · RIR ${previous.rir}`}`;
    const delta = E.compareSet(previous, current);
    return `<span class="previous-set">Anterior: <strong>${esc(previousText)}</strong></span>
      <span class="set-delta ${esc(delta.kind)}">${esc(delta.label)}</span>`;
  }
  function updateSetComparison(exId, index) {
    const en = ui.draft?.entries[exId], ex = exerciseFor(exId);
    if (!en || !ex) return;
    const cell = [...document.querySelectorAll('.set-history')]
      .find(node => node.dataset.ex === exId && Number(node.dataset.index) === index);
    if (!cell) return;
    const previous = history(exId)[0]?.entry.sets[index];
    cell.innerHTML = setComparisonText(previous, en.sets[index], ex);
  }
  function renderExercise(en) {
    const ex=exerciseFor(en.id), reco=E.recommend(ex,state.sessions), previousEntry=history(ex.id)[0]?.entry, hasData=!!previousEntry;
    const cls=reco.level==='protect'?'protect':['hold','confirm'].includes(reco.level)?'warn':'';
    return `<section class="exercise-card" data-exercise="${esc(ex.id)}">
      <div class="card-row"><div><h3>${esc(ex.name)}</h3><p class="small muted mt-8">Meta: ${ex.low}–${ex.high} rep. · ajuste de ${fmt(ex.step)} ${esc(ex.unit)}</p></div>${tag(ex.mode==='pyramid'?'Pirâmide':'Séries','')}</div>
      <div class="recommend ${cls}"><strong>${esc(reco.title)}</strong><p>${esc(reco.explanation)}</p>${hasData?`<p>Último: ${esc(reco.last)} (${dateBR(reco.lastDate)})</p>`:''}
      ${reco.level==='increase'?`<button class="button-inline mt-8" data-action="apply-reco" data-ex="${esc(ex.id)}">Usar ${fmt(reco.next)} ${esc(ex.unit)} na série mais pesada</button>`:''}</div>
      ${!hasData&&ex.example?'<p class="small muted">Modelo do seu supino: 20 → 22,5 → 25 → 25 kg por halter. Não é histórico registrado.</p>':''}
      <div class="set-grid"><div class="caption">Nº</div><div class="caption">Tipo</div><div class="caption">Carga<br>(${esc(ex.unit)})</div><div class="caption">Reps</div><div class="caption">RIR</div>
      ${en.sets.map((set,i)=>`<div class="cell-label">${i+1}</div><button class="button-inline set-type ${set.warmup?'warmup':'work'}" data-action="toggle-warmup" data-ex="${esc(ex.id)}" data-index="${i}" title="Alternar entre aquecimento e série efetiva">${set.warmup?'Aquec.':'Efetiva'}</button>
      <input aria-label="Série ${i+1}, carga ${esc(ex.unit)} em ${esc(ex.name)}" type="number" min="0" max="1500" step="any" inputmode="decimal" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="load" value="${esc(set.load)}" />
      <input aria-label="Série ${i+1}, repetições em ${esc(ex.name)}" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="reps" value="${esc(set.reps)}" />
      <input aria-label="Série ${i+1}, repetições em reserva em ${esc(ex.name)}" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="rir" value="${esc(set.rir)}" />
      <div class="set-history" data-ex="${esc(ex.id)}" data-index="${i}">${setComparisonText(previousEntry?.sets[i],set,ex)}</div>`).join('')}</div>
      <div class="card-footer"><button class="button-inline" data-action="add-set" data-ex="${esc(ex.id)}">+ Série</button><button class="button-inline" data-action="remove-set" data-ex="${esc(ex.id)}" ${en.sets.length<=1?'disabled':''}>− Última série</button><button class="button-inline" data-action="flex-withdraw" data-ex="${esc(ex.id)}">Retirar só hoje</button></div>
      ${ex.knee?`<div class="field mt-12"><label for="pain-${esc(ex.id)}">Dor no joelho durante o exercício (0–5+)</label><select id="pain-${esc(ex.id)}" data-ex-pain="${esc(ex.id)}" required>${painOptions(en.pain)}</select><span class="field-help">Informe 0 quando não sentiu dor. Este registro é necessário para salvar uma série efetiva deste exercício.</span></div>`:''}
    </section>`;
  }
  function renderProgress() {
    const p=E.progress(state.weights,state.settings.startWeight,state.settings.targetWeight);
    const days=dayGap(today(),state.settings.goalDate);
    const pace=days>0 && p.remaining>0 ? (p.remaining/days*7) : 0;
    const all=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date));
    const items=all.slice(-12), ys=items.map(x=>Number(x.weight));
    const min=Math.min(...ys,Number(state.settings.targetWeight))-1;
    const max=Math.max(...ys,Number(state.settings.startWeight))+1;
    const x=i=>items.length===1?160:24+i*(272/(items.length-1));
    const y=val=>122-((val-min)/Math.max(.1,max-min))*100;
    const points=items.map((it,i)=>`${x(i)},${y(it.weight)}`).join(' ');
    return `${headline('Acompanhe seu processo','Sua evolução.','Olhe a tendência do peso junto da força, recuperação e circunferência abdominal.')}
      <div class="kpi-row"><div class="kpi"><strong>${fmt(p.current)}</strong><span>kg atuais</span></div><div class="kpi"><strong>${p.lost>=0?'−':'+'}${fmt(Math.abs(p.lost))}</strong><span>kg de variação</span></div><div class="kpi"><strong>${days>0?days:'—'}</strong><span>dias até a meta</span></div></div>
      <div class="card"><div class="row-between"><h2 class="section-title">Histórico de peso</h2>${tag(`${items.length} registro(s)`,'green')}</div>
      <div class="chart-wrap mt-12"><svg viewBox="0 0 320 160" role="img" aria-label="Gráfico de peso registrado. Atual ${fmt(p.current)} quilos, meta ${fmt(state.settings.targetWeight)} quilos.">
      <line x1="18" y1="122" x2="305" y2="122" stroke="#526477" stroke-width="1" />
      <line x1="18" y1="${y(state.settings.targetWeight)}" x2="305" y2="${y(state.settings.targetWeight)}" stroke="#c5f56b" stroke-dasharray="5 5" opacity=".7" />
      <text x="305" y="${Math.max(13,y(state.settings.targetWeight)-7)}" fill="#c5f56b" font-size="10" text-anchor="end">META ${fmt(state.settings.targetWeight)} kg</text>
      ${items.length>1?`<polyline points="${points}" fill="none" stroke="#80beff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`:''}
      ${items.map((it,i)=>`<circle cx="${x(i)}" cy="${y(it.weight)}" r="4" fill="#80beff" stroke="#152231" stroke-width="2"/>`).join('')}
      ${items.length?`<text x="24" y="148" fill="#a7b7c7" font-size="10">${dateBR(items[0].date)}</text><text x="299" y="148" fill="#a7b7c7" font-size="10" text-anchor="end">${dateBR(items[items.length-1].date)}</text>`:''}
      </svg></div><p class="chart-caption">Linha pontilhada: meta de peso. Oscilações diárias são normais.</p>
      ${pace>0?`<div class="callout ${pace>.9?'warn':''}">Ritmo matemático até ${dateBR(state.settings.goalDate)}: <strong>${fmt(pace)} kg/semana</strong>. Não é uma recomendação automática de déficit; preserve o rendimento e sua saúde.</div>`:''}</div>
      ${strengthSection(90)}
      ${weightForm()}
      <div class="section-row"><h2 class="section-title">Pesagens salvas</h2></div><div class="card"><ul class="mini-list">${all.slice().reverse().slice(0,15).map(it=>`<li><span>${dateBR(it.date)}${it.initial?' · referência inicial':''}</span><strong>${fmt(it.weight)} kg</strong></li>`).join('')}</ul></div>`;
  }
  function renderHistory() {
    const sessions=latestSessions();
    const calendar=CAL.render({strengthSessions:state.sessions,muaySessions:state.muay.sessions,month:ui.calendarMonth,selectedDay:ui.calendarDay,today:today(),plans:DATA.plans,exercises:state.exercises});
    const muayHistory=M.historySection(state.muay.sessions);
    return `${headline('Diário','Seu histórico.','Veja cargas e repetições reais. Treinos registrados neste aparelho ficam disponíveis mesmo sem internet.')}
      ${calendar}
      <div class="section-row"><h2 class="section-title">Histórico de musculação</h2></div>
      ${sessions.length ? sessions.map(session=>{
        const needsDay= session.entries.some(en=>exerciseFor(en.id)?.knee && E.workSets(en).length) && session.kneeNextDay == null;
        const canAssess=Date.now()-new Date(session.timestamp).getTime()>=86400000;
        return `<article class="card history-card"><div class="card-row"><div><strong class="session-date">${esc(planFor(session.planId).title)}</strong><p class="small muted mt-8">${dateBR(session.day)} · ${session.entries.length} exercícios · ${esc(session.energy||'Esforço não informado')}</p></div>${tag(`Bloco ${session.planId}`,'green')}</div>
        <ul class="mini-list">${session.entries.map(en=>{
          const ex=exerciseFor(en.id), top=E.topSet(en);
          return `<li><div class="history-exercise"><strong>${esc(ex?.name||en.id)}</strong><br><span>${E.workSets(en).length} séries efetivas${en.pain!=null?' · dor joelho '+en.pain+'/5+':''}</span>
            <details class="history-details"><summary>Ver todas as séries</summary><ol>${en.sets.map(set=>
              `<li>${set.warmup?'Aquecimento':'Efetiva'}: ${fmt(set.load)} ${esc(ex?.unit||'kg')} × ${set.reps} rep.${set.rir == null?'':` · RIR ${set.rir}`}</li>`).join('')}</ol></details>
          </div><div class="text-right"><strong>${top?`${fmt(top.load)} ${esc(ex?.unit||'kg')}`:'—'}</strong><br><span>${top?`${top.reps} rep.`:''}</span></div></li>`;
        }).join('')}</ul>
        ${session.notes?`<p class="small muted">Observações: ${esc(session.notes)}</p>`:''}
        ${needsDay?(canAssess?`<div class="callout warn"><strong>Como ficou o joelho no dia seguinte?</strong><div class="field-row mt-8"><div class="field"><label for="after-${esc(session.id)}">Dor após 24 h</label><select id="after-${esc(session.id)}" data-after-day="${esc(session.id)}">${painOptions('')}</select></div><div style="display:flex;align-items:end"><button class="secondary full" data-action="save-knee" data-id="${esc(session.id)}">Salvar</button></div></div></div>`:
          `<p class="small muted mt-12">Amanhã, informe se houve dor ou rigidez no joelho antes de progredir cargas de pernas.</p>`):
          session.kneeNextDay!=null?`<p class="small muted mt-12">Joelho no dia seguinte: ${session.kneeNextDay}/5+</p>`:''}
        </article>`;
      }).join(''):`<div class="empty"><span class="empty-icon" aria-hidden="true">↗</span>Nenhum treino de musculação registrado ainda.<br>Inicie um bloco para criar seu primeiro histórico.</div>`}
      ${muayHistory}
      <button class="secondary full" data-action="export-json">Exportar backup do histórico</button>`;
  }
  function renderEditor() {
    const edit=ui.editor;
    const ex=edit.id?exerciseFor(edit.id):{
      id:'',name:'',group:edit.group,sets:3,low:8,high:12,step:2.5,unit:'kg',mode:'double',active:true,knee:false,
    };
    return `${headline('Personalização',edit.id?'Editar exercício':'Novo exercício','Adapte seu plano à sua academia, sem apagar os registros anteriores.')}
      <form class="card" id="exercise-form"><div class="field"><label for="ex-name">Nome do exercício</label><input id="ex-name" name="name" type="text" maxlength="100" required value="${esc(ex.name)}" /></div>
      <div class="field-row three mt-12"><div class="field"><label for="ex-sets">Séries</label><input id="ex-sets" name="sets" type="number" min="1" max="12" step="1" required value="${ex.sets}" /></div>
      <div class="field"><label for="ex-low">Reps mín.</label><input id="ex-low" name="low" type="number" min="1" max="50" step="1" required value="${ex.low}" /></div>
      <div class="field"><label for="ex-high">Reps máx.</label><input id="ex-high" name="high" type="number" min="1" max="50" step="1" required value="${ex.high}" /></div></div>
      <div class="field-row mt-12"><div class="field"><label for="ex-step">Incremento de carga</label><input id="ex-step" name="step" type="number" min="0.5" max="50" step="0.5" required value="${ex.step}" /></div>
      <div class="field"><label for="ex-unit">Unidade da carga</label><select id="ex-unit" name="unit"><option value="kg" ${ex.unit==='kg'?'selected':''}>kg (total/máquina)</option><option value="kg/halter" ${ex.unit==='kg/halter'?'selected':''}>kg por halter</option></select></div></div>
      <div class="field mt-12"><label for="ex-mode">Método de progressão</label><select id="ex-mode" name="mode"><option value="double" ${ex.mode==='double'?'selected':''}>Séries com carga estável</option><option value="pyramid" ${ex.mode==='pyramid'?'selected':''}>Pirâmide crescente</option></select></div>
      <label class="setting-item mt-12"><span>Exercício que exige acompanhamento do joelho</span><input class="switch" type="checkbox" name="knee" ${ex.knee?'checked':''}/></label>
      <label class="setting-item mt-12"><span>Ativo no treino</span><input class="switch" type="checkbox" name="active" ${ex.active?'checked':''}/></label>
      <p class="small muted">Sugestões de carga só aparecem após duas sessões consistentes. Séries de aquecimento são excluídas da análise.</p>
      <div class="btnrow mt-16"><button class="primary" type="submit" style="flex:2">Salvar exercício</button><button class="ghost" type="button" data-action="exit-editor" style="flex:1">Voltar</button></div></form>`;
  }
  function renderSettings() {
    return `${headline('Preferências','Seus ajustes.','Dados no próprio aparelho. Sem login, mensalidade ou envio para servidores.')}
      <form id="goal-form" class="card"><h2 class="section-title">Meta corporal</h2>
      <div class="field-row mt-12"><div class="field"><label for="initial-weight">Peso inicial (kg)</label><input id="initial-weight" name="startWeight" type="number" step="0.1" min="30" max="350" value="${state.settings.startWeight}" required /></div>
      <div class="field"><label for="target-weight">Meta (kg)</label><input id="target-weight" name="targetWeight" type="number" step="0.1" min="30" max="350" value="${state.settings.targetWeight}" required /></div></div>
      <div class="field mt-12"><label for="goal-date">Data-alvo</label><input id="goal-date" name="goalDate" type="date" value="${state.settings.goalDate}" required /></div>
      <button class="primary full mt-12" type="submit">Salvar meta</button></form>
      <section class="card"><h2 class="section-title">Seus dados</h2><p class="small muted">O histórico fica somente neste navegador. Ao trocar de celular, limpar os dados do site ou usar navegação privada, ele pode se perder. Exporte um backup periodicamente.</p>
      <div class="btnrow mt-12"><button class="secondary" data-action="export-json">Baixar backup JSON</button><button class="secondary" data-action="export-csv">Exportar séries CSV</button><button class="secondary" data-action="import-json">Importar backup</button></div></section>
      <section class="card"><h2 class="section-title">Sobre as sugestões</h2><p class="small muted">O app diferencia aquecimento e séries efetivas. Para sugerir aumento, exige duas sessões consistentes dentro da faixa de repetições e RIR informado. Em exercícios de joelho, também exige ausência de sintomas durante e no dia seguinte.</p>
      <div class="callout warn">Não é um diagnóstico. Dor recorrente abaixo da patela deve ser avaliada por profissional de saúde; uma joelheira não garante segurança para aumentar a carga.</div>
      <button class="danger-button full mt-12" data-action="reset">Apagar registros deste aparelho</button></section>
      <p class="small muted">FORJA · MVP 1.0 · Funciona offline depois do primeiro acesso seguro (HTTPS). Código aberto e armazenamento local.</p>`;
  }
  function collectDraft(event) {
    const el=event.target;
    if(!ui.draft) return;
    if(el.dataset.draftMeta) {ui.draft[el.dataset.draftMeta]=el.value;persistDraft();return;}
    if(el.dataset.exPain && ui.draft.entries[el.dataset.exPain]) {
      ui.draft.entries[el.dataset.exPain].pain=el.value;persistDraft();return;
    }
    if(el.dataset.ex && el.dataset.field && el.dataset.index !== undefined) {
      const row=ui.draft.entries[el.dataset.ex]?.sets[Number(el.dataset.index)];
      if(row) {
        row[el.dataset.field]=el.value;
        persistDraft();
        updateSetComparison(el.dataset.ex, Number(el.dataset.index));
      }
    }
  }
  function setWeight(form) {
    const data=new FormData(form), n=E.cleanNumber(data.get('weight')), day=String(data.get('date'));
    if(n===null || n<30 || n>350 || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day>today()) return notify('Informe um peso válido e data não futura.');
    const existing=state.weights.find(w=>w.date===day);
    if(existing) {existing.weight=n;existing.initial=false;}
    else state.weights.push({id:`weight-${Date.now()}`,date:day,weight:n});
    save();render();notify('Peso registrado. Acompanhe a tendência semanal.');
  }
  function setGoal(form) {
    const data=new FormData(form), start=E.cleanNumber(data.get('startWeight')),goal=E.cleanNumber(data.get('targetWeight'));
    const deadline=String(data.get('goalDate'));
    if(start===null||goal===null||start<=goal||goal<30||start>350||!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return notify('Confira pesos e data. A meta deve ser menor que o peso inicial.');
    Object.assign(state.settings,{startWeight:start,targetWeight:goal,goalDate:deadline});save();render();notify('Meta atualizada.');
  }
  function saveExercise(form) {
    const fd=new FormData(form), existing=ui.editor.id?exerciseFor(ui.editor.id):null;
    const sets=Number(fd.get('sets')),low=Number(fd.get('low')),high=Number(fd.get('high')),step=Number(fd.get('step'));
    const name=String(fd.get('name')||'').trim();
    if(!name || name.length>100|| !Number.isInteger(sets)||sets<1||sets>12||
      !Number.isInteger(low)||!Number.isInteger(high)||low<1||high>50||high<low||step<=0||step>50)
      return notify('Confira o nome, as séries, repetições e o incremento.');
    const patch={name,sets,low,high,step,unit:fd.get('unit')==='kg/halter'?'kg/halter':'kg',
      mode:fd.get('mode')==='pyramid'?'pyramid':'double',knee:fd.has('knee'),active:fd.has('active')};
    if(existing) Object.assign(existing,patch);
    else state.exercises.push({id:`custom-${Date.now()}`,group:ui.editor.group,...patch});
    ui.editor=null;save();render();notify('Exercício salvo.');
  }
  function finishWorkout() {
    const result=[];
    for (const raw of Object.values(ui.draft.entries)) {
      const ex=exerciseFor(raw.id), sets=[];
      for (const row of raw.sets) {
        const load=E.cleanNumber(row.load),reps=E.cleanNumber(row.reps),rir=E.cleanNumber(row.rir);
        if (reps===null) continue; // cargas sugeridas sem execucao nao viram historico
        if (load===null||load<=0||load>1500||!Number.isInteger(reps)||reps<1||reps>100||
          (rir!==null && (!Number.isInteger(rir)||rir<0||rir>10)))
          return notify(`Confira carga, repetições e RIR de ${ex.name}.`);
        sets.push({load,reps,rir,warmup:!!row.warmup});
      }
      if (!sets.some(s=>!s.warmup)) continue;
      if (ex.knee && (raw.pain==='' || raw.pain===null))
        return notify(`Informe a dor no joelho (mesmo que zero) em ${ex.name}.`);
      result.push({id:ex.id,sets,pain:ex.knee?Number(raw.pain):null});
    }
    if(!result.length) return notify('Registre pelo menos uma série efetiva com carga e repetições.');
    const now=new Date();
    state.sessions.push({id:`session-${now.getTime()}-${Math.random().toString(36).slice(2,6)}`,planId:ui.draft.planId,
      timestamp:now.toISOString(),day:today(),entries:result,kneeNextDay:null,
      plannedIds:[...ui.draft.plannedIds],skipped:F.skippedForSave(ui.draft),
      energy:ui.draft.energy,notes:ui.draft.notes.trim().slice(0,1000)});
    if (!save()) {
      state.sessions.pop();
      return notify('Não foi possível salvar o histórico. O rascunho foi mantido; não feche esta página.');
    }
    const discomfort=result.some(en=>en.pain!==null && en.pain>0);
    clearDraft();ui.tab='history';render();window.scrollTo(0,0);
    notify(discomfort?'Treino salvo. Como houve desconforto no joelho, não aumente a carga.':'Treino salvo. Histórico e treinos pendentes atualizados.');
  }
  function saveKnee(id) {
    const session=state.sessions.find(s=>s.id===id);
    if(!session) return;
    if(Date.now()-new Date(session.timestamp).getTime()<86400000) return notify('Registre a resposta do joelho após pelo menos 24 horas.');
    const sel=document.querySelector(`[data-after-day="${id}"]`);
    if(!sel||sel.value==='') return notify('Selecione a dor observada no dia seguinte, inclusive 0.');
    session.kneeNextDay=Number(sel.value);save();render();notify('Resposta do joelho salva no histórico.');
  }
  function download(name,content,type) {
    const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportJSON() {download(`forja-backup-${today()}.json`,JSON.stringify(state,null,2),'application/json;charset=utf-8');notify('Backup exportado. Guarde em local seguro.');}
  const csvSafe = v=> {
    const txt=String(v??'');const safe=/^[=+@\-\t\r]/.test(txt)?`'${txt}`:txt;
    return `"${safe.replace(/"/g,'""')}"`;
  };
  function exportCSV() {
    const rows=[['Data','Treino','Exercício','Série','Aquecimento','Carga (unidade indicada)','Unidade','Repetições','RIR','Dor no joelho durante','Dor no dia seguinte']];
    latestSessions().forEach(s=>s.entries.forEach(en=>en.sets.forEach((set,i)=>rows.push([
      s.day,s.planId,exerciseFor(en.id)?.name||en.id,i+1,set.warmup?'sim':'não',set.load,exerciseFor(en.id)?.unit||'kg',set.reps,set.rir??'',en.pain??'',s.kneeNextDay??'']))));
    download(`forja-series-${today()}.csv`,'\ufeff'+rows.map(row=>row.map(csvSafe).join(';')).join('\r\n'),'text/csv;charset=utf-8');
    notify('Planilha CSV exportada.');
  }
  async function importJSON(file) {
    if(!file) return;
    if(file.size>5*1024*1024)return notify('Arquivo muito grande (limite de 5 MB).');
    try{
      const parsed=JSON.parse(await file.text());
      if(!validState(parsed))throw new Error('Estrutura incompatível');
      M.ensureArchive(parsed);
      if(!M.validArchive(parsed.muay))throw new Error('Histórico de Muay Thai inválido');
      if(!confirm('Importar este backup substitui os registros salvos neste aparelho. Continuar?')) return;
      const oldState=state;
      state=parsed;
      if (!save()) {state=oldState;return notify('Importação não concluída: falha ao salvar o histórico.');}
      clearDraft();muayMode=false;ui.editor=null;ui.tab='home';render();notify('Backup importado com sucesso.');
    }catch(err){notify('Não foi possível importar: verifique se é um backup FORJA válido.');}
    document.getElementById('import-file').value='';
  }
  function handleAction(btn) {
    const action=btn.dataset.action;
    if(action==='flex-catalog-toggle'){if(!ui.draft)return;ui.catalogOpen=!ui.catalogOpen;render();return;}
    if(action==='flex-add'){
      const draft=ui.draft,id=btn.dataset.ex;if(!draft)return;
      const found=F.prepareCatalog(id,state.exercises);
      if(!found)return notify('Exercício não encontrado no catálogo.');
      if(found.isNew && state.exercises.length>=200)return notify('Limite de exercícios atingido.');
      if(!F.addToDraft(draft,id,found.exercise,{id,sets:found.exercise.example?copy(found.exercise.example):
        Array.from({length:found.exercise.sets},()=>({load:'',reps:'',rir:'',warmup:false})),pain:''}))return notify('Exercício já incluído ou limite alcançado.');
      if(found.isNew){
        state.exercises.push(found.exercise);
        if(!save()){state.exercises.pop();delete draft.entries[id];draft.addedIds=draft.addedIds.filter(v=>v!==id);return;}
      }
      if(!persistDraft())return notify('Não foi possível salvar o rascunho. Não feche a página.');
      ui.catalogOpen=false;render();notify('Exercício adicionado apenas ao treino do dia.');return;
    }
    if(action==='flex-withdraw'){
      const result=F.withdraw(ui.draft,btn.dataset.ex);
      if(result.error)return notify(result.error);
      if(!persistDraft())return notify('Não foi possível salvar a alteração.');
      render();return;
    }
    if(action==='flex-restore'){
      if(!F.restore(ui.draft,btn.dataset.ex))return;
      if(!persistDraft())return notify('Não foi possível salvar a alteração.');
      render();return;
    }
    if(action==='calendar-shift'){
      const shift=Number(btn.dataset.delta);
      if(![-1,1].includes(shift))return;
      ui.calendarMonth=CAL.shiftMonth(ui.calendarMonth,shift);
      ui.calendarDay=null;render();
      document.getElementById('training-calendar')?.scrollIntoView({block:'start'});
      return;
    }
    if(action==='calendar-today'){
      ui.calendarMonth=today().slice(0,7);ui.calendarDay=today();
      render();document.getElementById('training-calendar')?.scrollIntoView({block:'start'});return;
    }
    if(action==='calendar-select'){
      const date=btn.dataset.day;
      if(!CAL.validDay(date)||date.slice(0,7)!==ui.calendarMonth)return;
      ui.calendarDay=date;render();
      document.getElementById('calendar-selected-heading')?.scrollIntoView({block:'nearest'});
      return;
    }
    if(action==='open-muay'){muayMode=true;ui.tab='plans';ui.editor=null;render();window.scrollTo(0,0);return;}
    if(action==='mode-muay'){muayMode=true;ui.editor=null;render();return;}
    if(action==='mode-strength'){muayMode=false;render();return;}
    if(action==='muay-start'){state.muay.draft=M.draft(today(),btn.dataset.place);save();render();return;}
    if(action==='muay-preset' || action==='muay-custom'){
      const d=state.muay.draft;
      if(!d||d.activities.length>=30)return notify('Limite de 30 exercícios por sessão.');
      const preset=action==='muay-preset'?M.PRESETS[Number(btn.dataset.preset)]:null;
      if(action==='muay-preset'&&!preset)return;
      d.activities.push(M.activity(preset?.name||'',preset?.unit||'reps'));save();render();return;
    }
    if(action==='muay-remove'){
      const d=state.muay.draft;if(!d)return;
      d.activities=d.activities.filter(a=>a.id!==btn.dataset.id);save();render();return;
    }
    if(action==='muay-finish'){
      const d=state.muay.draft;if(!d)return;
      const result=M.finishDraft(d,today());if(result.error)return notify(result.error);
      let original=null;
      if(d.editingId){
        const index=state.muay.sessions.findIndex(x=>x.id===d.editingId);
        if(index<0)return notify('Registro original não encontrado.');
        original=state.muay.sessions[index];
        result.session.timestamp=original.timestamp;
        state.muay.sessions[index]=result.session;
      }else state.muay.sessions.push(result.session);
      state.muay.draft=null;
      if(!save()){state.muay.draft=d;if(d.editingId){state.muay.sessions=state.muay.sessions.map(s=>s.id===d.editingId?original:s);}else state.muay.sessions.pop();return;}
      ui.tab='history';render();notify('Treino de Muay Thai salvo.');return;
    }
    if(action==='muay-cancel'){
      if(confirm('Descartar o rascunho de Muay Thai?')){state.muay.draft=null;save();render();}
      return;
    }
    if(action==='muay-edit'){
      const record=state.muay.sessions.find(x=>x.id===btn.dataset.id);
      if(!record)return;
      if(state.muay.draft && !confirm('Substituir o rascunho atual?'))return;
      state.muay.draft=M.draftFromSession(record);muayMode=true;ui.tab='plans';save();render();return;
    }
    if(action==='muay-delete'){
      if(!confirm('Excluir permanentemente este registro de Muay Thai?'))return;
      const backup=state.muay.sessions;
      state.muay.sessions=backup.filter(x=>x.id!==btn.dataset.id);
      if(!save()){state.muay.sessions=backup;return;}render();notify('Registro excluído.');return;
    }
    if(action==='navigate') {ui.tab=btn.dataset.to;ui.editor=null;render();window.scrollTo(0,0);}
    else if(action==='select-plan') {ui.plan=btn.dataset.plan;render();}
    else if(action==='start') startWorkout(btn.dataset.plan);
    else if(action==='add-set') {const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length<12){en.sets.push({load:'',reps:'',rir:'',warmup:false});persistDraft();render();}}
    else if(action==='remove-set'){const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length>1){en.sets.pop();persistDraft();render();}}
    else if(action==='toggle-warmup'){const set=ui.draft?.entries[btn.dataset.ex]?.sets[Number(btn.dataset.index)];if(set){set.warmup=!set.warmup;persistDraft();render();}}
    else if(action==='apply-reco'){
      const ex=exerciseFor(btn.dataset.ex), en=ui.draft?.entries[btn.dataset.ex], rec=E.recommend(ex,state.sessions);
      if(en&&rec.level==='increase'){
        const work=en.sets.filter(s=>!s.warmup);const heaviest=work.reduce((best,s)=> Number(s.load)>=Number(best?.load??-1)?s:best,null);
        if(heaviest) {heaviest.load=rec.next;persistDraft();render();notify('Carga sugerida aplicada à série mais pesada. Ajuste conforme sua execução.');}
      }
    }
    else if(action==='finish')finishWorkout();
    else if(action==='strength-group') {
      const group = btn.dataset.group;
      if (!DATA.rotation.includes(group)) return;
      ui.strengthGroup = ui.strengthGroup === group ? null : group;
      ui.strengthExercise = null;
      render();
      if (ui.strengthGroup) document.getElementById('strength-group-details')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
    else if(action==='strength-exercise') {
      const ex = exerciseFor(btn.dataset.ex);
      if (!ex || ex.group !== ui.strengthGroup) return;
      ui.strengthExercise = ex.id;
      render();
      document.getElementById('strength-exercise-panel')?.scrollIntoView({behavior:'smooth', block:'nearest'});
    }
    else if(action==='strength-close') {
      ui.strengthGroup = null; ui.strengthExercise = null;
      render();
      document.getElementById('strength-radar-title')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
    else if(action==='resume'){if(ui.draft){ui.tab='plans';ui.plan=ui.draft.planId;render();window.scrollTo(0,0);}}
    else if(action==='cancel'){if(confirm('Descartar o treino em andamento e apagar seu rascunho salvo neste aparelho?')){clearDraft();render();}}
    else if(action==='edit-ex'){ui.editor={id:btn.dataset.ex};render();window.scrollTo(0,0);}
    else if(action==='add-ex'){ui.editor={id:null,group:btn.dataset.plan};render();window.scrollTo(0,0);}
    else if(action==='exit-editor'){ui.editor=null;render();}
    else if(action==='save-knee')saveKnee(btn.dataset.id);
    else if(action==='export-json')exportJSON();
    else if(action==='export-csv')exportCSV();
    else if(action==='import-json')document.getElementById('import-file').click();
    else if(action==='reset'){
      if(confirm('Apagar permanentemente todos os registros deste aparelho? Exporte um backup antes de continuar.')){
        state=initial();clearDraft();muayMode=false;ui.editor=null;ui.tab='home';save();render();notify('Registros locais redefinidos.');
      }
    }
  }
  document.getElementById('nav').addEventListener('click',event=>{
    const btn=event.target.closest('[data-tab]');if(!btn)return;
    ui.editor=null;ui.tab=btn.dataset.tab;render();window.scrollTo(0,0);
  });
  const screen=document.getElementById('screen');
  screen.addEventListener('click',event=>{
    const btn=event.target.closest('[data-action]');if(btn)handleAction(btn);
  });
  function updateMuayField(event) {
    const el=event.target,d=state.muay.draft;
    if(!d)return;
    if(el.dataset.muayField){
      const field=el.dataset.muayField;
      if(!['day','place','kind','duration','intensity','fatigue','kneePain','notes'].includes(field))return;
      d[field]=el.value;
    }else if(el.dataset.muayId && el.dataset.muayProp){
      const row=d.activities.find(a=>a.id===el.dataset.muayId);
      if(!row || !['name','sets','quantity','unit'].includes(el.dataset.muayProp))return;
      row[el.dataset.muayProp]=el.value;
    }else return;
    if(!save())notify('Rascunho não salvo. Exporte seus dados.');
  }
  screen.addEventListener('input',event=>{
    collectDraft(event);updateMuayField(event);
    if(event.target.id==='flex-catalog-search'){
      const query=event.target.value.toLocaleLowerCase('pt-BR').trim();
      document.querySelectorAll('[data-flex-name]').forEach(row=>{
        row.hidden=!row.dataset.flexName.includes(query);
      });
    }
  });
  window.addEventListener('pagehide', () => { if(ui.draft) persistDraft(); });
  screen.addEventListener('change',event=>{
    collectDraft(event);
    updateMuayField(event);
    const el=event.target;
    if(el.dataset.skipReason && ui.draft){
      if(F.setReason(ui.draft,el.dataset.skipReason,el.value))persistDraft();
      return;
    }
    if(el.dataset.setting){state.settings[el.dataset.setting]=el.value;save();render();}
    else if(el.dataset.exActive){const ex=exerciseFor(el.dataset.exActive);if(ex){ex.active=el.checked;save();render();}}
  });
  screen.addEventListener('submit',event=>{
    event.preventDefault();
    if(event.target.id==='weight-form')setWeight(event.target);
    else if(event.target.id==='goal-form')setGoal(event.target);
    else if(event.target.id==='exercise-form')saveExercise(event.target);
  });
  document.getElementById('import-file').addEventListener('change',event=>importJSON(event.target.files?.[0]));
  render();
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline indisponível',err)));
  }
})();
