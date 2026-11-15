(function () {
  'use strict';
  const DATA = window.AcademiaData;
  const E = window.AcademiaEngine;
  const M = window.AcademiaMuay;
  const CAL = window.ForjaCalendar;
  const F = window.ForjaFlex;
  const ADVICE = window.ForjaCatalogAdvice;
  const DOSE = window.ForjaDose;
  const FOCUS = window.ForjaFocus;
  const BODY = window.ForjaBodyMeasures;
  const ACT = window.ForjaActivity;
  const REM = window.ForjaReminders;
  const PLANNER = window.ForjaGoalPlanner;
  const HEALTH = window.ForjaHealthImport;
  const NUTRITION = window.ForjaNutrition;
  const NUI = window.ForjaNutritionUI;
  const NCAT = window.ForjaNutritionCatalog;
  // Graceful fallback if an old cached shell loads without the optional visual module.
  const MOTION = window.ForjaExerciseMotion || {has:()=>false,thumb:()=>'',viewer:()=>''};
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
      sessions: [], exercises: copy(DATA.exercises), muay: M.archive(), bodyMeasurements:[],bioimpedance:[],activitySteps:[],healthMonthly:[],healthWeightReports:[],reminderPrefs:{enabled:true,items:{}}, nutrition:NUTRITION.archive(),
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return initial();
      const parsed = JSON.parse(raw);
      if (!validState(parsed)) throw new Error('Backup incompatível');
      const upgradedMuay = M.ensureArchive(parsed);
      const upgradedNutrition = NUTRITION.ensureArchive(parsed);
      if (!M.validArchive(parsed.muay)) throw new Error('Dados Muay Thai incompatíveis');
      const upgradedReferences = migrateReferences(parsed);
      if (upgradedMuay || upgradedNutrition || upgradedReferences) {
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
      BODY.validRecords(value.bodyMeasurements) && BODY.validBioRecords(value.bioimpedance) && ACT.validSteps(value.activitySteps) && HEALTH.validMonthlyList(value.healthMonthly) && HEALTH.validWeightReports(value.healthWeightReports) && REM.validPrefs(value.reminderPrefs) && NUTRITION.validArchive(value.nutrition) &&
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
    catalogOpen: false, catalogAll: false, catalogMode:'replacement',
    catalogGroup:'all',catalogSearch:'',
    focusedMode: false, focusedExercise: null,
    calendarMonth: today().slice(0,7), calendarDay: today(),
    bodyOpen:false,bodyView:'current',bodyEditDate:null,bioOpen:false,bioEditDate:null,homeRecoveryOpen:false,
    nutritionOpen:false,nutritionEditId:null,nutritionLimit:3,nutritionPicked:null,
    historyStrengthLimit:3,historyMuayLimit:3,historyCalendarOpen:false,
  };
  const diary=NUI.controller({get:()=>state,today,refresh:render,notify,
    commitSteps(next){
      if(!ACT.validSteps(next))return false;
      const old=state.activitySteps;state.activitySteps=next;
      if(!save()){state.activitySteps=old;return false;}return true;
    },
    commit(next){
      if(!NUTRITION.validArchive(next)){notify('Dados incompatíveis; revise os campos e limites.');return false;}
      const previous=state.nutrition;state.nutrition=next;
      if(!save()){state.nutrition=previous;return false;}return true;
    }
  });
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
  const checkin=()=>FOCUS.todayCheckin(state.settings,today());
  const recoverySettings=()=>{
    const c=checkin();
    return {...state.settings,
      fatigue:c?.fatigue||'normal',
      kneePain:c?.kneePain??''};
  };
  const maxKneePain = () => {
    const knee=checkin()?.kneePain;
    return knee==null||knee===''?null:Number(knee);
  };
  function reviewWarning(draft) {
    const review=FOCUS.review(draft?.entries);
    const issues=[];
    if(review.partialSets)issues.push(review.partialSets+' série(s) com repetições, mas sem carga válida; revise antes de salvar');
    if(review.missingRir)issues.push(review.missingRir+' série(s) sem RIR; serão salvas, mas reduzem a precisão das recomendações');
    if(review.skipped)issues.push(review.skipped+' exercício(s) ainda sem execução: serão marcados como pulados');
    return {review,issues};
  }
  function renderRecoveryCheckin() {
    const c=checkin(),energy=c?.energy||'';
    return `<section class="card recovery-checkin" aria-labelledby="recovery-checkin-heading">
      <div class="row-between"><h2 id="recovery-checkin-heading" class="section-title">Como você está hoje?</h2>
        <span class="pill">${c?'Registrado hoje':'Ainda não registrado'}</span></div>
      <p class="small muted">Check-in de hoje, não herdado de outro dia. Ajuda a decidir entre treino e recuperação; você pode deixar campos sem informar.</p>
      <div class="recovery-energy" role="group" aria-label="Energia de hoje">
        ${[['boa','Bem recuperado'],['normal','Energia normal'],['baixa','Pouca energia']].map(([value,label])=>`
          <button type="button" class="secondary ${energy===value?'selected':''}" data-action="recovery-energy" data-value="${value}" aria-pressed="${energy===value}">${label}</button>`).join('')}
      </div>
      <div class="field-row mt-12"><div class="field"><label for="recovery-fatigue">Fadiga das pernas hoje</label>
        <select id="recovery-fatigue" data-recovery-field="fatigue">
        ${[['normal','Normal'],['moderada','Moderada'],['alta','Alta']].map(([value,label])=>`<option value="${value}" ${c?.fatigue===value?'selected':''}>${label}</option>`).join('')}</select></div>
        <div class="field"><label for="recovery-knee">Dor no joelho hoje</label>
        <select id="recovery-knee" data-recovery-field="kneePain">${painOptions(c?.kneePain??'')}</select></div></div>
      <p class="small muted mt-8">Sem check-in novo, o histórico anterior não é interpretado como recuperação atual.</p>
    </section>`;
  }
  const getNext = () => {
    const suggested=E.nextWorkout(state.sessions,recoverySettings().fatigue,maxKneePain(),DATA.rotation);
    const muay=M.readiness(state.muay.sessions,today(),recoverySettings());
    const current=checkin();
    if(current && (current.energy==='baixa'||current.fatigue==='alta'))
      return {...suggested,id:null,rest:true,modified:true,
        reason:'O check-in de hoje indica energia baixa ou fadiga alta. Considere descanso ou recuperação leve antes de decidir por outro treino; os blocos continuam pendentes.'};
    if(muay.activities && muay.days<=1 && muay.level==='rest' && !suggested.rest)
      return {...suggested,id:null,rest:true,modified:true,
        reason:'Recuperação recomendada após Muay Thai recente: '+muay.note};
    if(muay.activities && muay.days<=1 && muay.level==='light' &&
       suggested.id && ['C','D'].includes(suggested.id)){
      const upper=suggested.pending.find(id=>['A','B'].includes(id));
      if(upper)return {...suggested,id:upper,rest:false,modified:true,
        reason:'Muay Thai recente com esforço significativo: priorize superiores se estiver recuperado. '+muay.note};
      return {...suggested,id:null,rest:true,modified:true,
        reason:'Pernas foram exigidas recentemente no Muay Thai: '+muay.note};
    }
    return suggested;
  };
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
      ui.tab === 'home' ? renderHome() : ui.tab === 'plans' ? renderPlans() : ui.tab === 'catalog' ? renderCatalog() :
      ui.tab === 'nutrition' ? diary.render() : ui.tab === 'progress' ? (ui.bodyOpen ? renderBodyMeasures() : renderProgress()) : ui.tab === 'history' ? renderHistory() : renderSettings();
    if(ui.tab==='nutrition')diary.mount();
    document.querySelectorAll('#nav [data-tab]').forEach(btn=>{
      const active=btn.dataset.tab===ui.tab||(ui.tab==='catalog'&&btn.dataset.tab==='plans');
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
  function renderReminderPanel(context='home'){
    const report=REM.assess(state,today());
    const suggestions=report.visible;
    if(report.disabled||suggestions.length===0)return '';
    const focus=suggestions[0],rest=suggestions.slice(1);
    const actionButton=(item,label,kind,days)=>'<button type="button" class="button-inline reminder-action" data-action="'+kind+
      '" data-reminder="'+esc(item.id)+'" data-signature="'+esc(item.signature)+'"'+(days?' data-days="'+days+'"':'')+'>'+label+'</button>';
    const cards=item=>'<div class="reminder-secondary"><strong>'+esc(item.headline)+'</strong><p>'+esc(item.reason)+'</p>'+
      '<div class="reminder-actions">'+actionButton(item,'Conferir','reminder-open')+
      actionButton(item,'Lembrar depois','reminder-snooze',14)+actionButton(item,'Dispensar','reminder-dismiss')+'</div></div>';
    return '<aside class="reminder-panel" aria-labelledby="reminders-title"><span class="reminder-subtle-badge">Revisão sugerida</span>'+
      '<h2 id="reminders-title">'+esc(focus.headline)+'</h2><p class="small">'+esc(focus.reason)+'</p>'+
      '<div class="reminder-actions">'+actionButton(focus,'Conferir','reminder-open')+
      actionButton(focus,'Lembrar em 14 dias','reminder-snooze',14)+actionButton(focus,'Dispensar','reminder-dismiss')+'</div>'+
      '<details class="reminder-why"><summary>Por que apareceu?</summary><p>'+esc(focus.footnote)+
      ' É um lembrete de qualidade dos dados, não uma exigência ou diagnóstico.</p></details>'+
      (rest.length?'<details class="reminder-more"><summary>Outras sugestões ('+rest.length+')</summary>'+
        rest.map(cards).join('')+'</details>':'')+
      '<button type="button" class="reminder-manage" data-action="reminder-manage">Gerenciar lembretes</button></aside>';
  }
  function renderReminderPreferences(){
    const report=REM.assess(state,today());
    const current=state.reminderPrefs?.enabled!==false;
    return '<section class="card reminder-settings" aria-label="Preferências dos lembretes">'+
      '<div class="row-between"><div><h2 class="section-title">Lembretes opcionais</h2>'+
      '<p class="small muted">Sugestões discretas de revisar dados. Sem notificações automáticas e sem bloquear treinos.</p></div>'+
      '<span class="reminder-pref-state">'+(current?'Ativados':'Desativados')+'</span></div>'+
      '<button type="button" class="secondary full mt-12" data-action="reminder-toggle">'+
      (current?'Desativar lembretes de revisão':'Ativar lembretes de revisão')+'</button>'+
      (report.suppressed?'<p class="small muted mt-12">'+report.suppressed+' sugestão(ões) adiada(s) ou dispensada(s).</p>':'')+
      '<p class="tiny muted">Você pode dispensar cada sugestão individualmente. Ela volta apenas se a condição mudar de forma relevante.</p></section>';
  }
  function handleReminderAction(btn){
    const action=btn.dataset.action;
    if(action==='reminder-toggle'){
      const result=REM.setEnabled(state.reminderPrefs,state.reminderPrefs?.enabled===false);
      if(result.error)return notify(result.error);
      const old=state.reminderPrefs;state.reminderPrefs=result.prefs;
      if(!save()){state.reminderPrefs=old;return;}
      render();notify('Preferência de lembretes salva.');return;
    }
    if(action==='reminder-open'){
      const current=REM.assess(state,today()).visible.find(x=>x.id===btn.dataset.reminder&&x.signature===btn.dataset.signature);
      if(!current)return render();
      if(current.action==='weight'){ui.tab='progress';ui.bodyOpen=false;render();document.getElementById('weight-form')?.scrollIntoView({block:'start'});}
      else if(current.action==='body'){ui.tab='progress';ui.bodyOpen=true;ui.bodyView='current';render();document.getElementById('body-measures-form')?.scrollIntoView({block:'start'});}
      else if(current.action==='bio'){ui.tab='progress';ui.bodyOpen=true;ui.bodyView='current';ui.bioOpen=true;render();document.querySelector('.bio-panel')?.scrollIntoView({block:'start'});}
      else{ui.tab='nutrition';render();diary.goals();if(current.action==='activity')document.querySelector('#nd-steps-panel')?.setAttribute('open','');}
      return;
    }
    const current=REM.assess(state,today()).visible.find(x=>x.id===btn.dataset.reminder&&x.signature===btn.dataset.signature);
    if(!current)return render();
    const kind=action==='reminder-dismiss'?'dismiss':'snooze';
    const result=REM.changePreference(state.reminderPrefs,current.id,current.signature,kind,today(),Number(btn.dataset.days)||14);
    if(result.error)return notify(result.error);
    const old=state.reminderPrefs;state.reminderPrefs=result.prefs;
    if(!save()){state.reminderPrefs=old;return;}
    render();notify(kind==='dismiss'?'Sugestão dispensada.':'Sugestão adiada.');return;
  }
  function renderHome() {
    const next=getNext(),plan=next.id?planFor(next.id):null;
    const pending=dueKnee(),last=latestSessions()[0],check=checkin();
    const checkLabel=check ? (check.energy==='baixa'?'Pouca energia':check.energy==='boa'?'Bem recuperado':'Energia normal') : 'Não informado';
    const block=ui.draft?planFor(ui.draft.planId):null;
    return `${headline('Hoje','Seu próximo passo.','Comece o treino ou informe como está se sentindo.')}
      <section class="home-primary card" aria-labelledby="home-primary-title">
        <div class="row-between"><span class="home-step-label">${ui.draft?'EM ANDAMENTO':next.rest?'RECUPERAÇÃO SUGERIDA':'TREINO SUGERIDO'}</span>
          ${tag(ui.draft?`Bloco ${ui.draft.planId}`:next.rest?'Descanso':`Bloco ${next.id}`,ui.draft||!next.rest?'green':'amber')}</div>
        <h2 id="home-primary-title">${ui.draft?esc(block.title):plan?esc(plan.title):'Recuperar antes de treinar'}</h2>
        <p class="home-primary-summary">${ui.draft?'Você já começou esta sessão. Continue de onde parou.':plan?esc(plan.subtitle):'Seus blocos continuam pendentes. Reavalie como você está antes de iniciar.'}</p>
        ${next.rest&&!ui.draft?`<p class="home-rest-reason">${esc(next.reason)}</p>`:''}
        ${ui.draft?`<button class="primary full home-main-action" data-action="resume">Continuar treino</button>`:
          plan?`<button class="primary full home-main-action" data-action="start" data-plan="${next.id}">Iniciar treino ${next.id}</button>`:
          `<button class="secondary full home-main-action" data-action="navigate" data-to="plans">Ver meus treinos</button>`}
        <div class="home-secondary-actions">
          <button class="button-inline" data-action="navigate" data-to="plans">Escolher outro bloco</button>
          ${!ui.draft&&!next.rest?`<details class="home-reason"><summary>Por que este treino?</summary><p>${esc(next.reason)}</p></details>`:''}
        </div>
      </section>
      ${pending.length?`<div class="callout warn home-pending"><strong>Joelho: avaliação pendente</strong>
        <p>Há ${pending.length} treino(s) aguardando registro após 24h.
        <button class="button-inline" data-action="navigate" data-to="history">Avaliar no histórico</button></p></div>`:''}
      ${renderReminderPanel('home')}
      <details class="home-recovery" ${ui.homeRecoveryOpen?'open':''}>
        <summary><span><strong>Como está sua recuperação hoje?</strong><small>${esc(checkLabel)}</small></span>
          <span class="home-recovery-action">${check?'Atualizar':'Informar'} <span aria-hidden="true">⌄</span></span></summary>
        <div class="home-recovery-body">${renderRecoveryCheckin()}</div>
      </details>
      <div class="home-minimal-links">
        ${last?`<button class="home-last-session" data-action="navigate" data-to="history">
          <span><small>ÚLTIMO TREINO · ${dateBR(last.day)}</small><strong>${esc(planFor(last.planId).title)}</strong></span><span aria-hidden="true">›</span>
        </button>`:''}
        <button class="home-muay-link" data-action="open-muay"><span>Registrar Muay Thai</span><span aria-hidden="true">›</span></button>
        <button class="home-muay-link" data-action="nutrition-open"><span>Registrar alimentação</span><span aria-hidden="true">›</span></button>
      </div>
      <p class="home-footer-note">Metas, peso, gráficos e análise de volume ficam na aba Evolução.</p>`;
  }
  function renderCatalog() {
    // F.options merges custom exercises, active plans and curated alternatives
    // without filtering by workout-in-progress. Browsing never changes a draft.
    const all=F.options(state.exercises,null);
    const known=new Map(state.exercises.map(ex=>[ex.id,ex]));
    const shown=all.filter(ex=>ui.catalogGroup==='all'||ex.group===ui.catalogGroup);
    const term=ui.catalogSearch.toLocaleLowerCase('pt-BR').trim();
    const count=shown.filter(ex=>[ex.name,ex.muscle,ex.equipment].some(value=>
      String(value||'').toLocaleLowerCase('pt-BR').includes(term))).length;
    return `${headline('Biblioteca','Catálogo de exercícios.','Explore todos os movimentos sem iniciar um treino.')}
      <search class="catalog-browser-tools" aria-label="Pesquisar e filtrar exercícios">
        <label for="catalog-search">Buscar exercício ou equipamento</label>
        <input id="catalog-search" type="search" value="${esc(ui.catalogSearch)}" placeholder="Ex.: supino, polia, halter..." autocomplete="off" aria-controls="catalog-browser-results" />
      </search>
      <div class="catalog-group-tabs" role="group" aria-label="Filtrar por bloco">
        ${[['all','Todos'],['A','Costas'],['B','Peito'],['C','Quadríceps'],['D','Posteriores']].map(([group,label])=>
          `<button type="button" class="catalog-group-chip ${ui.catalogGroup===group?'selected':''}"
             data-action="catalog-filter" data-group="${group}" aria-pressed="${ui.catalogGroup===group}">${label}</button>`).join('')}
      </div>
      <div class="catalog-browser-head">
        <h2 class="section-title">Todos os exercícios</h2>
        <output id="catalog-count" aria-live="polite">${count} de ${all.length} movimentos</output>
      </div>
      <div class="catalog-browser-results" id="catalog-browser-results">
        ${shown.map(ex=>{
          const existing=known.get(ex.id);
          const status=existing?(existing.active?'Na ficha':'Inativo'):'Disponível';
          const description=[ex.muscle,ex.equipment].filter(Boolean).join(' · ');
          const visualTag=MOTION.variantLabel?.(ex.id)||'';
          const searchable=[ex.name,ex.muscle,ex.equipment].join(' ').toLocaleLowerCase('pt-BR');
          return `<article class="catalog-browser-item" data-catalog-item
                   data-search="${esc(searchable)}" ${searchable.includes(term)?'':'hidden'}>
            <div class="catalog-browser-header">
              <span class="catalog-group-code">BLOCO ${esc(ex.group)}</span>
              <span class="catalog-state ${existing?.active?'is-active':''}">${status}</span>
            </div>
            <div class="catalog-browser-main">${MOTION.thumb(ex.id)}
              <div class="catalog-browser-summary"><h3>${esc(ex.name)}</h3>
              <p class="catalog-browser-description">${esc(description)}</p>
              ${visualTag?`<span class="motion-variant-label">${esc(visualTag)}</span>`:""}
              ${MOTION.has(ex.id)?`<button type="button" class="motion-inline-trigger" data-action="motion-open" data-ex="${esc(ex.id)}" aria-label="Ver movimento: ${esc(ex.name)}">▶ Ver movimento</button>`:''}</div>
            </div>
            <div class="catalog-browser-bottom">
              <span>${ex.sets} séries · ${ex.low}–${ex.high} reps</span>
              ${existing?
                `<button type="button" class="button-inline" data-action="${existing.active?'edit-ex':'catalog-activate'}" data-ex="${esc(ex.id)}">${existing.active?'Editar':'Ativar na ficha'}</button>`:
                `<button type="button" class="button-inline" data-action="catalog-add-plan" data-ex="${esc(ex.id)}">Adicionar à ficha</button>`}
            </div>
          </article>`;
        }).join('')}
      </div>
      <p class="catalog-empty-state" id="catalog-empty-state" ${count?'hidden':''}>Nenhum exercício encontrado. Experimente outro nome ou grupo.</p>
      <p class="tiny muted catalog-browser-tip">As alterações na ficha são opcionais. Explorar o catálogo não inicia nem modifica um treino em andamento.</p>`;
  }
  function filterCatalogDOM(){
    const term=ui.catalogSearch.toLocaleLowerCase('pt-BR').trim();
    let visible=0;
    document.querySelectorAll('[data-catalog-item]').forEach(item=>{
      const match=item.dataset.search.includes(term);
      item.hidden=!match;
      if(match)visible++;
    });
    const total=F.options(state.exercises,null).length;
    const output=document.getElementById('catalog-count');
    if(output)output.textContent=visible+' de '+total+' movimentos';
    const empty=document.getElementById('catalog-empty-state');
    if(empty)empty.hidden=visible>0;
  }
  function painOptions(current) {
    return [['','Não informado'],['0','0 · Sem dor'],['1','1 · Mínima'],['2','2 · Leve'],['3','3 · Moderada'],['4','4 · Importante'],['5','5+ · Forte']]
      .map(([v,label])=>`<option value="${v}" ${String(current??'')===v?'selected':''}>${label}</option>`).join('');
  }
  function renderMuay() {
    return '<div class="tabs muay-mode-tabs"><button class="tab-chip" data-action="mode-strength">Musculação</button><button class="tab-chip selected" aria-current="page">Muay Thai</button></div>' + M.renderPage(state.muay, today(),recoverySettings());
  }
  function renderPlans() {
    const next=getNext(), p=planFor(ui.plan);
    const all=state.exercises.filter(x=>x.group===ui.plan);
    return `<div class="tabs muay-mode-tabs"><button class="tab-chip selected" aria-current="page">Musculação</button><button class="tab-chip" data-action="mode-muay">Muay Thai</button></div>${headline('Seu planejamento','Treinos flexíveis.','A → C → B → D. Cada bloco realizado sai da fila; os outros continuam pendentes.')}
      <button class="secondary full mt-12" data-action="navigate" data-to="catalog">Catálogo de exercícios</button>
      ${resumeBanner()}
      ${renderQueue(next)}
      <div class="tabs plan-block-selector" role="group" aria-label="Escolher grupo de treino">
      ${DATA.plans.map(plan => {
        const label=plan.title.split(" ")[0];
        return `<button type="button" class="tab-chip plan-block-choice ${ui.plan===plan.id?'selected':''}" data-action="select-plan" data-plan="${plan.id}" aria-pressed="${ui.plan===plan.id}" aria-label="Bloco ${plan.id}: ${esc(label)}">
          <span class="plan-choice-code">BLOCO ${plan.id}</span><span class="plan-choice-name">${esc(label)}</span></button>`;
      }).join('')}</div>
      <section class="workout-banner"><div class="row-between"><h2>${esc(p.title)}</h2>${tag(`Bloco ${p.id}`,'green')}</div><p>${esc(p.subtitle)}</p><button class="primary full mt-12" data-action="start" data-plan="${p.id}">Iniciar treino ${p.id}</button></section>
      <section class="plan-exercises" aria-labelledby="plan-exercises-title">
        <div class="section-row plan-exercises-heading"><div><p class="section-eyebrow">SUA FICHA · BLOCO ${p.id}</p><h2 class="section-title" id="plan-exercises-title">Exercícios do bloco</h2>
          <p class="small muted">Organizados na ordem da sessão. Ative ou edite cada movimento sem perder os registros anteriores.</p></div><span class="plan-exercises-count">${all.filter(x=>x.active).length} ativos</span></div>
        <div class="plan-exercises-list">${all.map((ex,i)=>`<article class="plan-exercise-item ${ex.active?'':'is-inactive'}">
          <div class="plan-exercise-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</div>
          <div class="plan-exercise-detail"><h3>${esc(ex.name)}</h3>
            <p class="plan-exercise-meta"><strong>${ex.sets} séries</strong><span aria-hidden="true">·</span>${ex.low}–${ex.high} repetições</p>
            <p class="plan-exercise-submeta">Progressão: +${fmt(ex.step)} ${esc(ex.unit)}${ex.knee?' · Atenção ao joelho':''}</p>
            <div class="motion-plan-actions">
              ${MOTION.has(ex.id)?`<button type="button" class="motion-inline-trigger" data-action="motion-open" data-ex="${esc(ex.id)}">▶ Ver movimento</button>`:''}
              <button class="button-inline plan-exercise-edit" data-action="edit-ex" data-ex="${esc(ex.id)}">Editar exercício</button></div></div>
          <div class="plan-exercise-state"><span>${ex.active?'Na ficha':'Inativo'}</span><input class="switch" type="checkbox" aria-label="Ativar ${esc(ex.name)}" data-ex-active="${esc(ex.id)}" ${ex.active?'checked':''}/></div>
        </article>`).join('')}</div>
      </section>
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
    ui.focusedExercise=null;ui.focusedMode=false;
    ui.draft={planId:id,energy:'normal',notes:'',entries:{},plannedIds:[],skipped:[],addedIds:[]};
    currentExercises(id).forEach(ex => {ui.draft.entries[ex.id]={id:ex.id,sets:seedSets(ex),pain:''};ui.draft.plannedIds.push(ex.id);});
    persistDraft();
    render();window.scrollTo(0,0);
  }
  function renderTraining() {
    F.ensureDraft(ui.draft);
    const p=planFor(ui.draft.planId);
    const entries=ui.draft.entries;
    const focus=FOCUS.summary(entries);
    const selected=FOCUS.selectedId(entries,ui.focusedExercise);
    ui.focusedExercise=selected;
    const ids=Object.keys(entries);
    const focusIndex=Math.max(0,ids.indexOf(selected));
    return `${headline('Sessão em andamento',p.title,'As cargas preenchidas são referência; registre repetições e RIR após cada série.')}
      <div class="callout workout-status-callout ${ui.draftSaveOk?'good':'warn'}"><strong>${ui.recovered?'Treino recuperado após interrupção.':'Salvamento automático ativo.'}</strong>
        <span class="draft-status ${ui.draftSaveOk?'':'save-error'}" id="draft-status" role="status">${esc(draftStatusText())}</span>
        <p class="small mb-0">Dados salvos neste aparelho.</p></div>
      <div class="callout workout-guidance-callout">${p.type==='lower'?'Treino de pernas: registre dor no joelho durante os exercícios e no dia seguinte. Se doer, não aumente a carga.':'Halteres: anote o peso de cada um, não a soma.'}</div>
      <section class="workout-focus-bar card" aria-label="Modo de visualização e andamento">
        <div class="row-between focus-mode-row"><div><strong>Seu treino, no seu ritmo</strong><p class="small muted">Séries preenchidas: só contam após registrar carga e repetições.</p></div>
          <button type="button" class="secondary small-button" data-action="focus-toggle" aria-pressed="${ui.focusedMode}">${ui.focusedMode?'Ver ficha completa':'Ativar modo focado'}</button>
        </div>
        <div class="focus-progress" aria-label="${focus.completed} de ${focus.total} exercícios com séries efetivas concluídas"><span style="width:${focus.total?Math.round(focus.completed/focus.total*100):0}%"></span></div>
        <p class="small muted focus-progress-label" role="status">${focus.completed} de ${focus.total} exercícios concluídos · ${focus.effectiveSets} ${focus.effectiveSets===1?'série efetiva registrada':'séries efetivas registradas'}</p>
        ${ui.focusedMode && selected ? `<div class="focus-step"><strong>Exercício ${focusIndex+1} de ${ids.length}</strong>
          <div class="focus-navigation">
            <button type="button" class="secondary small-button" data-action="focus-prev" ${focusIndex===0?'disabled':''}>Anterior</button>
            <button type="button" class="secondary small-button" data-action="focus-next" ${focusIndex===ids.length-1?'disabled':''}>Próximo</button>
          </div></div>
          <div class="focus-exercise-pills" aria-label="Escolher exercício da sessão">
            ${ids.map((id,i)=>`<button type="button" class="focus-exercise-pill ${selected===id?'selected':''}" data-action="focus-select" data-ex="${esc(id)}" aria-pressed="${selected===id}">${i+1}. ${esc(exerciseFor(id)?.name||id)} ${focus.byExercise[id]?.finished?'✓':''}</button>`).join('')}
          </div>` : ''}
      </section>
      <section class="session-exercises" aria-labelledby="session-exercises-title">
        <div class="session-exercises-header"><p class="section-eyebrow">REGISTRO DE SÉRIES</p>
          <h2 id="session-exercises-title">Exercícios da sessão</h2>
          <p>${ui.focusedMode?'Visualização de um exercício por vez.':'Cada cartão corresponde a um exercício. Registre as séries antes de avançar.'}</p></div>
        ${ui.focusedMode ? (selected?renderExercise(entries[selected],focusIndex,ids.length):'<p class="empty">Adicione um exercício para começar.</p>') : Object.values(entries).map((en,i)=>renderExercise(en,i,ids.length)).join('')}
      </section>
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
      ${renderDosePanel(true)}
      <section class="card session-review"><h2 class="section-title">Conferência antes de salvar</h2>
        <div id="workout-review" aria-live="polite">${renderReviewContent()}</div>
        <p class="tiny muted">As observações não são convertidas em séries reais; os registros incompletos do Muay Thai antigo permanecem intactos.</p>
      </section>
      <section class="card"><h2 class="section-title">Finalizar sessão</h2><div class="field mt-12"><label for="session-energy">Como foi a sessão?</label>
      <select id="session-energy" data-draft-meta="energy"><option value="leve" ${ui.draft.energy==='leve'?'selected':''}>Leve / sobrou energia</option><option value="normal" ${ui.draft.energy==='normal'?'selected':''}>Normal / esforço esperado</option><option value="intenso" ${ui.draft.energy==='intenso'?'selected':''}>Intensa / muita fadiga</option></select></div>
      <div class="field mt-12"><label for="session-notes">Observações (opcional)</label><textarea id="session-notes" data-draft-meta="notes" placeholder="Ex.: sono, dor, execução, Muay Thai no mesmo dia">${esc(ui.draft.notes)}</textarea></div></section>
      <div class="training-controls"><div class="btnrow"><button class="primary" style="flex:2" data-action="finish">Salvar treino</button><button class="ghost" style="flex:1" data-action="cancel">Cancelar</button></div></div>`;
  }
  function renderReviewContent(){
    const {review,issues}=reviewWarning(ui.draft);
    return `<p class="small muted">${review.exercisesLogged} exercício(s) com séries · ${review.effectiveSets} série(s) efetiva(s)</p>
    ${issues.length?`<ul class="review-issues">${issues.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:
    '<p class="small">Sem pendências de preenchimento identificadas.</p>'}`;
  }
  function refreshReview() {
    const node=document.querySelector('#workout-review');
    if(node)node.innerHTML=renderReviewContent();
  }
  function renderFlexCatalog() {
    const choices=F.options(state.exercises,ui.draft);
    const analysis=DOSE.analyze({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      exercises:state.exercises,draft:ui.draft,settings:state.settings,today:today()});
    const advice=ADVICE.suggest({options:choices,draft:ui.draft,exercises:state.exercises,
      strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      settings:state.settings,today:today(),dose:DOSE,mode:ui.catalogMode,analysis});
    const picks=advice.recommendations.map(ex=>`
      <article class="catalog-suggestion">
        <div class="catalog-recommend-heading">
          <strong>${esc(ex.name)}</strong>
          <span class="catalog-recommend-tag">${ex.kind==='extra-set'?'Série extra':ex.kind==='extra-exercise'?'Outro equipamento':ex.kind==='replacement'?'Substituição':'Variação para substituir'}</span>
        </div>
        <p class="small muted">${esc(ex.muscle||'Grupo muscular')} · ${esc(ex.equipment||'Equipamento não informado')}</p>
        <p class="small">${esc(ex.reason)}</p>
        <div class="motion-flex-actions">
          ${MOTION.has(ex.id)?`<button type="button" class="motion-inline-trigger" data-action="motion-open" data-ex="${esc(ex.id)}" aria-label="Ver movimento: ${esc(ex.name)}">▶ Ver movimento</button>`:''}
          <button type="button" class="secondary small-button" data-action="${ex.kind==='extra-set'?'dose-add-one':ex.kind==='extra-exercise'?'catalog-extra-add':'flex-add'}" data-ex="${esc(ex.id)}" ${ex.sourceId?'data-source="'+esc(ex.sourceId)+'"':''}>${ex.kind==='extra-set'?'Acrescentar uma série':ex.kind==='extra-exercise'?'Adicionar exercício opcional':'Adicionar para substituir'}</button>
        </div>
      </article>`).join('');
    const full=choices.map(ex=>
      '<div class="flex-catalog-row" data-flex-name="' + esc((ex.name+' '+ex.equipment+' '+ex.muscle).toLocaleLowerCase('pt-BR')) + '">' +
      '<div><strong>' + esc(ex.name) + '</strong><small>' + esc(ex.muscle) + ' · ' + esc(ex.equipment) + '</small></div>' +
      '<div class="motion-flex-actions">' +
      (MOTION.has(ex.id)?'<button class="motion-inline-trigger" data-action="motion-open" data-ex="' + esc(ex.id) + '">▶ Ver movimento</button>':'') +
      '<button class="secondary small-button" data-action="flex-add" data-ex="' + esc(ex.id) + '">Adicionar</button></div></div>'
    ).join('');
    return `<div class="flex-catalog mt-12">
      <div class="catalog-mode-switch" role="group" aria-label="Tipo de recomendação">
        <button type="button" class="secondary ${ui.catalogMode==='replacement'?'selected':''}" data-action="catalog-mode" data-mode="replacement" aria-pressed="${ui.catalogMode==='replacement'}">Substituir exercício</button>
        <button type="button" class="secondary ${ui.catalogMode==='extra'?'selected':''}" data-action="catalog-mode" data-mode="extra" aria-pressed="${ui.catalogMode==='extra'}">Tenho energia para mais</button>
      </div>
      ${ui.catalogMode==='extra'?`<div class="catalog-energy"><strong>Como está sua energia agora?</strong>
        <button type="button" class="secondary" data-action="catalog-energy" aria-pressed="${ui.draft.energy==='leve'}">${ui.draft.energy==='leve'?'Energia sobrando ✓ · alterar':'Estou com energia sobrando'}</button>
        <p class="small muted">Energia sobrando não é autorização para volume extra. Consideramos séries, RIR e recuperação.</p></div>`:''}
      <section class="catalog-contextual" aria-labelledby="catalog-recommended-heading">
        <div class="row-between">
          <h3 id="catalog-recommended-heading">${ui.catalogMode==='extra'?'Opções para acrescentar':'Sugestões para este treino'}</h3>
          <span class="catalog-recommend-tag">${ui.catalogMode==='extra'?'Acréscimo opcional':'Substituição'}</span>
        </div>
        <p class="small muted">${esc(advice.message)}</p>
        ${advice.caution?'<p class="catalog-caution">'+esc(advice.caution)+'</p>':''}
        ${picks||'<p class="catalog-empty">Sem recomendações elegíveis com os dados disponíveis.</p>'}
        <p class="tiny muted">${esc(advice.basis)}</p>
      </section>
      ${ui.catalogMode==='replacement'?`<button type="button" class="secondary full catalog-all-toggle" data-action="catalog-show-all" aria-expanded="${ui.catalogAll}">
        ${ui.catalogAll?'Ocultar catálogo completo':'Explorar todos os exercícios ('+choices.length+')'}
      </button>
      ${ui.catalogAll?`<div class="catalog-all">
        <label for="flex-catalog-search">Buscar por nome ou equipamento</label>
        <input id="flex-catalog-search" type="search" placeholder="Buscar exercício..." aria-controls="flex-catalog-list" />
        <div class="flex-catalog-list" id="flex-catalog-list">${full||'<p class="small muted">Sem exercícios adicionais disponíveis.</p>'}</div>
      </div>`:''}`:''}
      <p class="tiny muted">${ui.catalogMode==='extra'?'Escolha uma série OU outro equipamento. Sem registro de execução, a opção não entra no volume realizado.':'Para substituir, retire o movimento original que ainda não foi realizado. Não é aumento de volume.'}</p>
    </div>`;
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
  function renderDosePanel(duringWorkout=false) {
    const result=DOSE.analyze({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      exercises:state.exercises,draft:duringWorkout?ui.draft:null,settings:state.settings,today:today()});
    return DOSE.renderPanel(result,{duringWorkout});
  }
  // Readable reference metrics, separate from the progression / safety guidance.
  function setComparisonText(previous, current, ex, previousDate) {
    const recorded=previous && previous.load !== '' && previous.load != null &&
      previous.reps !== '' && previous.reps != null && Number(previous.reps)>0;
    if(!recorded) return '<span class="set-history-empty">Sem registro anterior desta série.</span>';
    const hasCurrent=current && current.load !== '' && current.load != null &&
      current.reps !== '' && current.reps != null && Number(current.load)>0 && Number(current.reps)>0;
    const delta=hasCurrent ? E.compareSet(previous,current) : null;
    const rir=previous.rir === '' || previous.rir == null ? '—' : String(previous.rir);
    return `<div class="previous-workout-reference">
      <div class="reference-heading"><span>REFERÊNCIA ANTERIOR</span>
        <span>${previousDate?dateBR(previousDate):'Última sessão'} · ${previous.warmup?'Aquecimento':'Efetiva'}</span></div>
      <dl class="previous-workout-metrics">
        <div class="history-metric"><dt>Carga</dt><dd>${esc(fmt(previous.load))}<small>${esc(ex.unit)}</small></dd></div>
        <div class="history-metric"><dt>Repetições</dt><dd>${esc(previous.reps)}<small>reps</small></dd></div>
        <div class="history-metric"><dt>RIR</dt><dd>${esc(rir)}</dd></div>
      </dl>
      ${delta && delta.label?`<span class="set-delta ${esc(delta.kind)}">${esc(delta.label)}</span>`:''}
    </div>`;
  }
  function updateSetComparison(exId, index) {
    const en=ui.draft?.entries[exId], ex=exerciseFor(exId);
    if (!en || !ex) return;
    const cell=[...document.querySelectorAll('.set-history')]
      .find(node=>node.dataset.ex===exId && Number(node.dataset.index)===index);
    if (!cell) return;
    const previous=history(exId)[0];
    cell.innerHTML=setComparisonText(previous?.entry.sets[index],en.sets[index],ex,previous?.session.day);
  }
  function renderExercise(en,index=0,total=1) {
    const ex=exerciseFor(en.id), reco=E.recommend(ex,state.sessions), previousSession=history(ex.id)[0], previousEntry=previousSession?.entry, hasData=!!previousEntry;
    const cls=reco.level==='protect'?'protect':['hold','confirm'].includes(reco.level)?'warn':'';
    const completedSets=FOCUS.summary({[en.id]:en}).effectiveSets;
    return `<section class="exercise-card workout-exercise-card" data-exercise="${esc(ex.id)}" aria-label="Exercício ${index+1} de ${total}: ${esc(ex.name)}">
      <div class="workout-exercise-heading"><span class="workout-exercise-number">${String(index+1).padStart(2,'0')} <small>/ ${String(total).padStart(2,'0')}</small></span>
        <div class="workout-exercise-title"><p class="section-eyebrow">EXERCÍCIO ${index+1} · ${completedSets} ${completedSets===1?'série registrada':'séries registradas'}</p><h3>${esc(ex.name)}</h3>
        <p class="workout-exercise-target">${ex.sets} séries planejadas · ${ex.low}–${ex.high} repetições</p>
        ${MOTION.has(ex.id)?`<button type="button" class="motion-inline-trigger" data-action="motion-open" data-ex="${esc(ex.id)}">▶ Ver movimento</button>`:''}</div>
        <span class="workout-exercise-kind">${ex.mode==='pyramid'?'Pirâmide':'Séries'}</span></div>
      <p class="workout-exercise-step">Ajuste de carga: +${fmt(ex.step)} ${esc(ex.unit)}</p>
      <p class="small muted">Toque no RIR para registrar o esforço. As repetições só contam quando você informar o que realmente fez.</p>
      ${hasData?`<div class="exercise-last-session"><span>ÚLTIMA SESSÃO · ${dateBR(reco.lastDate)}</span><strong>${esc(reco.last)}</strong></div>`:''}
      <div class="recommend ${cls}"><strong>${esc(reco.title)}</strong><p>${esc(reco.explanation)}</p>
      ${reco.level==='increase'?`<button class="button-inline mt-8" data-action="apply-reco" data-ex="${esc(ex.id)}">Usar ${fmt(reco.next)} ${esc(ex.unit)} na série mais pesada</button>`:''}</div>
      ${!hasData&&ex.example?'<p class="small muted">Modelo do seu supino: 20 → 22,5 → 25 → 25 kg por halter. Não é histórico registrado.</p>':''}
      <div class="set-grid"><div class="caption">Nº</div><div class="caption">Tipo</div><div class="caption">Carga<br>(${esc(ex.unit)})</div><div class="caption">Reps</div><div class="caption">RIR</div>
      ${en.sets.map((set,i)=>`<div class="cell-label">${i+1}</div><button class="button-inline set-type ${set.warmup?'warmup':'work'}" data-action="toggle-warmup" data-ex="${esc(ex.id)}" data-index="${i}" title="Alternar entre aquecimento e série efetiva">${set.warmup?'Aquec.':'Efetiva'}</button>
      <input aria-label="Série ${i+1}, carga ${esc(ex.unit)} em ${esc(ex.name)}" type="number" min="0" max="1500" step="any" inputmode="decimal" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="load" value="${esc(set.load)}" />
      <input aria-label="Série ${i+1}, repetições em ${esc(ex.name)}" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="reps" value="${esc(set.reps)}" />
      <input aria-label="Série ${i+1}, repetições em reserva em ${esc(ex.name)}" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="rir" value="${esc(set.rir)}" />
      <div class="set-history" data-ex="${esc(ex.id)}" data-index="${i}">${setComparisonText(previousEntry?.sets[i],set,ex,previousSession?.session.day)}</div>
      <div class="quick-set-row">
        <div class="quick-rir" role="group" aria-label="RIR rápido da série ${i+1} de ${esc(ex.name)}">
          ${[0,1,2,3].map(n=>`<button type="button" class="secondary ${String(set.rir)===String(n)?'selected':''}" data-action="quick-rir" data-ex="${esc(ex.id)}" data-index="${i}" data-rir="${n}" aria-pressed="${String(set.rir)===String(n)}">RIR ${n}</button>`).join('')}
        </div>
        <button type="button" class="secondary quick-set-confirm ${FOCUS.performed(set)?'is-done':''}" data-action="quick-set-confirm" data-ex="${esc(ex.id)}" data-index="${i}">${FOCUS.performed(set)?'Série registrada ✓':'Conferir série'}</button>
      </div>`).join('')}</div>
      <div class="quick-log-tools"><span class="small muted">Preparo rápido · confirme as repetições depois de executar</span>
      <div class="quick-log-buttons"><button type="button" class="secondary small-button" data-action="quick-previous" data-ex="${esc(ex.id)}">Repetir cargas da última sessão</button>
      <button type="button" class="secondary small-button" data-action="quick-current" data-ex="${esc(ex.id)}">Repetir carga da série anterior</button></div></div>
      <div class="card-footer"><button class="button-inline" data-action="add-set" data-ex="${esc(ex.id)}">+ Série</button><button class="button-inline" data-action="remove-set" data-ex="${esc(ex.id)}" ${en.sets.length<=1?'disabled':''}>− Última série</button><button class="button-inline" data-action="flex-withdraw" data-ex="${esc(ex.id)}">Retirar só hoje</button></div>
      ${ex.knee?`<div class="field mt-12"><label for="pain-${esc(ex.id)}">Dor no joelho durante o exercício (0–5+)</label><select id="pain-${esc(ex.id)}" data-ex-pain="${esc(ex.id)}" required>${painOptions(en.pain)}</select><span class="field-help">Informe 0 quando não sentiu dor. Este registro é necessário para salvar uma série efetiva deste exercício.</span></div>`:''}
    </section>`;
  }
  function renderGoalPlannerSummary(result){
    if(result.error)return '';
    const status={informational:'Proposta inicial',incomplete:'Dados insuficientes',
      expired:'Prazo encerrado',conflict:'Objetivo inconsistente',review:'Rever prazo',
      caution:'Ritmo exige atenção','at-target':'Peso-alvo próximo'}[result.status];
    const kcal=result.energyBand?
      '<p class="small"><strong>Energia de partida: '+fmt(result.energyBand.low)+'–'+fmt(result.energyBand.high)+' kcal/dia</strong> ('+esc(result.energyBand.kind)+'). Referência ajustável, não meta aplicada.</p>':
      '<p class="small muted">Sem recomendação energética para este objetivo com os dados atuais.</p>';
    const weight=result.targetKg!=null?'<p class="small">Peso-alvo: <strong>'+fmt(result.targetKg)+' kg</strong> · '+(result.deadline?dateBR(result.deadline):'data não definida')+'</p>':'';
    return '<section class="card goal-plan-card" aria-label="Planejamento do objetivo">'+
      '<div class="row-between"><h2 class="section-title">Plano por objetivo</h2><span class="goal-status">'+esc(status)+'</span></div>'+
      '<p><strong>'+esc(result.label)+'</strong></p>'+weight+kcal+
      (result.proteinBand?'<p class="small">Faixa de proteína para ajustar: '+fmt(result.proteinBand.low)+'–'+fmt(result.proteinBand.high)+' g/dia, considerando treino de força.</p>':'')+
      '<p class="small"><strong>Treinos:</strong> '+esc(result.trainingAdvice)+'</p>'+
      '<p class="small"><strong>Alimentação:</strong> '+esc(result.foodAdvice)+'</p>'+
      '<details><summary>Opções de treino e alimentação</summary><p class="small muted">Alternativas para escolher, não mudanças na ficha ou metas atuais.</p><ul class="small">'+
      result.trainingOptions.map(option=>'<li><strong>'+esc(option.label)+'</strong>: '+esc(option.detail)+'</li>').join('')+
      result.foodOptions.map(option=>'<li><strong>'+esc(option.label)+'</strong>: '+esc(option.detail)+'</li>').join('')+'</ul></details>'+
      '<details><summary>Limites científicos e avisos</summary><ul class="small">'+result.warnings.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul><p class="small">'+esc(result.nextReview)+'</p></details>'+
      '<button type="button" class="secondary full mt-12" data-action="goal-open">Editar objetivo e prazo</button></section>';
  }
  function renderProgress() {
    const goalPlan=PLANNER.plan(state,today());
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
    const bm=BODY.recent(state.bodyMeasurements||[])[0];
    return `${headline('Acompanhe seu processo','Sua evolução.','Olhe a tendência do peso junto da força, recuperação e circunferência abdominal.')}
      <button type="button" class="nutrition-quick-card" data-action="nutrition-open"><span><strong>Alimentação</strong><small>Refeições registradas e estimativas opcionais</small></span><span aria-hidden="true">›</span></button>
      <button type="button" class="body-quick-card" data-action="body-open">
        <span><strong>Medidas corporais</strong><small>${bm?'Última aferição: '+dateBR(bm.date)+' · '+Object.keys(bm.values).length+' regiões':'Circunferências por região e histórico'}</small></span>
        <span aria-hidden="true">›</span>
      </button>
      ${renderGoalPlannerSummary(goalPlan)}
      <div class="kpi-row"><div class="kpi"><strong>${fmt(p.current)}</strong><span>kg atuais</span></div><div class="kpi"><strong>${fmt(Number(p.current)-Number(state.settings.startWeight))}</strong><span>kg desde o início</span></div><div class="kpi"><strong>${days>0?days:'—'}</strong><span>dias até a meta</span></div></div>
      <div class="card"><div class="row-between"><h2 class="section-title">Histórico de peso</h2>${tag(`${items.length} registro(s)`,'green')}</div>
      <div class="chart-wrap mt-12"><svg viewBox="0 0 320 160" role="img" aria-label="Gráfico de peso registrado. Atual ${fmt(p.current)} quilos, meta ${fmt(state.settings.targetWeight)} quilos.">
      <line x1="18" y1="122" x2="305" y2="122" stroke="#526477" stroke-width="1" />
      <line x1="18" y1="${y(state.settings.targetWeight)}" x2="305" y2="${y(state.settings.targetWeight)}" stroke="#c5f56b" stroke-dasharray="5 5" opacity=".7" />
      <text x="305" y="${Math.max(13,y(state.settings.targetWeight)-7)}" fill="#c5f56b" font-size="10" text-anchor="end">META ${fmt(state.settings.targetWeight)} kg</text>
      ${items.length>1?`<polyline points="${points}" fill="none" stroke="#80beff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`:''}
      ${items.map((it,i)=>`<circle cx="${x(i)}" cy="${y(it.weight)}" r="4" fill="#80beff" stroke="#152231" stroke-width="2"/>`).join('')}
      ${items.length?`<text x="24" y="148" fill="#a7b7c7" font-size="10">${dateBR(items[0].date)}</text><text x="299" y="148" fill="#a7b7c7" font-size="10" text-anchor="end">${dateBR(items[items.length-1].date)}</text>`:''}
      </svg></div><p class="chart-caption">Linha pontilhada: meta de peso. Oscilações diárias são normais.</p>
      ${goalPlan.paceKgPerWeek!=null?`<div class="callout ${goalPlan.status==='review'?'warn':''}">Ritmo matemático do objetivo: <strong>${fmt(goalPlan.paceKgPerWeek)} kg/semana</strong>. Não representa previsão nem recomendação automática de déficit.</div>`:''}</div>
      ${strengthSection(90)}
      ${renderDosePanel()}
      ${weightForm()}
      <div class="section-row"><h2 class="section-title">Pesagens salvas</h2></div><div class="card"><ul class="mini-list">${all.slice().reverse().slice(0,15).map(it=>`<li><span>${dateBR(it.date)}${it.initial?' · referência inicial':''}</span><strong>${fmt(it.weight)} kg</strong></li>`).join('')}</ul></div>`;
  }
  function bodyFigure(current){
    const values=current?.values||{};
    // Responsive, original vector silhouette; values are DOM labels, not baked into an image.
    const labels=BODY.FIELDS.filter(f=>values[f.id]!==undefined).map(f=>{
      return '<span class="body-measure-pin" style="--pin-x:'+f.x+'%;--pin-y:'+f.y+'%" title="'+
        esc(f.label)+'" aria-label="'+esc(f.label)+': '+esc(BODY.fmt(values[f.id]))+'">'+
        esc(BODY.fmt(values[f.id]))+'</span>';
    }).join('');
    return '<div class="body-figure" role="group" aria-label="Mapa ilustrativo das circunferências corporais">'+
     '<svg viewBox="0 0 260 460" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Silhueta corporal humana, vista de frente">'+
     '<defs><linearGradient id="forja-body-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#93a8b7"/><stop offset=".52" stop-color="#556f83"/><stop offset="1" stop-color="#293f53"/></linearGradient></defs>'+
     '<g fill="url(#forja-body-gradient)" stroke="#b0c3c9" stroke-opacity=".25" stroke-width="1.2">'+
     '<ellipse cx="130" cy="43" rx="26" ry="34"/>'+
     '<path d="M119 71L116 84 102 89 88 100 92 159 107 208 151 208 169 159 173 100 156 89 144 84 142 71Z"/>'+
     '<path d="M97 94Q75 93 69 112L48 190 38 249Q35 262 44 266 53 264 56 252L77 193 96 139Z"/>'+
     '<path d="M163 94Q185 93 191 112L212 190 222 249Q225 262 216 266 207 264 204 252L183 193 164 139Z"/>'+
     '<path d="M107 205L104 240 95 313 95 360 91 404 86 429Q83 441 102 441L111 432 122 355 128 287 130 255 131 287 138 355 149 432 158 441Q177 441 174 429L169 404 165 360 165 313 156 240 152 205Z"/>'+
     '</g><g stroke="#d6e4e7" stroke-opacity=".18" fill="none" stroke-width="2">'+
     '<path d="M130 104V174M111 133Q130 144 148 133M105 185Q130 191 155 185M130 215V245"/>'+
     '</g></svg>'+labels+'</div>';
  }
  function renderBodyMeasures(){
    const records=BODY.recent(state.bodyMeasurements||[]);
    const current=records[0]||null, history=ui.bodyView==='history';
    const edit=BODY.findDay(records,ui.bodyEditDate||today());
    const formDay=ui.bodyEditDate||today();
    return '<div class="body-page">'+
      '<button type="button" class="button-inline body-back" data-action="body-back">← Voltar à evolução</button>'+
      headline('Acompanhamento corporal','Medidas corporais.','Circunferências em centímetros, registradas por data.')+
      '<div class="body-tabs" role="group" aria-label="Visualizar medidas">'+
        '<button class="'+(!history?'selected':'')+'" data-action="body-view" data-view="current" aria-pressed="'+(!history)+'">Medidas atuais</button>'+
        '<button class="'+(history?'selected':'')+'" data-action="body-view" data-view="history" aria-pressed="'+history+'">Histórico</button>'+
      '</div>'+
      (history?
        (records.length?'<div class="body-history-list">'+records.map((entry,i)=>{
          const older=records[i+1];return '<article class="card body-history-entry"><div class="row-between"><h2 class="section-title">'+
          dateBR(entry.date)+'</h2><button class="button-inline" data-action="body-edit" data-date="'+esc(entry.date)+'">Editar</button></div>'+
          '<div class="body-history-grid">'+BODY.FIELDS.filter(field=>entry.values[field.id]!==undefined).map(field=>{
            const delta=BODY.diff(entry,older,field.id);return '<div class="body-history-cell"><span>'+esc(field.label)+'</span><strong>'+
            esc(BODY.fmt(entry.values[field.id]))+'</strong>'+
            (delta!==null?'<small class="body-delta">'+(delta>0?'+':'')+delta.toLocaleString('pt-BR')+' cm</small>':'')+'</div>';
          }).join('')+'</div></article>';
        }).join('')+'</div>':'<div class="empty">Nenhuma aferição salva até o momento.</div>')+
        '<p class="small muted">As diferenças mostram apenas variação de circunferência, não uma estimativa de gordura ou massa muscular.</p>'
      :
      '<section class="body-figure-card"><div class="row-between"><strong>Vista frontal</strong><span class="pill">'+(current?dateBR(current.date):'Sem aferição')+'</span></div>'+
       bodyFigure(current)+
       '<p class="tiny muted body-side-note">Direita e esquerda correspondem aos lados da pessoa representada. Silhueta ilustrativa, sem proporções clínicas.</p></section>'+
       '<form class="card body-form" id="body-measures-form">'+
       '<div class="row-between"><h2 class="section-title">'+(ui.bodyEditDate?'Editar aferição':'Registrar aferição')+'</h2><span class="pill">cm</span></div>'+
       '<div class="field mt-12"><label for="body-date">Data da medição</label><input id="body-date" name="date" type="date" value="'+esc(formDay)+'" required /></div>'+
       '<div class="body-field-grid">'+BODY.FIELDS.map(field=>
         '<div class="field"><label for="measure-'+esc(field.id)+'">'+esc(field.label)+'</label>'+
         '<input id="measure-'+esc(field.id)+'" name="'+esc(field.id)+'" type="number" inputmode="decimal" min=".1" max="300" step=".1" placeholder="—" value="'+
         esc(edit?.values?.[field.id]??'')+'"/></div>').join('')+'</div>'+
       '<button type="submit" class="primary full mt-16">Salvar medidas</button>'+
       '<p class="tiny muted mt-12">Deixe vazias as regiões não medidas. O registro pode ser complementado depois, e fica guardado neste aparelho e no backup JSON.</p></form>')+
      renderBioSection()+'</div>';
  }
  function renderBioSection(){
    const readings=BODY.recentBio(state.bioimpedance||[]);
    const recent=readings[0];
    const day=ui.bioEditDate||today();
    const editing=readings.find(row=>row.date===day)||null;
    const latest=recent?'<div class="bio-latest"><strong>Última leitura · '+dateBR(recent.date)+'</strong><div class="bio-values">'+
      BODY.BIO_FIELDS.filter(f=>recent.values[f.id]!=null).map(f=>'<div><span>'+esc(f.label)+'</span><strong>'+fmt(recent.values[f.id])+' '+esc(f.unit)+'</strong></div>').join('')+'</div></div>':
      '<p class="small muted">Nenhuma leitura registrada ainda.</p>';
    const fields=BODY.BIO_FIELDS.map(f=>'<div class="field"><label for="bio-'+esc(f.id)+'">'+esc(f.label)+' ('+esc(f.unit)+')</label>'+
      '<input id="bio-'+esc(f.id)+'" name="'+esc(f.id)+'" type="number" inputmode="decimal" min="'+f.min+'" max="'+f.max+'" step="any" placeholder="Opcional" value="'+esc(editing?.values?.[f.id]??'')+'"></div>').join('');
    return '<details class="card bio-panel" '+(ui.bioOpen?'open':'')+'><summary>Bioimpedância · Galaxy Watch ('+readings.length+')</summary>'+
      '<p class="small muted">Registro manual do Samsung Health. O relógio estima composição corporal; leituras isoladas podem variar com hidratação e horário. Nenhuma meta calórica será alterada automaticamente.</p>'+latest+
      '<form id="bio-form"><div class="field"><label for="bio-date">Data da leitura</label><input id="bio-date" name="date" type="date" max="'+today()+'" value="'+esc(day)+'" required></div>'+
      '<div class="bio-field-grid">'+fields+'</div><button class="primary full mt-16" type="submit">Salvar leitura do relógio</button></form>'+
      (readings.length?'<details class="bio-history mt-12"><summary>Ver leituras anteriores</summary>'+readings.slice(0,12).map(r=>
        '<div class="bio-history-row"><span>'+dateBR(r.date)+'</span><div class="btnrow">'+
        '<button type="button" class="button-inline" data-action="bio-edit" data-date="'+esc(r.date)+'">Editar</button>'+
        '<button type="button" class="button-inline" data-action="bio-delete" data-date="'+esc(r.date)+'">Excluir</button></div></div>').join('')+'</details>':'')+
      '<p class="small muted">Fonte: Galaxy Watch, entrada manual. Os resultados não são diagnósticos; compare tendências em condições de medição semelhantes.</p></details>';
  }
  function saveBio(form){
    const data=new FormData(form),date=String(data.get('date')||'');
    if(date>today())return notify('A data da leitura não pode ser futura.');
    const values=Object.fromEntries(BODY.BIO_FIELDS.map(f=>[f.id,data.get(f.id)]));
    const result=BODY.upsertBio(state.bioimpedance||[],date,values);
    if(result.error)return notify(result.error);
    const old=state.bioimpedance;
    state.bioimpedance=result.items;
    if(!save()){state.bioimpedance=old;return notify('Não foi possível salvar a leitura. Seus dados anteriores foram mantidos.');}
    ui.bioOpen=true;ui.bioEditDate=null;render();notify('Leitura do relógio salva neste aparelho.');
  }
  function saveBodyMeasures(form){
    const fd=new FormData(form),date=String(fd.get('date')||'');
    const values={};
    for(const field of BODY.FIELDS){
      const value=String(fd.get(field.id)||'').trim();
      if(value)values[field.id]=value;
    }
    const result=BODY.upsert(state.bodyMeasurements||[],date,values);
    if(result.error)return notify(result.error);
    const before=state.bodyMeasurements;
    state.bodyMeasurements=result.items;
    if(!save()){
      state.bodyMeasurements=before;
      return notify('Não foi possível salvar as medidas. Seus registros anteriores continuam preservados.');
    }
    ui.bodyEditDate=null;render();notify('Medidas de '+dateBR(date)+' salvas.');
  }

  function renderHistory() {
    const sessions=latestSessions(), muaySessions=M.sortedSessions(state.muay.sessions);
    const shown=sessions.slice(0,ui.historyStrengthLimit);
    const calendar=CAL.render({strengthSessions:state.sessions,muaySessions:state.muay.sessions,month:ui.calendarMonth,selectedDay:ui.calendarDay,today:today(),plans:DATA.plans,exercises:state.exercises});
    return `${headline('Diário','Seu histórico.','Consulte suas sessões recentes. Abra somente a que deseja analisar.')}
      <div class="history-overview" role="group" aria-label="Resumo dos registros">
        <span><strong>${sessions.length}</strong> musculação</span>
        <span><strong>${muaySessions.length}</strong> Muay Thai</span>
      </div>
      <details class="history-calendar-fold" ${ui.historyCalendarOpen?'open':''}>
        <summary>Calendário de treinos <span aria-hidden="true">⌄</span></summary>
        <div class="history-calendar-content">${calendar}</div>
      </details>
      <div class="section-row"><h2 class="section-title">Musculação</h2><small>Mostrando ${shown.length} de ${sessions.length}</small></div>
      ${shown.length?shown.map(session=>{
        const needsDay=session.entries.some(en=>exerciseFor(en.id)?.knee&&E.workSets(en).length)&&session.kneeNextDay==null;
        const canAssess=Date.now()-new Date(session.timestamp).getTime()>=86400000;
        const kneePrompt=needsDay&&canAssess;
        const count=session.entries.length;
        return `<details class="history-entry history-card" data-history-id="${esc(session.id)}" ${kneePrompt?'open':''}>
          <summary class="history-summary">
            <span class="history-summary-main"><small>${dateBR(session.day)} · Bloco ${esc(session.planId)}</small>
              <strong>${esc(planFor(session.planId).title)}</strong>
              <span>${count} exercício(s) · ${esc(session.energy||'Esforço não informado')}${kneePrompt?' · Avaliar joelho':''}</span></span>
            <span class="history-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="history-content">
            <ul class="mini-list">${session.entries.map(en=>{
              const ex=exerciseFor(en.id),top=E.topSet(en);
              return `<li><div class="history-exercise"><strong>${esc(ex?.name||en.id)}</strong><br>
                <span>${E.workSets(en).length} séries efetivas${en.pain!=null?' · joelho '+en.pain+'/5+':''}</span>
                <details class="history-details"><summary>Ver todas as séries</summary><ol>${en.sets.map(set=>
                  `<li>${set.warmup?'Aquecimento':'Efetiva'}: ${fmt(set.load)} ${esc(ex?.unit||'kg')} × ${set.reps} rep.${set.rir==null?'':` · RIR ${set.rir}`}</li>`).join('')}</ol></details>
              </div><div class="text-right"><strong>${top?`${fmt(top.load)} ${esc(ex?.unit||'kg')}`:'—'}</strong><br><span>${top?`${top.reps} rep.`:''}</span></div></li>`;
            }).join('')}</ul>
            ${session.skipped?.length?`<details class="history-skipped"><summary>Pulados nesta sessão · ${session.skipped.length}</summary><ul>${session.skipped.map(item=>
              `<li>${esc(exerciseFor(item.id)?.name||item.id)}<span>${item.reason==='sem-registro'?'Sem registro':esc(F.reasons[item.reason]||'Motivo não informado')}</span></li>`).join('')}</ul></details>`:''}
            ${session.notes?`<p class="small muted">Observações: ${esc(session.notes)}</p>`:''}
            ${needsDay?(canAssess?`<div class="callout warn"><strong>Como ficou o joelho no dia seguinte?</strong>
              <div class="field-row mt-8"><div class="field"><label for="after-${esc(session.id)}">Dor após 24 h</label>
                <select id="after-${esc(session.id)}" data-after-day="${esc(session.id)}">${painOptions('')}</select></div>
                <div style="display:flex;align-items:end"><button class="secondary full" data-action="save-knee" data-id="${esc(session.id)}">Salvar</button></div></div></div>`:
              `<p class="small muted mt-12">Amanhã, informe como ficou o joelho antes de progredir cargas de pernas.</p>`):
              session.kneeNextDay!=null?`<p class="small muted mt-12">Joelho no dia seguinte: ${session.kneeNextDay}/5+</p>`:''}
          </div></details>`;
      }).join(''):`<div class="empty">Nenhum treino de musculação registrado ainda.</div>`}
      ${sessions.length>ui.historyStrengthLimit?`<button class="secondary full history-more" data-action="history-more" data-kind="strength">Ver mais ${Math.min(5,sessions.length-ui.historyStrengthLimit)} treinos de musculação</button>`:''}
      ${M.historySection(state.muay.sessions,ui.historyMuayLimit)}
      ${muaySessions.length>ui.historyMuayLimit?`<button class="secondary full history-more" data-action="history-more" data-kind="muay">Ver mais ${Math.min(5,muaySessions.length-ui.historyMuayLimit)} treinos de Muay Thai</button>`:''}
      <button class="secondary full mt-16" data-action="export-json">Exportar backup do histórico</button>`;
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
  function renderHealthSummary(){
    const months=HEALTH.averages(state.healthMonthly||[]);
    const rows=months.map(m=>'<div class="health-month-row"><strong>'+esc(m.month)+'</strong>'+
      '<span>'+fmt(m.steps)+' passos · '+fmt(m.activityMinutes)+' min · '+fmt(m.activityKcal)+' kcal de atividade</span>'+
      '<small>'+fmt(m.stepsPerCalendarDay)+' passos/dia no período · '+(m.complete?'mês completo':'mês parcial')+'</small></div>').join('');
    const latest=(state.healthWeightReports||[]).slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
    return (months.length?'<p class="small muted">Totais observados; nunca divididos em dias individuais no histórico de atividade.</p>'+rows:
      '<p class="small muted">Nenhum resumo do Samsung Health importado.</p>')+
      (latest?'<p class="small mt-12">Peso informado em '+dateBR(latest.date)+': '+fmt(latest.weightKg)+' kg · IMC relatado '+fmt(latest.reportedBmi)+'.</p>':'')+
      '<p class="small muted">Não usamos calorias de atividade como gasto total; um mês parcial não comprova redução de atividade. Registros são locais.</p>';
  }
  async function importHealthFile(file){
    if(!file)return;
    try{
      if(file.size>1024*1024)throw new Error('Arquivo muito grande (limite de 1 MB).');
      const data=JSON.parse(await file.text());
      const result=HEALTH.apply(state,data,today());
      if(result.error)throw new Error(result.error);
      const c=result.changes;
      const summary=c.monthly+' mês(es), '+c.daily+' dia(s) de passos, '+c.weightReports+
        ' relatório(s) corporais e '+c.weights+' pesagem(ns) nova(s).';
      if(!confirm('Importar estes dados do Samsung Health? '+summary+
        ' Registros existentes têm prioridade. Resumos mensais não serão transformados em dados diários.'))return;
      const previous=state;
      state=result.next;
      if(!validState(state)||!save()){state=previous;throw new Error('Falha de armazenamento. Histórico anterior preservado.');}
      ui.tab='settings';render();
      notify('Histórico Samsung Health importado. '+summary);
    }catch(err){notify('Importação não concluída: '+err.message);}
    finally{const input=document.getElementById('import-health-file');if(input)input.value='';}
  }
  function renderSettings() {
    return `${headline('Preferências','Seus ajustes.','Dados no próprio aparelho. Sem login, mensalidade ou envio para servidores.')}
      <button class="secondary full mb-8" data-action="nutrition-goals">Perfil e metas de alimentação · altura e idade</button>
      ${renderReminderPreferences()}
      <form id="goal-form" class="card"><h2 class="section-title">Objetivo e prazo</h2>
      <div class="field mt-12"><label for="goal-mode">Meu objetivo</label><select id="goal-mode" name="goalMode">${Object.entries(PLANNER.MODES).map(([key,label])=>`<option value="${esc(key)}" ${(state.settings.goalMode||'weight')===key?'selected':''}>${esc(label)}</option>`).join('')}</select></div>
      <div class="field-row mt-12"><div class="field"><label for="initial-weight">Peso inicial (kg)</label><input id="initial-weight" name="startWeight" type="number" step="0.1" min="30" max="350" value="${state.settings.startWeight}" required /></div>
      <div class="field"><label for="target-weight">Meta (kg)</label><input id="target-weight" name="targetWeight" type="number" step="0.1" min="30" max="350" value="${state.settings.targetWeight}" required /></div></div>
      <div class="field mt-12"><label for="goal-date">Data-alvo desejada</label><input id="goal-date" name="goalDate" type="date" value="${state.settings.goalDate}" required /></div><p class="small muted">Prazo desejado, não garantia de resultado. Nenhuma mudança de calorias é aplicada automaticamente.</p>
      <button class="primary full mt-12" type="submit">Salvar meta</button></form>
      <section class="card"><h2 class="section-title">Samsung Health · histórico importado</h2>${renderHealthSummary()}</section>
      <section class="card"><h2 class="section-title">Seus dados</h2><p class="small muted">O histórico fica somente neste navegador. Ao trocar de celular, limpar os dados do site ou usar navegação privada, ele pode se perder. Exporte um backup periodicamente.</p>
      <button class="secondary full mt-12" data-action="import-health">Importar histórico do Samsung Health (JSON)</button><p class="small muted">Importe um arquivo de transcrição dos seus registros. Os totais mensais ficam separados dos dias observados. Importação local, sem substituir treinos, refeições ou pesagens existentes.</p>
      <button class="primary full mt-12" data-action="export-ai">Exportar todos os dados para IA (JSON)</button><p class="small muted">Inclui musculação, Muay Thai, histórico corporal, bioimpedância, passos diários, alimentação, metas e rascunhos. Arquivo gerado localmente, não enviado pela FORJA. Contém informações pessoais: compartilhe somente com uma IA confiável. Não é um arquivo de restauração.</p><div class="btnrow mt-12"><button class="secondary" data-action="export-json">Baixar backup JSON</button><button class="secondary" data-action="export-csv">Exportar séries CSV</button><button class="secondary" data-action="import-json">Importar ou mesclar backup</button></div>
        <p class="small muted mt-12">Ao importar, a FORJA mantém os registros existentes e acrescenta apenas sessões e exercícios ainda não encontrados. Em uma instalação vazia, carrega o backup completo. Exporte seu histórico atual antes de qualquer migração.</p></section>
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
        refreshReview();
        updateSetComparison(el.dataset.ex, Number(el.dataset.index));
        const progress=FOCUS.summary(ui.draft.entries);
        const status=document.querySelector('.focus-progress-label');
        if(status)status.textContent=progress.completed+' de '+progress.total+' exercícios concluídos · '+progress.effectiveSets+(progress.effectiveSets===1?' série efetiva registrada':' séries efetivas registradas');
        const bar=document.querySelector('.focus-progress span');
        if(bar)bar.style.width=(progress.total?Math.round(progress.completed/progress.total*100):0)+'%';
        // Editing a number fires input and later change on blur.
        // Replacing a recommendation button during the blur change would
        // detach it between pointerdown and pointerup, cancelling the click.
        if(event.type==='input'){
          const box=document.querySelector('.dose-card');
          if(box)box.outerHTML=renderDosePanel(true);
        }
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
    const deadline=String(data.get('goalDate')),mode=String(data.get('goalMode')||'weight');
    if(start===null||goal===null||start<30||start>350||goal<30||goal>350||!PLANNER.dateOK(deadline)||!(mode in PLANNER.MODES))
      return notify('Confira pesos, modalidade e data-alvo.');
    if(mode==='fat_loss'&&goal>=start)return notify('Para perda de gordura, escolha um peso-alvo menor ou use recomposição.');
    if(mode==='muscle_gain'&&goal<=start)return notify('Para ganho de massa, escolha um peso-alvo maior ou use recomposição.');
    const old=copy(state.settings);
    Object.assign(state.settings,{startWeight:start,targetWeight:goal,goalDate:deadline,goalMode:mode});
    if(!save()){state.settings=old;return notify('Não foi possível salvar. Sua meta anterior permanece.');}
    render();notify('Objetivo salvo; nenhuma meta alimentar foi alterada automaticamente.');
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
      plannedIds:[...ui.draft.plannedIds],skipped:F.skippedForSave(ui.draft,result),
      energy:ui.draft.energy,notes:ui.draft.notes.trim().slice(0,1000)});
    if (!save()) {
      state.sessions.pop();
      return notify('Não foi possível salvar o histórico. O rascunho foi mantido; não feche esta página.');
    }
    const discomfort=result.some(en=>en.pain!==null && en.pain>0);
    clearDraft();ui.tab='history';render();window.scrollTo(0,0);
    const skippedCount=state.sessions[state.sessions.length-1].skipped.filter(item=>item.reason==='sem-registro').length;
    notify(discomfort?'Treino salvo. Como houve desconforto no joelho, não aumente a carga.':
      skippedCount?`Treino salvo. ${skippedCount} exercício(s) sem registro marcado(s) como pulado(s).`:
      'Treino salvo. Histórico e treinos pendentes atualizados.');
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
  function exportForAI(){
    // Generate a single analysis file on-device. FORJA never uploads this data.
    let strengthDraft=null;
    try {const raw=localStorage.getItem(DRAFT_KEY);if(raw)strengthDraft=JSON.parse(raw);}
    catch(err){console.warn('Rascunho de musculação indisponível para exportação',err);}
    const payload={
      format:'FORJA_AI_EXPORT_V1',exportedAt:new Date().toISOString(),language:'pt-BR',
      privacy:'Dados pessoais de treino, medidas e alimentação. Compartilhe somente com serviços de confiança.',
      interpretation:[
        'state contém os registros originais completos do aparelho, inclusive treinos, alimentação, medidas, bioimpedância e metas.',
        'state.weights com initial:true representa um valor inicial de referência, não necessariamente uma pesagem aferida.',
        'Valores de nutrientes ausentes (null) são desconhecidos, não zero. Não supor consumo de refeições não registradas.',
        'Estimativas alimentares de baixa confiança devem permanecer separadas de rótulos ou medidas observadas.',
        'Bioimpedância do Galaxy Watch é estimativa indireta; utilizar tendências, sem diagnóstico e sem cálculo automático de gasto.',
        'Passos diários informados manualmente são contagens observadas de dias específicos; dias sem registro não equivalem a zero.',
        'healthMonthly contém somatórios mensais do Samsung Health, que não equivalem a séries de dados diários e não devem alimentar médias de passos de dias não observados.',
        'healthWeightReports conserva o IMC relatado pelo Samsung Health como indicador calculado, distinto de medidas de gordura corporal.',
        'Meses parciais (complete:false) não podem ser comparados diretamente a meses completos sem ressalvas.',
        'Sugestões de fator de atividade são heurísticas categóricas, não PAL medido e não somam calorias de exercícios.',
        'Rascunhos não representam sessões ou refeições concluídas. O formato deste arquivo é para análise, não para reimportação no FORJA.'
      ],
      counts:{strengthSessions:state.sessions.length,muaySessions:state.muay.sessions.length,
        weightRecords:state.weights.length,bodyMeasurements:(state.bodyMeasurements||[]).length,
        watchBioimpedance:(state.bioimpedance||[]).length,stepDays:(state.activitySteps||[]).length,healthMonths:(state.healthMonthly||[]).length,reportedWeightDays:(state.healthWeightReports||[]).length,meals:(state.nutrition?.entries||[]).length},
      state:copy(state),strengthDraft,
    };
    download('forja-todos-dados-para-ia-'+today()+'.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');
    notify('Exportação gerada no aparelho. Confira a pasta Downloads e proteja o arquivo.');
  }
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
  // Safe migration of a backup into an already used phone. Same IDs in the
  // phone take priority, so an older backup cannot overwrite later edits.
  function mergeImportedHistory(current,incoming) {
    const unionById=(left,right)=>{
      const result=[...left], ids=new Set(left.map(item=>item.id));
      for(const item of right)if(!ids.has(item.id)){result.push(item);ids.add(item.id);}
      return result;
    };
    const existingDates=new Set(current.weights.map(item=>item.date));
    const existingWeightIds=new Set(current.weights.map(item=>item.id));
    const newWeights=incoming.weights.filter(item=>!existingDates.has(item.date)&&!existingWeightIds.has(item.id));
    return {
      ...incoming,...current,
      settings:current.settings,
      referenceDefaultsVersion:Math.max(current.referenceDefaultsVersion||0,incoming.referenceDefaultsVersion||0),
      weights:[...current.weights,...newWeights],
      exercises:unionById(current.exercises,incoming.exercises),
      sessions:unionById(current.sessions,incoming.sessions),
      bodyMeasurements:BODY.merge(current.bodyMeasurements,incoming.bodyMeasurements),
      bioimpedance:BODY.mergeBio(current.bioimpedance,incoming.bioimpedance),
      activitySteps:ACT.mergeSteps(current.activitySteps,incoming.activitySteps),
      healthMonthly:HEALTH.mergeMonthly(current.healthMonthly,incoming.healthMonthly),
      healthWeightReports:HEALTH.mergeWeightReports(current.healthWeightReports,incoming.healthWeightReports),
      reminderPrefs:current.reminderPrefs||incoming.reminderPrefs||{enabled:true,items:{}},
      nutrition:NUTRITION.merge(current.nutrition,incoming.nutrition),
      muay:{...incoming.muay,...current.muay,
        sessions:unionById(current.muay.sessions,incoming.muay.sessions),
        draft:current.muay.draft||incoming.muay.draft||null},
      migrationAudit:incoming.migrationAudit||current.migrationAudit,
    };
  }
  async function importJSON(file) {
    if(!file)return;
    if(file.size>5*1024*1024)return notify('Arquivo muito grande (limite de 5 MB).');
    try{
      const parsed=JSON.parse(await file.text());
      if(!validState(parsed))throw new Error('Estrutura incompatível');
      M.ensureArchive(parsed);
      NUTRITION.ensureArchive(parsed);
      if(!M.validArchive(parsed.muay))throw new Error('Histórico de Muay Thai inválido');
      const importedIds=new Set(parsed.exercises.map(ex=>ex.id));
      if(parsed.sessions.some(session=>session.entries.some(entry=>!importedIds.has(entry.id))))
        throw new Error('Treinos importados referenciam exercícios ausentes.');
      const existing=state.sessions.length+state.muay.sessions.length+
        state.weights.filter(item=>!item.initial).length+(state.bodyMeasurements||[]).length+
        (state.nutrition?.entries||[]).length+(state.nutrition?.foods||[]).length+
        (state.nutrition?.mealTemplates||[]).length+(state.bioimpedance||[]).length+(state.activitySteps||[]).length+(state.healthMonthly||[]).length+(state.healthWeightReports||[]).length;
      const hasCurrent=existing>0||Boolean(ui.draft)||Boolean(state.muay.draft)||Boolean(state.nutrition.draft)||Boolean(state.nutrition.settings.profile)||(state.nutrition.settings.targets||[]).length>0;
      const action=hasCurrent?'mesclados aos atuais (sem substituir registros de mesmo ID)':
        'carregados neste aparelho';
      const counts=parsed.sessions.length+' musculação, '+parsed.muay.sessions.length+
        ' Muay Thai, '+parsed.weights.length+' pesagem(ns) e '+
        (parsed.bodyMeasurements||[]).length+' medição(ões) corporais';
      if(!confirm('Importar '+counts+'? Os registros serão '+action+'. '+
        'A FORJA preserva as informações legadas sem completar dados antigos. '+
        'Se houver treinos novos no aparelho, recomendamos exportar um backup antes.'))return;
      const oldState=state;
      state=hasCurrent?mergeImportedHistory(state,parsed):parsed;
      if(!validState(state)||!M.validArchive(state.muay)){state=oldState;throw new Error('Falha ao validar estado mesclado.');}
      if(!save()){state=oldState;return notify('Importação não concluída. Seu histórico anterior foi mantido.');}
      if(!hasCurrent)clearDraft();
      muayMode=false;ui.editor=null;ui.tab='home';render();
      notify(hasCurrent?'Backup mesclado. Dados anteriores preservados.':'Backup importado com sucesso.');
    }catch(err){console.warn('Importação não concluída',err);
      notify('Não foi possível importar: verifique o backup FORJA e os registros informados.');}
    document.getElementById('import-file').value='';
  }
  function handleAction(btn) {
    const action=btn.dataset.action;
    if(action==='reminder-manage'){ui.tab='settings';render();document.querySelector('.reminder-settings')?.scrollIntoView({block:'start'});return;}
    if(action==='reminder-open'||action==='reminder-snooze'||action==='reminder-dismiss'||action==='reminder-toggle'){
      handleReminderAction(btn);return;
    }
    if(action==='goal-open'){ui.tab='settings';ui.editor=null;render();window.scrollTo(0,0);document.getElementById('goal-form')?.scrollIntoView({block:'start'});return;}
    if(action==='motion-open'){
      const id=btn.dataset.ex, exercise=exerciseFor(id)||F.catalog.find(item=>item.id===id);
      const dialog=document.getElementById('motion-dialog');
      if(!exercise||!dialog||!MOTION.has(id))return;
      const shouldAnimate=!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      dialog.querySelector('.motion-dialog-content').innerHTML=MOTION.viewer(id,exercise.name,shouldAnimate);
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
      return;
    }
    if(action==='motion-close'){
      const dialog=document.getElementById('motion-dialog');
      if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
      return;
    }
    if(action==='motion-phase'){
      const dialog=document.getElementById('motion-dialog');
      const svg=dialog?.querySelector('.motion-stage > .motion-svg');
      const phase=btn.dataset.phase;
      if(!svg||!['start','end'].includes(phase)||typeof svg.pauseAnimations!=='function'
         ||typeof svg.setCurrentTime!=='function')return;
      svg.pauseAnimations();
      svg.setCurrentTime(phase==='end'?1.4:0);
      dialog.querySelectorAll('.motion-phase-button').forEach(button=>
        button.setAttribute('aria-pressed',String(button===btn)));
      const play=dialog.querySelector('.motion-play-button');
      if(play){play.textContent='Retomar animação';play.setAttribute('aria-pressed','true');}
      const status=dialog.querySelector('#motion-state');
      if(status)status.textContent=phase==='end'?'Posição final':'Posição inicial';
      return;
    }
    if(action==='motion-pause'){
      const dialog=document.getElementById('motion-dialog');
      const svg=dialog?.querySelector('.motion-stage > .motion-svg');
      if(!svg||typeof svg.pauseAnimations!=='function')return;
      const paused=btn.getAttribute('aria-pressed')==='true';
      const status=dialog.querySelector('#motion-state');
      if(paused){
        svg.setCurrentTime(0);
        svg.unpauseAnimations();
        btn.textContent='Pausar animação';
        btn.setAttribute('aria-pressed','false');
        dialog.querySelectorAll('.motion-phase-button').forEach(button=>button.setAttribute('aria-pressed','false'));
        if(status)status.textContent='Movimento em repetição';
      }else{
        svg.pauseAnimations();
        btn.textContent='Retomar animação';
        btn.setAttribute('aria-pressed','true');
        if(status)status.textContent='Animação pausada';
      }
      return;
    }
    if(action==='nutrition-open'||action==='nutrition-goals'){
      ui.tab='nutrition';ui.editor=null;render();window.scrollTo(0,0);
      if(action==='nutrition-goals')diary.goals();return;
    }

    if(action==='history-more'){
      if(btn.dataset.kind==='strength')ui.historyStrengthLimit=Math.min(state.sessions.length,ui.historyStrengthLimit+5);
      else if(btn.dataset.kind==='muay')ui.historyMuayLimit=Math.min(state.muay.sessions.length,ui.historyMuayLimit+5);
      else return;
      const scroll=window.scrollY;render();window.scrollTo(0,scroll);return;
    }
    if(action==='muay-effort'||action==='muay-fatigue'){
      const d=state.muay.draft;if(!d)return;
      const value=btn.dataset.value;
      if(action==='muay-effort'){
        if(!['5','7','9'].includes(value))return;
        d.intensity=String(d.intensity)===value?'':value;
      }else{
        if(!['normal','moderada','alta'].includes(value))return;
        d.fatigue=d.fatigue===value?'':value;
      }
      if(!save())return;render();return;
    }
    if(action==='focus-toggle'){if(!ui.draft)return;ui.focusedMode=!ui.focusedMode;render();return;}
    if(action==='focus-select' || action==='focus-next' || action==='focus-prev'){
      if(!ui.draft)return;
      const ids=Object.keys(ui.draft.entries);
      const current=FOCUS.selectedId(ui.draft.entries,ui.focusedExercise);
      const i=ids.indexOf(current);
      const id=action==='focus-select'?btn.dataset.ex:ids[i+(action==='focus-next'?1:-1)];
      if(!id||!ui.draft.entries[id])return;
      ui.focusedExercise=id;render();document.querySelector('.workout-focus-bar')?.scrollIntoView({block:'start'});return;
    }
    if(action==='quick-rir'){
      const en=ui.draft?.entries[btn.dataset.ex],i=Number(btn.dataset.index),n=Number(btn.dataset.rir);
      if(!en||!en.sets[i]||![0,1,2,3].includes(n))return;
      const old=en.sets[i].rir;en.sets[i].rir=String(n);
      if(!persistDraft()){en.sets[i].rir=old;return notify('Não foi possível salvar o RIR.');}
      const input=document.querySelector('[data-field="rir"][data-ex="'+en.id+'"][data-index="'+i+'"]');
      if(input)input.value=String(n);
      const row=btn.closest('.quick-rir');
      if(row)row.querySelectorAll('[data-action="quick-rir"]').forEach(el=>{
        const active=el.dataset.rir===String(n);
        el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));
      });
      refreshReview();return;
    }
    if(action==='quick-set-confirm'){
      const en=ui.draft?.entries[btn.dataset.ex],i=Number(btn.dataset.index),row=en?.sets[i];
      if(!row)return;
      if(!FOCUS.performed(row))return notify('Informe a carga e as repetições realmente executadas nesta série.');
      notify('Série registrada no rascunho automático.');return;
    }
    if(action==='recovery-energy'){
      if(!['boa','normal','baixa'].includes(btn.dataset.value))return;
      ui.homeRecoveryOpen=true;
      const existing=checkin();
      state.settings.recoveryCheckin={
        day:today(),energy:btn.dataset.value,fatigue:existing?.fatigue||'normal',
        kneePain:existing?.kneePain??''};
      if(!save())return;
      render();notify('Check-in de hoje salvo.');return;
    }
    if(action==='quick-previous' || action==='quick-current'){
      if(!ui.draft)return;
      const en=ui.draft.entries[btn.dataset.ex];if(!en)return;
      const prev=history(en.id)[0]?.entry?.sets||[];
      let copied=0;
      const original=copy(en.sets);
      en.sets.forEach((set,index)=>{
        const v=FOCUS.quickLoad(en,index,action==='quick-previous'?'previous-session':'last-set',prev);
        if(!v.error && (set.load==='' || set.load===null || set.load===undefined)){set.load=v.load;copied++;}
      });
      if(!copied)return notify('Nenhuma carga pendente disponível para copiar.');
      if(!persistDraft()){en.sets=original;return notify('Não foi possível salvar as cargas preparadas.');}
      render();notify(copied+' carga(s) preparadas. Registre repetições e RIR após executar.');return;
    }
    if(action==='body-open'){
      ui.bodyOpen=true;ui.bodyView='current';ui.bodyEditDate=null;ui.tab='progress';
      render();window.scrollTo(0,0);return;
    }
    if(action==='body-back'){
      ui.bodyOpen=false;ui.bodyEditDate=null;render();window.scrollTo(0,0);return;
    }
    if(action==='body-view'){
      if(!['current','history'].includes(btn.dataset.view))return;
      ui.bodyView=btn.dataset.view;ui.bodyEditDate=null;render();return;
    }
    if(action==='body-edit'){
      if(!BODY.validDate(btn.dataset.date))return;
      ui.bodyEditDate=btn.dataset.date;ui.bodyView='current';render();
      document.querySelector('#body-measures-form')?.scrollIntoView({block:'start',behavior:'smooth'});return;
    }
    if(action==='bio-edit'){
      if(!BODY.validDate(btn.dataset.date))return;
      ui.bioEditDate=btn.dataset.date;ui.bioOpen=true;ui.bodyView='current';
      render();document.querySelector('#bio-form')?.scrollIntoView({block:'nearest'});return;
    }
    if(action==='bio-delete'){
      const date=btn.dataset.date;
      if(!BODY.validDate(date)||!confirm('Excluir a leitura de bioimpedância de '+dateBR(date)+'?'))return;
      const old=state.bioimpedance;
      state.bioimpedance=(old||[]).filter(item=>item.date!==date);
      if(!save()){state.bioimpedance=old;return;}
      ui.bioEditDate=null;ui.bioOpen=true;render();notify('Leitura excluída.');return;
    }
    if(action==='catalog-filter'){
      if(!['all','A','B','C','D'].includes(btn.dataset.group))return;
      ui.catalogGroup=btn.dataset.group;render();return;
    }
    if(action==='catalog-add-plan'){
      const id=btn.dataset.ex;
      if(state.exercises.some(ex=>ex.id===id)||state.exercises.length>=200)return;
      const found=F.prepareCatalog(id,state.exercises);
      if(!found||!found.isNew)return;
      const added={...found.exercise,active:true};
      state.exercises.push(added);
      if(!save()){state.exercises.pop();return notify('Não foi possível adicionar o exercício.');}
      render();notify('Exercício incluído na ficha do bloco '+added.group+'.');return;
    }
    if(action==='catalog-activate'){
      const ex=exerciseFor(btn.dataset.ex);if(!ex)return;
      const previous=ex.active;ex.active=true;
      if(!save()){ex.active=previous;return;}
      render();notify('Exercício ativado na ficha do bloco '+ex.group+'.');return;
    }
    if(action==='flex-catalog-toggle'){if(!ui.draft)return;ui.catalogOpen=!ui.catalogOpen;ui.catalogAll=false;ui.catalogMode='replacement';render();return;}
    if(action==='catalog-mode'){
      if(!ui.draft||!ui.catalogOpen||!['replacement','extra'].includes(btn.dataset.mode))return;
      ui.catalogMode=btn.dataset.mode;ui.catalogAll=false;render();return;
    }
    if(action==='catalog-energy'){
      if(!ui.draft||!ui.catalogOpen||ui.catalogMode!=='extra')return;
      const previous=ui.draft.energy;
      ui.draft.energy=previous==='leve'?'normal':'leve';
      if(!persistDraft()){ui.draft.energy=previous;return notify('Não foi possível salvar a energia da sessão.');}
      render();return;
    }
    if(action==='catalog-show-all'){if(!ui.draft||!ui.catalogOpen)return;ui.catalogAll=!ui.catalogAll;render();return;}
    if(action==='catalog-extra-add'){
      if(!ui.draft||ui.catalogMode!=='extra'||ui.draft.extraChoice)return;
      const analysis=DOSE.analyze({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
        exercises:state.exercises,draft:ui.draft,settings:state.settings,today:today()});
      const options=F.options(state.exercises,ui.draft);
      const suggested=ADVICE.suggest({options,draft:ui.draft,exercises:state.exercises,
        strengthSessions:state.sessions,muaySessions:state.muay.sessions,
        settings:state.settings,today:today(),dose:DOSE,mode:'extra',analysis});
      if(!suggested.recommendations.some(item=>item.kind==='extra-exercise'&&
          item.id===btn.dataset.ex&&item.sourceId===btn.dataset.source))
        return notify('A recomendação mudou. Revise sua execução e recuperação.');
      const id=btn.dataset.ex,found=F.prepareCatalog(id,state.exercises);
      if(!found||found.isNew&&state.exercises.length>=200)return notify('Exercício indisponível no catálogo.');
      if(!F.addToDraft(ui.draft,id,found.exercise,{
        id,sets:[{load:'',reps:'',rir:'',warmup:false}],pain:''
      }))return notify('Exercício já incluído ou limite alcançado.');
      if(found.isNew){
        state.exercises.push(found.exercise);
        if(!save()){state.exercises.pop();delete ui.draft.entries[id];
          ui.draft.addedIds=ui.draft.addedIds.filter(x=>x!==id);return;}
      }
      ui.draft.extraChoice={kind:'exercise',id,sourceId:btn.dataset.source};
      if(!persistDraft()){delete ui.draft.extraChoice;delete ui.draft.entries[id];
        ui.draft.addedIds=ui.draft.addedIds.filter(x=>x!==id);
        return notify('Não foi possível salvar o rascunho.');}
      ui.catalogOpen=false;render();notify('Exercício opcional adicionado com uma série em branco.');return;
    }
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
      const choice=ui.draft?.extraChoice;
      const result=F.withdraw(ui.draft,btn.dataset.ex);
      if(result.error)return notify(result.error);
      if(choice?.kind==='exercise'&&choice.id===btn.dataset.ex)delete ui.draft.extraChoice;
      if(!persistDraft())return notify('Não foi possível salvar a alteração.');
      render();return;
    }
    if(action==='flex-restore'){
      if(!F.restore(ui.draft,btn.dataset.ex))return;
      if(!persistDraft())return notify('Não foi possível salvar a alteração.');
      render();return;
    }
    if(action==='dose-add-one'){
      if(!ui.draft||ui.draft.extraChoice)return;
      const ex=exerciseFor(btn.dataset.ex),en=ui.draft.entries[btn.dataset.ex];
      if(!ex||!en||en.sets.length>=12)return notify('Não é possível adicionar outra série neste exercício.');
      const decision=DOSE.analyze({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
        exercises:state.exercises,draft:ui.draft,settings:state.settings,today:today()});
      if(!decision.candidates.some(candidate=>candidate.exerciseId===ex.id))
        return notify('A sugestão já não se aplica aos dados atuais da sessão.');
      en.sets.push({load:'',reps:'',rir:'',warmup:false});
      ui.draft.extraChoice={kind:'set',id:ex.id};
      if(!persistDraft()){en.sets.pop();delete ui.draft.extraChoice;return notify('Não foi possível salvar a nova série.');}
      render();notify('Série opcional adicionada em branco. Só contará após ser realizada.');return;
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
      d.activities.push(M.activity(preset?.name||'',preset?.unit||'reps',preset||{}));save();render();return;
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
    if(action==='navigate') {ui.tab=btn.dataset.to;ui.editor=null;ui.nutritionOpen=false;render();window.scrollTo(0,0);}
    else if(action==='select-plan') {ui.plan=btn.dataset.plan;render();}
    else if(action==='start') startWorkout(btn.dataset.plan);
    else if(action==='add-set') {const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length<12){en.sets.push({load:'',reps:'',rir:'',warmup:false});persistDraft();render();}}
    else if(action==='remove-set'){const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length>1){
      en.sets.pop();
      if(ui.draft.extraChoice?.kind==='set'&&ui.draft.extraChoice.id===btn.dataset.ex &&
        en.sets.length===Number(exerciseFor(btn.dataset.ex)?.sets))delete ui.draft.extraChoice;
      persistDraft();render();
    }}
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
    else if(action==='export-ai')exportForAI();
    else if(action==='import-health')document.getElementById('import-health-file').click();
    else if(action==='export-csv')exportCSV();
    else if(action==='import-json')document.getElementById('import-file').click();
    else if(action==='reset'){
      if(confirm('Apagar permanentemente todos os registros deste aparelho? Exporte um backup antes de continuar.')){
        state=initial();clearDraft();muayMode=false;ui.editor=null;ui.tab='home';save();render();notify('Registros locais redefinidos.');
      }
    }
  }
  document.querySelector('.top-settings')?.addEventListener('click',()=>{
    ui.editor=null;ui.tab='settings';render();window.scrollTo(0,0);
  });
  document.getElementById('nav').addEventListener('click',event=>{
    const btn=event.target.closest('[data-tab]');if(!btn)return;
    ui.editor=null;ui.tab=btn.dataset.tab;
    if(ui.tab==='progress'){ui.bodyOpen=false;ui.nutritionOpen=false;ui.nutritionEditId=null;}
    render();window.scrollTo(0,0);
  });
  const screen=document.getElementById('screen');
  const motionDialog=document.getElementById('motion-dialog');
  motionDialog.addEventListener('click',event=>{
    const btn=event.target.closest('[data-action]');if(btn)handleAction(btn);
  });
  motionDialog.addEventListener('close',()=>{motionDialog.querySelector('.motion-dialog-content').replaceChildren();});
  screen.addEventListener('toggle',event=>{
    if(event.target.matches?.('.home-recovery'))ui.homeRecoveryOpen=event.target.open;
    if(event.target.matches?.('.history-calendar-fold'))ui.historyCalendarOpen=event.target.open;
  },true);
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
      if(!row || !['name','sets','quantity','unit','category','side'].includes(el.dataset.muayProp))return;
      row[el.dataset.muayProp]=el.value;
      if(el.dataset.muayProp==='unit'&&el.value!=='reps')row.side='total';
      if(el.dataset.muayProp==='category'){
        if(el.value==='combination'){row.unit='min';row.side='total';}
        if(el.value==='exhaustion')row.unit='reps';
      }
    }else return;
    if(!save())notify('Rascunho não salvo. Exporte seus dados.');
  }
  screen.addEventListener('input',event=>{
    collectDraft(event);updateMuayField(event);
    if(ui.draft && (event.target.dataset.draftMeta==='energy' || event.target.dataset.exPain)){
      const box=document.querySelector('.dose-card');
      if(box)box.outerHTML=renderDosePanel(true);
    }
    if(event.target.id==='nutrition-search'){
      const term=event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      document.querySelectorAll('[data-nutrition-name]').forEach(row=>{
        row.hidden=!row.dataset.nutritionName.includes(term);
      });
    }
    if(event.target.id==='catalog-search'){
      ui.catalogSearch=event.target.value;
      filterCatalogDOM();
    }
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
    if(el.dataset.recoveryField){
      ui.homeRecoveryOpen=true;
      const field=el.dataset.recoveryField;
      if(!['fatigue','kneePain'].includes(field))return;
      const value=el.value;
      if(field==='fatigue'&&!['normal','moderada','alta'].includes(value))return;
      if(field==='kneePain'&&value!==''&&(!Number.isInteger(Number(value))||Number(value)<0||Number(value)>10))return;
      const current=checkin();
      const previous=state.settings.recoveryCheckin;
      state.settings.recoveryCheckin={
        day:today(),energy:current?.energy||'normal',fatigue:current?.fatigue||'normal',
        kneePain:current?.kneePain??'', [field]:value
      };
      if(!save()){state.settings.recoveryCheckin=previous;return;}
      render();return;
    }
    if((el.dataset.muayProp==='unit'||el.dataset.muayProp==='category')&&state.muay.draft){
      render();return;
    }
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
    else if(event.target.id==='body-measures-form')saveBodyMeasures(event.target);
    else if(event.target.id==='bio-form')saveBio(event.target);

  });
  document.getElementById('import-file').addEventListener('change',event=>importJSON(event.target.files?.[0]));
  document.getElementById('import-health-file').addEventListener('change',event=>importHealthFile(event.target.files?.[0]));
  render();
  if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
    // Avoid a cached service-worker script after a new GitHub Pages release.
    const hadController=Boolean(navigator.serviceWorker.controller);
    let refreshed=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(hadController && !refreshed){
        refreshed=true;
        window.location.reload();
      }
    });
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=20261115-motion5',{updateViaCache:'none'})
      .catch(err=>console.warn('Offline indisponível',err)));
  }
})();
