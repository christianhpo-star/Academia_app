(function () {
  'use strict';
  const DATA = window.AcademiaData;
  const E = window.AcademiaEngine;
  const SETS = window.ForjaTrainingSets;
  const CARDIO = window.ForjaCardio;
  const M = window.AcademiaMuay;
  const FREE = window.ForjaFreeWorkout;
  const CAL = window.ForjaCalendar;
  const F = window.ForjaFlex;
  const ADVICE = window.ForjaCatalogAdvice;
  const DOSE = window.ForjaDose;
  const FOCUS = window.ForjaFocus;
  const BODY = window.ForjaBodyMeasures;
  const ACT = window.ForjaActivity;
  const REM = window.ForjaReminders;
  const ROUTINE = window.ForjaDailyRoutine;
  const PLANNER = window.ForjaGoalPlanner;
  const HEALTH = window.ForjaHealthImport;
  const NUTRITION = window.ForjaNutrition;
  const NUI = window.ForjaNutritionUI;
  const PERF = window.ForjaPerformanceTrends;
  const ANATOMY = window.ForjaExerciseAnatomy;
  const MUSCLE_MAP = window.ForjaMuscleMap;
  const BALANCE = window.ForjaTrainingBalance;
  const CRECO = window.ForjaCatalogRecommendations;
  const MUSCLE_BODY = window.ForjaMuscleBody;
  const SHARE = window.ForjaShareSummary;
  const STICKER = window.ForjaShareSticker;
  const CSESSION = window.ForjaCatalogSession;
  const EVO = window.ForjaEvolutionDashboard;
  const NCAT = window.ForjaNutritionCatalog;
  const KEY = 'forja.academia.v1';
  const DRAFT_KEY = 'forja.academia.draft.v1';
  const SAFETY_BACKUP_KEY = 'forja.academia.safety-backup.v1';
  const UNREADABLE_COPY_KEY = 'forja.academia.unreadable-copy.v1';
  let loadFailure = null;
  let unreadableOriginal = null;
  // Store a single pre-upgrade, validated snapshot on this device. Never remove
  // the only available local copy when validation or migration fails.
  function preserveValidatedSnapshot(raw) {
    if (!raw) return;
    try {
      if (!localStorage.getItem(SAFETY_BACKUP_KEY))
        localStorage.setItem(SAFETY_BACKUP_KEY, raw);
    } catch (err) {
      console.warn('Não foi possível criar cópia local de segurança; exporte um backup JSON.', err);
    }
  }

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
    const nutrition=NUTRITION.archive();
    window.ForjaNutritionGoals.useUserTarget(nutrition.settings,today());
    return {
      version: 1,
      referenceDefaultsVersion: 1,
      abdomenDefaultsVersion: 1,
      settings: { startWeight: 88.3, targetWeight: 82, goalDate: '2027-01-14', fatigue: 'normal', kneePain: '' },
      weights: [{ id:'initial-2026-10-30', date:'2026-10-30', weight:88.3, initial:true }],
      sessions: [], exercises: copy(DATA.exercises), muay: M.archive(), bodyMeasurements:[],bioimpedance:[],activitySteps:[],healthMonthly:[],healthWeightReports:[],reminderPrefs:{enabled:true,items:{}},dailyRoutine:ROUTINE.defaults(),recoveryHistory:[], nutrition,
    };
  }
  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY); if (!raw) return initial();
      const parsed = JSON.parse(raw);
      if (!validState(parsed)) throw new Error('Backup incompatível');
      const upgradedMuay = M.ensureArchive(parsed);
      const upgradedNutrition = NUTRITION.ensureArchive(parsed);
      const upgradedProfessionalTarget = window.ForjaNutritionGoals.useUserTarget(parsed.nutrition.settings,today());
      if (!M.validArchive(parsed.muay)) throw new Error('Dados Muay Thai incompatíveis');
      const upgradedRecovery = !Array.isArray(parsed.recoveryHistory);
      if(upgradedRecovery)parsed.recoveryHistory=[];
      if(parsed.settings.recoveryCheckin && !parsed.recoveryHistory.some(r=>r.day===parsed.settings.recoveryCheckin.day)){
        const revised=PERF?.upsertRecovery(parsed.recoveryHistory,parsed.settings.recoveryCheckin);
        if(revised)parsed.recoveryHistory=revised;
      }
      const upgradedReferences = migrateReferences(parsed);
      const upgradedAbdomen = DATA.ensureAbdomen(parsed);
      if (upgradedMuay || upgradedNutrition || upgradedReferences || upgradedAbdomen || upgradedProfessionalTarget || upgradedRecovery) {
        preserveValidatedSnapshot(raw);
        try { localStorage.setItem(KEY, JSON.stringify(parsed)); }
        catch (err) { console.warn('Não foi possível persistir as referências iniciais.', err); }
      }
      return parsed;
    } catch (err) {
      console.warn('Não foi possível ler os registros', err);
      loadFailure = err;
      unreadableOriginal = raw;
      if (raw) {
        try {
          if (!localStorage.getItem(UNREADABLE_COPY_KEY))
            localStorage.setItem(UNREADABLE_COPY_KEY, raw);
        } catch (_) { /* the primary original stays untouched */ }
      }
      // This in-memory template is NEVER allowed to overwrite a nonreadable
      // existing archive. Display the protected recovery screen instead.
      return initial();
    }
  }
  function validState(value) {
    return value && value.version === 1 && value.settings &&
      Number.isFinite(Number(value.settings.startWeight)) &&
      Number.isFinite(Number(value.settings.targetWeight)) &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.settings.goalDate || '') &&
      Array.isArray(value.weights) && value.weights.length <= 10000 &&
      value.weights.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date || '') && Number(x.weight)>0 && Number(x.weight)<500) &&
      BODY.validRecords(value.bodyMeasurements) && BODY.validBioRecords(value.bioimpedance) && ACT.validSteps(value.activitySteps) && HEALTH.validMonthlyList(value.healthMonthly) && HEALTH.validWeightReports(value.healthWeightReports) && REM.validPrefs(value.reminderPrefs) && ROUTINE.valid(value.dailyRoutine) && NUTRITION.validArchive(value.nutrition) &&
      (value.recoveryHistory===undefined || (Array.isArray(value.recoveryHistory)&&value.recoveryHistory.length<=1095&&value.recoveryHistory.every(r=>r&&typeof r.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&['boa','normal','baixa'].includes(r.energy)&&['normal','moderada','alta'].includes(r.fatigue)))) &&
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
      if (record.version !== 1 || !draft || !(DATA.rotation.includes(draft.planId) || FREE.isFree(draft)) ||
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
    plan: DATA.rotation.includes(recoveredDraft?.draft.planId)?recoveredDraft.draft.planId:'A', editor:null,
    draft: recoveredDraft?.draft || null,
    recovered: Boolean(recoveredDraft),
    draftSavedAt: recoveredDraft?.savedAt || null,
    draftSaveOk: Boolean(recoveredDraft),
    strengthGroup: null, strengthExercise: null,
    catalogContext:'browse',catalogSourceId:null,
    catalogGroup:'all',catalogStyle:'all',catalogSearch:'',catalogLimit:12,
    catalogDetailId:null,catalogConfirmId:null,catalogScrollY:0,
    freeSearch:'',freeAll:false,
    anatomyOpen:{},anatomyViews:{},
    focusedMode: false, focusedExercise: null,
    balancePending:null, balanceDismissed:false,
    share:null,shareBlob:null,
    cardioOpen: Boolean(recoveredDraft?.draft?.cardio?.length),
    calendarMonth: today().slice(0,7), calendarDay: today(),
    bodyOpen:false,bodyView:'current',bodyEditDate:null,bioOpen:false,bioEditDate:null,homeRecoveryOpen:false,routineHidden:false,
    nutritionOpen:false,nutritionEditId:null,nutritionLimit:3,nutritionPicked:null,
    historyStrengthLimit:3,historyMuayLimit:3,historyCalendarOpen:false,historyFilter:'all',
    progressStepDays:14,progressRadarOpen:false,
    evolutionView:'weight',evolutionPeriods:{energy:7,macros:7,average:7},evolutionWeightLimit:8,evolutionExtrasOpen:false,
    evolutionChartMode:'weight',evolutionMeasureKey:'abdomen',evolutionVolumeDays:30,evolutionTrainingOpen:false,
    evolutionMuscleView:'front',evolutionMuscleSelected:null,evolutionMuscleListOpen:false,evolutionMuscleMethodOpen:false,
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
    if (loadFailure) {
      notify('Dados antigos protegidos. Exporte a cópia original antes de tentar recuperar.');
      return false;
    }
    try {
      const previous = localStorage.getItem(KEY);
      if (previous && previous !== JSON.stringify(state)) {
        try {
          if (validState(JSON.parse(previous))) preserveValidatedSnapshot(previous);
        } catch (_) { /* never copy a corrupt state into the validated snapshot */ }
      }
      localStorage.setItem(KEY,JSON.stringify(state));
      return true;
    }
    catch (err) { notify('Armazenamento indisponível. Exporte um backup antes de sair.'); return false; }
  }
  function notify(message) {
    const el = document.getElementById('toast');
    el.textContent = message; el.hidden = false;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(()=>{el.hidden=true;},4800);
  }
  const planFor = id => id===FREE.PLAN_ID?
    {id:FREE.PLAN_ID,title:'Treino livre',subtitle:'Exercícios avulsos, sem alterar a sequência A/B/C/D.',type:'free'}:
    DATA.plans.find(p => p.id === id) || DATA.plans[0];
  const exerciseFor = id => state.exercises.find(x => x.id === id);
  const currentExercises = id => state.exercises.filter(x=>x.group===id && x.active);
  const repsLabel = ex => ex?.repPerSide ? 'repetições por lado' : 'repetições';
  const loadLabel = (load, ex) => SETS.allowsZero(ex)
    ? Number(load)===0 ? 'Peso do corpo' : '+'+fmt(load)+' kg adicionais'
    : fmt(load)+' '+(ex?.unit||'kg');
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
  let shareRenderVersion=0;
  function render() {
    const main = document.getElementById('screen');
    if (loadFailure) {
      main.innerHTML = '<section class="card" role="alert" aria-label="Proteção de histórico">'+
        '<h1>Seus dados precisam ser recuperados.</h1>'+
        '<p>O FORJA encontrou dados locais que não conseguiu validar. O arquivo original NÃO foi apagado pelo carregamento e nenhum novo registro poderá sobrescrevê-lo nesta tela.</p>'+
        (unreadableOriginal?'<button type="button" class="primary full" data-action="recovery-export-raw">Baixar cópia dos registros encontrados (JSON)</button>':'<p>O navegador não permitiu ler o armazenamento. Não limpe os dados deste site.</p>')+
        '<p class="small muted">Após guardar o arquivo, procure o suporte para uma recuperação segura. Não desinstale ou limpe o armazenamento local.</p></section>';
      return;
    }
    const trainingArea=ui.tab==='plans'||ui.tab==='catalog';
    const content=ui.tab === 'plans' && muayMode ? renderMuay() : ui.editor ? renderEditor() : ui.draft && ui.tab === 'plans' ? (FREE.isFree(ui.draft)?renderFreeWorkout():renderTraining()) :
      ui.tab === 'home' ? renderHome() : ui.tab === 'plans' ? renderPlans() : ui.tab === 'catalog' ? renderCatalog() :
      ui.tab === 'nutrition' ? diary.render() : ui.tab === 'progress' ? (ui.bodyOpen ? renderBodyMeasures() : renderProgress()) : ui.tab === 'history' ? renderHistory() : ui.tab === 'share' ? renderShare() : renderSettings();
    main.innerHTML=(trainingArea?renderTrainingDestinations():'')+content;
    if(ui.tab==='nutrition')diary.mount();
    if(ui.tab==='share')mountSharePreview();else shareRenderVersion++;
    document.querySelectorAll('#nav [data-tab]').forEach(btn=>{
      const active=btn.dataset.tab===ui.tab||(ui.tab==='catalog'&&btn.dataset.tab==='plans')||(ui.tab==='share'&&btn.dataset.tab==='history');
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
      if(current.action==='weight'){openProgress('weight',{weightEditor:true});}
      else if(current.action==='body'){ui.tab='progress';ui.evolutionView='weight';ui.bodyOpen=true;ui.bodyView='current';render();document.getElementById('body-measures-form')?.scrollIntoView({block:'start'});}
      else if(current.action==='bio'){ui.tab='progress';ui.evolutionView='weight';ui.bodyOpen=true;ui.bodyView='current';ui.bioOpen=true;render();document.querySelector('.bio-panel')?.scrollIntoView({block:'start'});}
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
  function renderDailyRoutine(){
    if(ui.routineHidden)return '';
    const report=ROUTINE.status(state.dailyRoutine,today());
    if(!report.configured)return '';
    const actions=report.items.map(slot=>{
      const label=slot.confirmed?'Registrado hoje':'A confirmar';
      return '<div class="routine-row"><span class="routine-icon" aria-hidden="true">'+(slot.kind==='medication'?'◈':'◇')+'</span>'+
        '<div class="routine-details"><strong>'+esc(slot.label)+'</strong><small>'+esc(slot.title)+(slot.time?' · '+slot.time:' · sem horário')+'</small></div>'+
        '<span class="routine-status">'+label+'</span>'+
        '<button type="button" class="'+(slot.confirmed?'secondary':'primary')+' routine-confirm" data-action="routine-confirm" data-slot="'+slot.id+'" aria-pressed="'+String(slot.confirmed)+'">'+
        (slot.confirmed?'Desfazer':'Registrei')+'</button></div>';
    }).join('');
    return '<section class="daily-routine card" aria-label="Rotina diária opcional">'+
      '<div class="row-between"><div><p class="eyebrow">ROTINA DO DIA</p><h2 class="section-title">Cuidados diários</h2></div>'+
      '<button type="button" class="button-inline" data-action="routine-hide">Ocultar nesta abertura</button></div>'+
      actions+'<div class="routine-footer"><button type="button" class="button-inline" data-action="routine-manage">'+
      'Editar rotina e horários'+'</button><p class="tiny muted">Registro voluntário. Sem alertas externos ou mudanças automáticas nos treinos e metas.</p></div></section>';
  }
  function renderDailyRoutineSettings(){
    const archive=ROUTINE.normalize(state.dailyRoutine);
    const fields=archive.slots.map(slot=>{
      const title=ROUTINE.meta[slot.id].title;
      return '<fieldset class="routine-config-item"><legend>'+title+'</legend>'+
        '<label for="routine-'+slot.id+'-label">Nome</label>'+
        '<input id="routine-'+slot.id+'-label" name="'+slot.id+'Label" maxlength="80" placeholder="'+
          (slot.id==='medication'?'Nome do medicamento prescrito':'Nome do suplemento')+'" value="'+esc(slot.label)+'">'+
        '<label for="routine-'+slot.id+'-time">Horário de referência (opcional)</label>'+
        '<input id="routine-'+slot.id+'-time" type="time" name="'+slot.id+'Time" value="'+esc(slot.time)+'">'+
        '<label class="routine-check"><input type="checkbox" name="'+slot.id+'Active" '+(slot.active?'checked':'')+'> Incluir na rotina</label></fieldset>';
    }).join('');
    const present=archive.enabled;
    return '<section class="card routine-settings" id="routine-settings"><h2 class="section-title">Rotina diária opcional</h2>'+
      '<p class="small muted">Para medicamento, use apenas o nome e o horário prescritos. Não é necessário informar dose. A confirmação é manual e os dados ficam neste dispositivo.</p>'+
      '<form id="daily-routine-form">'+fields+'<button class="primary full mt-12" type="submit">Salvar configuração</button></form>'+
      (archive.slots.some(slot=>slot.active&&slot.label.trim())?
        '<button class="secondary full mt-12" type="button" data-action="routine-enable">'+
        (present?'Desativar cartão de rotina':'Ativar cartão de rotina')+'</button>':'')+
      '<p class="tiny muted">Não há notificações em segundo plano nem indicação de doses perdidas. Você pode remover registros de hoje com Desfazer.</p></section>';
  }
  function saveDailyRoutineSettings(form){
    const values=new FormData(form);
    const configuration={};
    for(const id of ROUTINE.IDS){
      configuration[id]={label:String(values.get(id+'Label')||''),time:String(values.get(id+'Time')||''),active:values.has(id+'Active')};
    }
    const result=ROUTINE.configure(state.dailyRoutine,configuration,today());
    if(result.error)return notify(result.error);
    const previous=state.dailyRoutine;state.dailyRoutine=result.archive;
    if(!save()){state.dailyRoutine=previous;return;}
    render();notify('Configuração salva neste aparelho.');
  }
  function handleDailyRoutineAction(btn){
    const action=btn.dataset.action;
    if(action==='routine-hide'){ui.routineHidden=true;render();return;}
    if(action==='routine-show'){ui.routineHidden=false;render();return;}
    if(action==='routine-manage'){ui.tab='settings';render();document.getElementById('routine-settings')?.scrollIntoView({block:'start'});return;}
    if(action==='routine-enable'){
      const result=ROUTINE.setEnabled(state.dailyRoutine,ROUTINE.normalize(state.dailyRoutine).enabled===false);
      if(result.error)return notify(result.error);
      const previous=state.dailyRoutine;state.dailyRoutine=result.archive;
      if(!save()){state.dailyRoutine=previous;return;}
      ui.routineHidden=false;render();notify('Preferência da rotina salva.');return;
    }
    if(action==='routine-confirm'){
      const result=ROUTINE.toggleRecord(state.dailyRoutine,btn.dataset.slot,today(),new Date().toISOString());
      if(result.error)return notify(result.error);
      const previous=state.dailyRoutine;state.dailyRoutine=result.archive;
      if(!save()){state.dailyRoutine=previous;return;}
      render();notify(result.confirmed?'Confirmação registrada.':'Confirmação desfeita.');return;
    }
  }
  function homeStepsCard(){
    const day=today(),current=(state.activitySteps||[]).find(row=>row.date===day);
    return '<section class="card home-steps-quick" aria-labelledby="home-steps-title">'+
      '<div class="row-between"><div><p class="eyebrow">REGISTRO DIÁRIO</p><h2 class="section-title" id="home-steps-title">Passos de hoje</h2></div><span class="home-steps-status">'+(current?'Registrado':'Ainda não informado')+'</span></div>'+
      '<p class="small muted">Informe o total do Samsung Health ao final do dia.</p>'+
      '<form id="home-steps-form" class="home-steps-form">'+
      '<div class="field"><label for="home-step-date">Data</label><input id="home-step-date" name="date" type="date" max="'+day+'" value="'+day+'" required></div>'+
      '<div class="field"><label for="home-step-count">Número de passos</label><input id="home-step-count" name="steps" type="number" inputmode="numeric" min="0" max="100000" step="1" value="'+(current?current.steps:'')+'" placeholder="Ex.: 8500" required></div>'+
      '<button type="submit" class="primary">'+(current?'Atualizar':'Salvar')+'</button></form>'+
      '<button type="button" class="button-inline home-steps-trend" data-action="progress-open-training" data-section="progress-steps-title">Ver evolução dos passos <span aria-hidden="true">›</span></button></section>';
  }
  function saveHomeSteps(form){
    const fd=new FormData(form),date=String(fd.get('date')||''),count=String(fd.get('steps')||'').trim();
    if(date>today())return notify('Não é possível registrar uma data futura.');
    const out=ACT.upsertSteps(state.activitySteps||[],date,count);
    if(out.error)return notify(out.error);
    const before=state.activitySteps;state.activitySteps=out.items;
    if(!save()){state.activitySteps=before;return notify('Não foi possível salvar os passos. O histórico foi preservado.');}
    render();notify('Passos registrados para '+dateBR(date)+'.');
  }
  function renderHome() {
    const next=getNext(),plan=next.id?planFor(next.id):null;
    const pending=dueKnee(),check=checkin();
    const checkLabel=check ? (check.energy==='baixa'?'Pouca energia':check.energy==='boa'?'Bem recuperado':'Energia normal') : 'Não informado';
    const block=ui.draft?planFor(ui.draft.planId):null;
    return `${headline('Hoje','Seu próximo passo.')}
      <section class="home-primary card" aria-labelledby="home-primary-title">
        <div class="row-between"><span class="home-step-label">${ui.draft?'EM ANDAMENTO':next.rest?'RECUPERAÇÃO SUGERIDA':'TREINO SUGERIDO'}</span>
          ${tag(ui.draft?(FREE.isFree(ui.draft)?'Treino livre':`Bloco ${ui.draft.planId}`):next.rest?'Descanso':`Bloco ${next.id}`,ui.draft||!next.rest?'green':'amber')}</div>
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
      ${renderBalanceAlert()}
      ${pending.length?`<div class="callout warn home-pending"><strong>Joelho: avaliação pendente</strong>
        <p>Há ${pending.length} treino(s) aguardando registro após 24h.
        <button class="button-inline" data-action="history-knee">Avaliar no histórico</button></p></div>`:''}
      <details class="home-recovery" ${ui.homeRecoveryOpen?'open':''}>
        <summary><span><strong>Como está sua recuperação hoje?</strong><small>${esc(checkLabel)}</small></span>
          <span class="home-recovery-action">${check?'Atualizar':'Informar'} <span aria-hidden="true">⌄</span></span></summary>
        <div class="home-recovery-body">${renderRecoveryCheckin()}</div>
      </details>
      <div class="home-minimal-links" role="group" aria-label="Registros rápidos">
        <button class="home-muay-link" data-action="open-muay"><span>Registrar Muay Thai</span><span aria-hidden="true">›</span></button>
        <button class="home-muay-link" data-action="free-start"><span>Registrar treino livre</span><span aria-hidden="true">›</span></button>
        <button class="home-muay-link" data-action="nutrition-open"><span>Registrar alimentação</span><span aria-hidden="true">›</span></button>
      </div>
      ${homeStepsCard()}
      ${renderDailyRoutine()}
      ${renderReminderPanel('home')}
      ${!ROUTINE.status(state.dailyRoutine,today()).configured?`<button class="button-inline home-routine-setup" data-action="routine-manage">Configurar rotina diária (opcional)</button>`:''}`;
  }
  function catalogContext(){
    return ui.draft && ['replace','add','extra'].includes(ui.catalogContext)
      ?ui.catalogContext:'browse';
  }
  function leaveSessionCatalog(){
    ui.tab='plans';ui.catalogContext='browse';ui.catalogSourceId=null;
    ui.catalogDetailId=null;ui.catalogConfirmId=null;
    render();window.scrollTo(0,0);
  }
  function openSessionCatalog(context='add',sourceId=null){
    if(!ui.draft||!['replace','add','extra'].includes(context))return false;
    if(sourceId&&!Object.hasOwn(ui.draft.entries||{},sourceId))return false;
    if(context==='replace'&&sourceId&&F.hasRecordedReps(ui.draft.entries[sourceId]))
      return notify('Este exercício tem repetições registradas. Ele não pode ser substituído sem preservar esses dados.');
    ui.catalogContext=context;ui.catalogSourceId=context==='replace'?(sourceId||null):null;
    ui.catalogDetailId=null;ui.catalogConfirmId=null;ui.catalogSearch='';ui.catalogGroup='all';ui.catalogStyle='all';ui.catalogLimit=12;
    ui.tab='catalog';ui.editor=null;render();window.scrollTo(0,0);return true;
  }
  function sessionAdvice(mode){
    if(!ui.draft)return {recommendations:[],message:'',caution:'',basis:''};
    const choices=F.options(state.exercises,ui.draft);
    const analysis=DOSE.analyze({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      exercises:state.exercises,draft:ui.draft,settings:state.settings,today:today()});
    return ADVICE.suggest({options:choices,draft:ui.draft,exercises:state.exercises,
      strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      settings:state.settings,today:today(),dose:DOSE,mode:mode==='extra'?'extra':'replacement',analysis});
  }
  function eligibleExtraIds(){
    return sessionAdvice('extra').recommendations
      .filter(item=>item.kind==='extra-exercise'&&item.sourceId).map(item=>item.id);
  }
  function renderCatalogContext(inDetail=false){
    const mode=catalogContext();if(mode==='browse')return '';
    const source=ui.catalogSourceId&&ui.draft.entries[ui.catalogSourceId];
    const alternatives=CSESSION.sourceOptions(ui.draft);
    const summary=mode==='replace'?'Escolha uma alternativa para substituir um exercício não realizado.':
      mode==='extra'?'Acréscimo opcional com recomendação de recuperação; no máximo um.':
      'Inclua um movimento só nesta sessão, sem alterar sua ficha.';
    const advice=sessionAdvice(mode);
    const shown=mode==='replace'
      ?advice.recommendations.filter(item=>item.referenceId===ui.catalogSourceId)
      :mode==='extra'?advice.recommendations.filter(item=>item.kind==='extra-exercise'):[];
    const recommendations=shown.map(item=>'<article class="catalog-suggestion">'+
      '<div class="catalog-recommend-heading"><strong>'+esc(item.name)+'</strong>'+
      '<span class="catalog-recommend-tag">'+(mode==='extra'?'Uma série opcional':'Alternativa')+'</span></div>'+
      '<p class="small">'+esc(item.reason)+'</p>'+
      '<button type="button" class="secondary catalog-view-button" data-action="catalog-view" data-ex="'+esc(item.id)+'">Ver detalhes</button></article>').join('');
    return '<section class="card catalog-session-context" aria-label="Catálogo da sessão">'+
      '<div class="row-between"><h2>Escolher exercício para esta sessão</h2>'+
      '<button type="button" class="button-inline" data-action="catalog-return-session">Voltar ao treino</button></div>'+
      '<div class="catalog-session-modes" role="group" aria-label="O que deseja fazer">'+
      [['replace','Substituir'],['add','Adicionar'],['extra','Tenho energia extra']].map(([key,label])=>
        '<button type="button" data-action="catalog-session-mode" data-mode="'+key+'" aria-pressed="'+(mode===key)+'" class="'+(mode===key?'selected':'')+'">'+label+'</button>').join('')+'</div>'+
      '<p class="small muted">'+esc(summary)+'</p>'+
      (mode==='replace'?'<div class="field"><label for="catalog-source-select">Exercício que será substituído</label>'+
        '<select id="catalog-source-select" aria-label="Exercício a substituir">'+
        '<option value="">Escolha um exercício da sessão</option>'+
        alternatives.map(entry=>'<option value="'+esc(entry.id)+'"'+(source?.id===entry.id?' selected':'')+'>'+
          esc(exerciseFor(entry.id)?.name||entry.id)+'</option>').join('')+'</select>'+
        '<p class="small muted">Exercícios com repetições registradas não podem ser retirados automaticamente.</p></div>':'')+
      (mode==='extra'?'<p class="small muted">Sua energia é '+(ui.draft.energy==='leve'?'boa':'ainda não classificada como sobrando')+
        '. <button type="button" class="button-inline" data-action="catalog-energy">'+
        (ui.draft.energy==='leve'?'Rever energia':'Registrar energia sobrando')+'</button></p>':'')+
      (advice.caution?'<p class="catalog-caution">'+esc(advice.caution)+'</p>':'')+
      (mode!=='add'&&!inDetail?'<div class="catalog-contextual" aria-label="Sugestões para esta sessão">'+
        '<h3>'+ (mode==='extra'?'Acréscimos elegíveis':'Sugestões para este treino')+'</h3>'+
        (recommendations||'<p class="small muted">'+(mode==='replace'&&!ui.catalogSourceId?
          'Selecione acima o exercício original para ver alternativas relacionadas.':
          'Nenhuma sugestão elegível; você ainda pode consultar os detalhes de outros movimentos.')+'</p>')+
        '<p class="small muted">'+esc(advice.basis)+'</p></div>':'')+
      '</section>';
  }
  // The catalog remains an independent, read-only view even while a session
  // draft exists. Switching destinations changes UI only, never local storage.
  function renderTrainingDestinations(){
    const inCatalog=ui.tab==='catalog';
    const pending=Boolean(ui.draft||state.muay.draft);
    return '<div class="training-destinations" role="group" aria-label="Áreas de Treinos">'+
      '<button type="button" data-action="training-destination" data-to="plans" class="training-destination'+(!inCatalog?' selected':'')+'" aria-pressed="'+!inCatalog+'">Minhas fichas</button>'+
      '<button type="button" data-action="training-destination" data-to="catalog" class="training-destination'+(inCatalog?' selected':'')+'" aria-pressed="'+inCatalog+'">Catálogo</button>'+
      '</div>'+
      (inCatalog&&pending&&catalogContext()==='browse'?'<div class="training-draft-notice" role="status"><span>Treino em andamento preservado.</span>'+
        '<button type="button" class="button-inline" data-action="training-destination" data-to="plans">Voltar ao treino</button></div>':'');
  }
  // Text aliases are discoverability aids; neither search nor viewing alters a workout.
  function catalogSearchText(ex) {
    const variant=CRECO?.variant?.(ex);
    return [ex.name,ex.muscle,ex.equipment,variant?.tip||'',...(ex.aliases||[])]
      .join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  }
  // A catalog detail is informational: it reads catalog metadata and the
  // local SVG guide only. All persisted changes require a separate confirmation.
  function catalogAdviceContext(){
    return CRECO?.status?.({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      exercises:state.exercises,draft:ui.draft,settings:state.settings,
      nutritionGoal:state.nutrition?.settings?.profile?.goal||'',
      today:today()})||{ready:false,alerts:[],reason:'Sem dados.'};
  }
  function catalogIsShoulder(ex){
    const regions=ANATOMY?.describe?.(ex.id)?.main||[];
    return ['frontDelts','sideDelts','rearDelts','upperTraps','midTraps'].some(id=>regions.includes(id));
  }
  function catalogBadge(ex,context,preferred=null){
    return preferred||CRECO?.forExercise?.(ex,context)||null;
  }
  function renderCatalogDetail(ex){
    const current=state.exercises.find(item=>item.id===ex.id);
    const guide=ANATOMY?.describe(ex.id);
    const anatomyView=ui.anatomyViews[ex.id];
    const locationNote=role=>{
      const note=ANATOMY?.legendNote(ex.id,anatomyView,role)||'';
      return '<small class="ex-anatomy-legend-location" data-anatomy-location="'+role+'"'+(!note?' hidden':'')+'>'+esc(note)+'</small>';
    };
    const illustration=guide
      ? ANATOMY.viewer(ex.id,anatomyView,'catalog')
      : '<div class="catalog-detail-unmapped" role="note">Mapa anatômico ainda não revisado para este exercício.</div>';
    const muscleInfo=guide
      ? '<div class="catalog-detail-muscle-line"><span class="catalog-muscle-dot main" aria-hidden="true"></span><span><small>Principal</small><strong>'+esc(guide.primary)+'</strong>'+locationNote('main')+'</span></div>'+
        (guide.secondary?'<div class="catalog-detail-muscle-line"><span class="catalog-muscle-dot assist" aria-hidden="true"></span><span><small>Auxiliares</small><strong>'+esc(guide.secondary)+'</strong>'+locationNote('assist')+'</span></div>':'')
      : '<p class="small muted">Grupo indicado na ficha: '+esc(ex.muscle||'Não informado')+'. Sem divisão anatômica revisada.</p>';
    const adviceContext=catalogAdviceContext(),recommended=catalogBadge(ex,adviceContext);
    const variant=CRECO?.variant?.(ex);
    const dayGuide=CRECO?.prescription?.({exercise:ex,context:adviceContext,
      strengthSessions:state.sessions,muaySessions:state.muay.sessions,settings:state.settings,
      today:today(),draft:ui.draft});
    const confirmation=ui.catalogConfirmId===ex.id;
    const status=current?.active?'Na minha ficha':current?'Inativo na ficha':'Disponível';
    const mode=catalogContext(),inSession=mode!=='browse';
    const source=mode==='replace'?ui.draft.entries[ui.catalogSourceId]:null;
    const gate=inSession?CSESSION.canChoose({draft:ui.draft,mode,sourceId:ui.catalogSourceId,
      targetId:ex.id,eligibleExtraIds:mode==='extra'?eligibleExtraIds():[]}):{ok:true};
    const verb=mode==='replace'?'Substituir por este exercício':mode==='extra'?'Acrescentar uma série opcional':'Adicionar só neste treino';
    const sourceName=source?exerciseFor(source.id)?.name||source.id:'';
    const note=mode==='replace'?'Trocar '+sourceName+' por '+ex.name+
      ' somente nesta sessão. As repetições anteriores não serão apagadas.':
      mode==='extra'?'Adicionar '+ex.name+' com uma série vazia, sem mudar a ficha permanente.':
        'Adicionar '+ex.name+' somente à sessão atual, sem alterar a ficha permanente.';
    const action=inSession
      ? !gate.ok?'<p class="catalog-detail-status" role="status">'+esc(gate.error)+'</p>':
        confirmation
          ? '<p id="catalog-confirm-message" class="catalog-detail-status" role="status">'+esc(note)+'</p>'+
            '<div class="catalog-detail-confirm-row"><button class="primary" type="button" data-action="catalog-confirm" data-ex="'+esc(ex.id)+'">Confirmar</button>'+
            '<button class="secondary" type="button" data-action="catalog-cancel">Cancelar</button></div>'
          : '<button type="button" class="secondary full" data-action="catalog-intent" data-ex="'+esc(ex.id)+'">'+verb+'</button>'
      : current?.active
        ? '<p class="catalog-detail-status">Este movimento já está ativo no bloco '+esc(ex.group)+'.</p>'+
          '<button type="button" class="secondary full" data-action="catalog-edit-in-plan" data-ex="'+esc(ex.id)+'">Editar na minha ficha</button>'
        : confirmation
          ? '<p id="catalog-confirm-message" class="catalog-detail-status" role="status">'+
            (current?'Ativar':'Adicionar')+' '+esc(ex.name)+' na ficha do bloco '+esc(ex.group)+'? Esta ação não inicia nem altera o treino em andamento.</p>'+
            '<div class="catalog-detail-confirm-row"><button class="primary" type="button" data-action="catalog-confirm" data-ex="'+esc(ex.id)+'">Confirmar</button>'+
            '<button class="secondary" type="button" data-action="catalog-cancel">Cancelar</button></div>'
          : '<button type="button" class="secondary full" data-action="catalog-intent" data-ex="'+esc(ex.id)+'">'+
            (current?'Ativar na ficha':'Adicionar à ficha')+' · Bloco '+esc(ex.group)+'</button>';
    return '<section class="catalog-detail" aria-labelledby="catalog-detail-heading">'+
      '<button type="button" class="catalog-detail-back" data-action="catalog-back">← Voltar ao catálogo</button>'+
      '<div class="catalog-detail-intro"><p class="eyebrow">BLOCO '+esc(ex.group)+' · '+esc(status)+'</p>'+
      '<h1 class="page-title" id="catalog-detail-heading" tabindex="-1">'+esc(ex.name)+'</h1>'+
      '<p class="lead">'+(inSession?'Confira os músculos e a execução antes de escolher.':'Conheça os músculos trabalhados e a execução.')+'</p>'+
      (variant?'<p class="small catalog-variant-caption">'+esc(variant.difficulty==='easy'?'Alternativa simples':'Alternativa')+' · '+esc(variant.tip)+'</p>':'')+
      (recommended?'<div class="catalog-detail-advice"><strong>Recomendado para revisar '+esc(recommended.region.toLowerCase())+'</strong><p>'+
        esc(recommended.message)+'</p></div>':'')+
      (dayGuide?'<section class="catalog-volume-context" aria-label="Sugestão conforme objetivo e treinos realizados">'+
        '<strong>Objetivo: '+esc(adviceContext.goalLabel||'Recomposição corporal')+'</strong>'+
        '<p>Hoje: '+dayGuide.todayExercises+' exercícios e '+dayGuide.todaySets+' séries efetivas; últimos 7 dias: '+
        dayGuide.weekExercises+' exercícios e '+dayGuide.weekSets+' séries registradas.</p>'+
        '<p class="catalog-volume-suggestion"><strong>'+
        (dayGuide.level==='hold'?'Não recomendamos acrescentar esta região hoje.':dayGuide.level==='reduce'?
          'Prefira não ampliar o volume; se precisar trocar, use até '+dayGuide.sets+' série.':
          'Se escolher este exercício: '+dayGuide.sets+' séries · '+dayGuide.low+'–'+dayGuide.high+' repetições · RIR '+esc(dayGuide.rirTarget))+
        '</strong></p>'+
        '<details><summary>Como a sugestão foi calculada?</summary><p>'+esc(dayGuide.reason)+'</p>'+
        (dayGuide.caution?'<p>'+esc(dayGuide.caution)+'</p>':'')+'</details></section>':'')+'</div>'+
      '<section class="card catalog-detail-card" aria-label="Informações do exercício">'+
      illustration+
      '<div class="catalog-detail-muscles">'+muscleInfo+'</div>'+
      '<div class="catalog-detail-facts"><div><small>Equipamento</small><strong>'+esc(ex.equipment||'Não informado')+'</strong></div>'+
      '<div><small>Grupo da ficha</small><strong>'+esc(ex.muscle||'Não informado')+'</strong></div>'+
      '<div><small>Sugestão inicial</small><strong>'+esc(String(ex.sets))+' séries · '+esc(String(ex.low))+'–'+esc(String(ex.high))+' '+repsLabel(ex)+'</strong></div></div>'+
      (SETS.allowsZero(ex)?'<p class="small muted">'+(ex.id.endsWith('-elastico')?'Resistência elástica: 0 kg registra uma série executada com a banda sem quantificar a tensão.':'Peso do corpo: registre 0 kg quando não usar carga adicional.')+'</p>':'')+
      (ex.repPerSide?'<p class="small muted">Faça os dois lados e registre as repetições por lado. A dupla conta como uma série.</p>':'')+
      '<div class="catalog-detail-technique"><h2>Execução</h2>'+
      (guide?'<p>'+esc(guide.cue)+'</p><p class="small muted">Mapa ilustrativo: a participação muscular varia com a técnica e o equipamento.</p>':
        '<p>Orientação técnica específica ainda não revisada. Consulte as instruções do equipamento e um profissional habilitado.</p>')+
      (ex.knee?'<p class="catalog-detail-knee">Movimento sinalizado para atenção ao joelho no seu planejamento. Respeite desconfortos durante a execução.</p>':'')+
      '</div></section>'+
      '<section class="card catalog-detail-actions" aria-label="Ações do catálogo"><h2>'+(inSession?'Nesta sessão':'Minha ficha')+'</h2>'+
      '<p class="small muted">Consultar este exercício não registra séries nem altera seu planejamento.</p>'+
      action+'</section></section>';
  }
  function renderCatalog() {
    const context=catalogContext(),inSession=context!=='browse';
    // The exact same list and details serve browsing and in-session selection.
    const selected=ui.catalogDetailId && F.options(state.exercises,null).find(ex=>ex.id===ui.catalogDetailId);
    if(selected)return renderCatalogContext(true)+renderCatalogDetail(selected);
    const all=F.options(state.exercises,inSession?ui.draft:null);
    const known=new Map(state.exercises.map(ex=>[ex.id,ex]));
    const shown=all.filter(ex=>(ui.catalogGroup==='all'||(ui.catalogGroup==='S'?catalogIsShoulder(ex):ex.group===ui.catalogGroup)) &&
      (ui.catalogGroup!=='S'||ui.catalogStyle==='all'||(()=>{
        const v=CRECO?.variant?.(ex);
        return v&&(ui.catalogStyle==='easy'&&v.difficulty==='easy'||
          ui.catalogStyle==='home'&&v.setting==='home'||
          ui.catalogStyle==='machine'&&v.setting==='machine'||
          ui.catalogStyle==='free'&&v.setting==='free');
      })()));
    const adviceContext=catalogAdviceContext();
    const actual=adviceContext.workload||{today:{exercises:0,sets:0},week:{exercises:0,sets:0}};
    const recommendations=CRECO?.ranked?.(shown,adviceContext)||new Map();
    shown.sort((a,b)=>{
      const aa=recommendations.get(a.id),bb=recommendations.get(b.id);
      return (aa?0:1)-(bb?0:1)||((aa?.rank??999)-(bb?.rank??999))||a.name.localeCompare(b.name,'pt-BR');
    });
    const term=ui.catalogSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
    const count=shown.filter(ex=>catalogSearchText(ex).includes(term)).length;
    let shownSoFar=0;
    return `${renderCatalogContext()}${headline('Biblioteca',inSession?'Escolha um exercício.':'Explore os exercícios.',inSession?'Mesma biblioteca, agora com a finalidade de '+(context==='replace'?'substituir':context==='extra'?'acrescentar uma série':'adicionar ao treino')+'.':'Pesquise por movimento ou equipamento, sem iniciar um treino.')}
      <search class="catalog-browser-tools" aria-label="Pesquisar e filtrar exercícios">
        <label for="catalog-search">Buscar exercício ou equipamento</label>
        <input id="catalog-search" type="search" value="${esc(ui.catalogSearch)}" placeholder="Ex.: supino, polia, halter..." autocomplete="off" aria-controls="catalog-browser-results" />
      </search>
      <div class="catalog-group-tabs" role="group" aria-label="Filtrar por bloco ou região muscular">
        ${[['all','Todos'],['S','Ombro e trapézio'],['A','Costas'],['B','Peito'],['C','Quadríceps'],['D','Posteriores']].map(([group,label])=>
          `<button type="button" class="catalog-group-chip ${ui.catalogGroup===group?'selected':''}"
             data-action="catalog-filter" data-group="${group}" aria-pressed="${ui.catalogGroup===group}">${label}</button>`).join('')}
      </div>
      ${ui.catalogGroup==='S'?'<section class="catalog-overview" aria-label="Ombro e trapézio: objetivo e volume registrado">'+
        '<div><strong>Ombro e trapézio</strong><p>Objetivo: '+esc(adviceContext.goalLabel||'Recomposição corporal')+
        ' <button type="button" class="button-inline" data-action="goal-open">Alterar em Ajustes</button></p></div>'+
        '<p>Hoje: <strong>'+actual.today.exercises+' exercícios · '+actual.today.sets+
        ' séries</strong>. Últimos 7 dias: <strong>'+actual.week.exercises+' exercícios · '+actual.week.sets+
        ' séries</strong> efetivas registradas.</p>'+
        '<p class="small muted">Séries de aquecimento e campos não preenchidos não entram no cálculo. Sem registro não significa sem treino.</p></section>'+
        '<div class="catalog-style-tabs" role="group" aria-label="Tipo de exercício">'+
        [['all','Todas'],['easy','Mais simples'],['home','Em casa'],['machine','Máquina e polia'],['free','Pesos livres']].map(([key,label])=>
          '<button type="button" class="catalog-style-chip'+(ui.catalogStyle===key?' selected':'')+
          '" data-action="catalog-style" data-style="'+key+'" aria-pressed="'+(ui.catalogStyle===key)+'">'+label+'</button>').join('')+
        '</div>':''}
      ${adviceContext.ready&&recommendations.size?
        '<p class="small catalog-advice-intro">Recomendado: regiões com pouco trabalho direto registrado em comparação com seu histórico, respeitando o que já foi feito hoje e nos últimos 7 dias. Não significa que deva fazer todos.</p>':
        '<p class="small muted">O selo Recomendado só aparece com histórico suficiente; não são impostas metas de séries.</p>'}
      <div class="catalog-browser-head">
        <h2 class="section-title">Todos os exercícios</h2>
        <output id="catalog-count" aria-live="polite">Exibindo ${Math.min(count,ui.catalogLimit)} de ${count} encontrados</output>
      </div>
      <div class="catalog-browser-results" id="catalog-browser-results">
        ${shown.map(ex=>{
          const existing=known.get(ex.id);
          const status=existing?(existing.active?'Na ficha':'Inativo'):'Disponível';
          const recommended=recommendations.get(ex.id);
          const variant=CRECO?.variant?.(ex);
          const description=[ex.muscle,ex.equipment].filter(Boolean).join(' · ');
          const searchable=catalogSearchText(ex);
          const matches=searchable.includes(term);
          if(matches)shownSoFar++;
          return `<article class="catalog-browser-item" data-catalog-item
                   data-search="${esc(searchable)}" ${matches&&shownSoFar<=ui.catalogLimit?'':'hidden'}>
            <div class="catalog-browser-header">
              <span class="catalog-group-code">BLOCO ${esc(ex.group)}</span>
              <div class="catalog-badges">
                ${recommended?'<span class="catalog-recommended-tag" aria-label="Recomendado para revisar '+esc(recommended.region)+'">Recomendado</span>':''}
                ${variant?.difficulty==='easy'?'<span class="catalog-easy-tag">Mais simples</span>':''}
                <span class="catalog-state ${existing?.active?'is-active':''}">${status}</span>
              </div>
            </div>
            <h3>${esc(ex.name)}</h3>
            <p class="catalog-browser-description">${esc(description)}</p>
            ${variant?'<p class="catalog-variant-tip">'+esc(variant.tip)+'</p>':''}
            ${recommended?'<p class="catalog-reason">'+esc(recommended.region)+' · '+esc(recommended.reason)+'.</p>':''}
            ${ANATOMY?.describe(ex.id)?'<small class="catalog-anatomy-note">Mapa muscular disponível nos detalhes</small>':''}
            <div class="catalog-browser-bottom">
              <span>${recommended?'Sugestão de ajuste nos detalhes':'Referência: '+ex.sets+' séries · '+ex.low+'–'+ex.high+' reps'}</span>
              <button type="button" class="button-inline catalog-view-button" data-action="catalog-view" data-ex="${esc(ex.id)}" aria-label="Ver detalhes de ${esc(ex.name)}">Ver detalhes</button>
            </div>
          </article>`;
        }).join('')}
      </div>
      <button type="button" class="secondary full catalog-more" data-action="catalog-more" ${count>ui.catalogLimit?'':'hidden'}>Ver mais exercícios</button>
      <p class="catalog-empty-state" id="catalog-empty-state" ${count?'hidden':''}>Nenhum exercício encontrado. Experimente outro nome ou grupo.</p>
      <p class="tiny muted catalog-browser-tip">${inSession?'Abrir detalhes não muda a sessão; somente confirmar uma escolha modifica o rascunho.':'Ver detalhes não altera seus registros. Para incluir ou ativar um exercício, confirme na página do movimento.'}</p>`;
  }
  function filterCatalogDOM(){
    const term=ui.catalogSearch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
    let matches=0,visible=0;
    document.querySelectorAll('[data-catalog-item]').forEach(item=>{
      const match=item.dataset.search.includes(term);
      if(match)matches++;
      const show=match&&matches<=ui.catalogLimit;
      item.hidden=!show;
      if(show)visible++;
    });
    const output=document.getElementById('catalog-count');
    if(output)output.textContent='Exibindo '+visible+' de '+matches+' encontrados';
    const more=document.querySelector('[data-action="catalog-more"]');
    if(more)more.hidden=matches<=ui.catalogLimit;
    const empty=document.getElementById('catalog-empty-state');
    if(empty)empty.hidden=matches>0;
  }
  function painOptions(current) {
    return [['','Não informado'],['0','0 · Sem dor'],['1','1 · Mínima'],['2','2 · Leve'],['3','3 · Moderada'],['4','4 · Importante'],['5','5+ · Forte']]
      .map(([v,label])=>`<option value="${v}" ${String(current??'')===v?'selected':''}>${label}</option>`).join('');
  }
  function renderMuay() {
    return '<div class="tabs muay-mode-tabs"><button class="tab-chip" data-action="mode-strength">Musculação</button><button class="tab-chip selected" aria-current="page">Muay Thai</button></div>' +
      M.renderPage(state.muay,today(),recoverySettings())+
      (!state.muay.draft?'<section class="card free-after-muay"><h2 class="section-title">Fez exercícios depois do Muay?</h2>'+
        '<p class="small muted">Registre abdominais ou qualquer exercício avulso em um treino livre, sem completar uma ficha da sua divisão.</p>'+
        '<button type="button" class="secondary full" data-action="free-start" data-origin="muay">+ Registrar treino livre após Muay</button></section>':'');
  }
  function renderPlans() {
    const next=getNext(), p=planFor(ui.plan);
    const all=state.exercises.filter(x=>x.group===ui.plan);
    const activeCount=all.filter(x=>x.active).length;
    const isNext=next.pending[0]===ui.plan;
    return `<div class="tabs muay-mode-tabs"><button class="tab-chip selected" aria-current="page">Musculação</button><button class="tab-chip" data-action="mode-muay">Muay Thai</button></div>
      ${resumeBanner()}
      <section class="card free-entrypoint"><div><strong>Treino livre</strong>
        <p class="small muted">Fez só abdominal, flexão ou alguns exercícios após o Muay? Registre o que realmente executou, sem iniciar A/B/C/D.</p></div>
        <button type="button" class="secondary full" data-action="free-start">+ Registrar treino livre</button></section>
      <section class="workout-plan-top" aria-label="Planejamento da musculação">
        <div class="workout-plan-status"><span>RODADA ${next.completedRounds+1}</span><strong>${next.completed.length}/${DATA.rotation.length} feitos</strong></div>
        <details class="workout-queue-compact"><summary>Ver sequência de treinos <span aria-hidden="true">⌄</span></summary>
          ${renderQueue(next)}</details>
      </section>
      <div class="tabs plan-block-selector" role="group" aria-label="Escolher grupo de treino">
      ${DATA.plans.map(plan => {
        const label=plan.title.split(" ")[0];
        return `<button type="button" class="tab-chip plan-block-choice ${ui.plan===plan.id?'selected':''}" data-action="select-plan" data-plan="${plan.id}" aria-pressed="${ui.plan===plan.id}" aria-label="Bloco ${plan.id}: ${esc(label)}">
          <span class="plan-choice-code">BLOCO ${plan.id}</span><span class="plan-choice-name">${esc(label)}</span></button>`;
      }).join('')}</div>
      <section class="workout-banner workout-banner-compact">
        <div class="workout-main-heading"><div><span class="section-eyebrow">${isNext?'PRÓXIMO TREINO':'TREINO SELECIONADO'} · BLOCO ${p.id}</span><h1>${esc(p.title)}</h1></div>
        <span class="plan-exercises-count">${activeCount} ativos</span></div>
        ${all.some(ex=>ex.active&&ex.complement==='abdomen')?`<p class="small muted">Abdômen: ${all.filter(ex=>ex.active&&ex.complement==='abdomen').map(ex=>esc(ex.name)+' · '+ex.sets+' séries').join('; ')}.</p>`:''}
        <button class="primary full" data-action="start" data-plan="${p.id}">Iniciar treino ${p.id}</button>
      </section>
      <details class="plan-exercises plan-editor-accordion" id="plan-editor">
        <summary><span>Editar ficha</span><small>${activeCount} ativos · ${all.length} exercícios</small></summary>
        <div class="plan-exercises-list">${all.map((ex,i)=>`<article class="plan-exercise-item ${ex.active?'':'is-inactive'}">
          <div class="plan-exercise-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</div>
          <div class="plan-exercise-detail"><h3>${esc(ex.name)}</h3>
            <p class="plan-exercise-meta"><strong>${ex.sets} séries</strong><span aria-hidden="true">·</span>${ex.low}–${ex.high} ${repsLabel(ex)}<span aria-hidden="true"> · </span>${SETS.allowsZero(ex)?'Peso do corpo':'+'+fmt(ex.step)+' '+esc(ex.unit)}${ex.knee?' · Joelho':''}</p>
            <button class="button-inline plan-exercise-edit" data-action="edit-ex" data-ex="${esc(ex.id)}" aria-label="Editar ${esc(ex.name)}">Editar</button></div>
          <div class="plan-exercise-state"><input class="switch" type="checkbox" aria-label="Ativar ${esc(ex.name)}" data-ex-active="${esc(ex.id)}" ${ex.active?'checked':''}/></div>
        </article>`).join('')}</div>
        <div class="plan-editor-actions"><button class="secondary" data-action="add-ex" data-plan="${ui.plan}">+ Adicionar exercício</button></div>
      </details>`;
  }


  function renderFreeOptions(){
    const available=FREE.options(state.exercises,ui.draft,ui.freeSearch,ui.freeAll);
    const typed=ui.freeSearch.trim();
    return available.length?available.map(ex=>{
      const core=ex.complement==='abdomen'||/abdom|core|obl[ií]qu|dead.bug/i.test(
        [ex.name,ex.muscle,...(ex.aliases||[])].join(' '));
      return '<button type="button" class="free-exercise-choice" data-action="free-add" data-ex="'+esc(ex.id)+'">'+
        '<span><strong>'+esc(ex.name)+'</strong><small>'+esc(ex.muscle||ex.group||'Exercício')+
        (SETS.allowsZero(ex)?' · sem carga adicional':' · '+esc(ex.unit||'kg'))+'</small></span>'+
        '<span class="free-exercise-choice-add" aria-hidden="true">+</span></button>';
    }).join(''):'<p class="small muted">'+(typed?'Nenhum exercício encontrado. Experimente outro termo.':
      'Não há mais sugestões de abdômen disponíveis; abra o catálogo completo.')+'</p>';
  }
  function renderFreeWorkout(){
    const d=ui.draft,stats=FREE.count(d);
    const muay=state.muay.sessions.find(s=>s.id===d.afterMuayId&&s.day===d.day);
    const entries=Object.values(d.entries);
    const last=entries.length?entries.at(-1).id:null;
    const setsBody=entries.map((en,i)=>{
      const ex=exerciseFor(en.id);
      if(!ex)return '';
      const completed=SETS.workSets(en).length;
      return '<section class="card free-exercise-card" data-free-exercise="'+esc(ex.id)+'">'+
        '<div class="row-between free-exercise-head"><div><span class="section-eyebrow">EXERCÍCIO '+(i+1)+'</span>'+
        '<h3>'+esc(ex.name)+'</h3><small>'+completed+' série(s) efetiva(s) registrada(s)</small></div>'+
        '<button type="button" class="button-inline" data-action="free-remove" data-ex="'+esc(ex.id)+'" aria-label="Retirar '+esc(ex.name)+'">Retirar</button></div>'+
        '<p class="small muted">'+(SETS.allowsZero(ex)?
          'Peso do corpo: use 0 kg se não adicionou carga.':'Informe a carga utilizada; sem carga e repetições, a série não será considerada executada.')+
          (ex.repPerSide?' Repetições por lado.':'')+'</p>'+
        '<div class="free-set-table" role="group" aria-label="Séries de '+esc(ex.name)+'">'+
        '<div class="free-set-labels"><span>Série</span><span>Carga '+(SETS.allowsZero(ex)?'extra':'')+' ('+esc(ex.unit||'kg')+')</span>'+
        '<span>'+(ex.repPerSide?'Reps/lado':'Reps')+'</span><span>RIR</span></div>'+
        en.sets.map((set,index)=>
          '<div class="free-set-row"><span class="free-set-number">'+(index+1)+'</span>'+
          '<input aria-label="Série '+(index+1)+', carga de '+esc(ex.name)+'" data-ex="'+esc(ex.id)+'" data-index="'+index+
          '" data-field="load" type="number" min="0" max="1500" step="any" inputmode="decimal" placeholder="'+(SETS.allowsZero(ex)?'0':'kg')+
          '" value="'+esc(set.load)+'">'+
          '<input aria-label="Série '+(index+1)+', repetições de '+esc(ex.name)+'" data-ex="'+esc(ex.id)+'" data-index="'+index+
          '" data-field="reps" type="number" min="1" max="100" step="1" inputmode="numeric" placeholder="Reps" value="'+esc(set.reps)+'">'+
          '<input aria-label="Série '+(index+1)+', RIR de '+esc(ex.name)+'" data-ex="'+esc(ex.id)+'" data-index="'+index+
          '" data-field="rir" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="—" value="'+esc(set.rir)+'"></div>').join('')+'</div>'+
        (ex.knee?'<div class="field mt-12"><label for="free-knee-'+esc(ex.id)+'">Dor no joelho durante este exercício (0–5+)</label>'+
          '<select id="free-knee-'+esc(ex.id)+'" data-ex-pain="'+esc(ex.id)+'">'+
          painOptions(en.pain)+'</select></div>':'')+
        '<div class="free-set-actions"><button type="button" class="secondary small-button" data-action="add-set" data-ex="'+esc(ex.id)+'" '+
          (en.sets.length>=12?'disabled':'')+'>+ Série</button>'+
        '<button type="button" class="button-inline" data-action="remove-set" data-ex="'+esc(ex.id)+'" '+
          (en.sets.length<=1?'disabled':'')+'>− Última série</button></div></section>';
    }).join('');
    return '<div class="free-workout" aria-label="Registro de treino livre">'+
      headline('Registro rápido','Treino livre','Inclua somente os exercícios que fez. Nenhum bloco A/B/C/D será concluído.')+
      '<div class="callout workout-status-callout '+(ui.draftSaveOk?'good':'warn')+'"><strong>'+
      (ui.recovered?'Treino livre recuperado.':'Rascunho salvo neste aparelho.')+'</strong>'+
      '<span class="draft-status" id="draft-status" role="status">'+esc(draftStatusText())+'</span></div>'+
      '<section class="card free-workout-meta"><div class="row-between"><div><strong>Registro avulso</strong>'+
      '<p class="small muted">Pode ser depois do Muay ou em outro momento do dia.</p></div>'+
      '<span class="pill green">Só hoje</span></div>'+
      '<div class="field mt-12"><label for="free-day">Data do treino</label>'+
      '<input id="free-day" type="date" data-free-day value="'+esc(d.day)+'" max="'+today()+'"></div>'+
      (muay?'<p class="free-workout-linked">Após Muay Thai em '+dateBR(muay.day)+'. Os treinos ficam separados no histórico.</p>':'')+
      '</section>'+
      '<section class="card free-catalog"><h2 class="section-title">Adicionar exercícios</h2>'+
      '<p class="small muted">Selecione pelo nome. Abdominais aparecem primeiro para facilitar registros curtos.</p>'+
      '<div class="field"><label for="free-search">Buscar no catálogo</label>'+
      '<input id="free-search" data-free-search type="search" autocomplete="off" placeholder="Ex.: abdominal, crunch, prancha" value="'+esc(ui.freeSearch)+'"></div>'+
      '<div id="free-exercise-results" class="free-exercise-results" aria-label="Exercícios disponíveis">'+renderFreeOptions()+'</div>'+
      '<button type="button" class="button-inline free-catalog-expand" data-action="free-expand">'+
      (ui.freeAll?'Ver apenas sugestões rápidas':'Ver catálogo completo')+'</button></section>'+
      '<section aria-label="Exercícios deste treino"><div class="row-between free-exercises-title"><h2 class="section-title">O que você fez</h2>'+
      '<span id="free-count" class="pill">'+stats.performed+' exercícios · '+stats.sets+' séries</span></div>'+
      (entries.length?setsBody:'<div class="card free-empty">Nenhum exercício adicionado. Escolha um abdominal ou pesquise qualquer exercício.</div>')+
      '</section>'+
      '<section class="card free-completion"><h2 class="section-title">Concluir registro</h2>'+
      '<p id="free-completion-status" class="small muted">'+stats.performed+' exercício(s) com séries executadas. '+
      'Séries em branco não serão salvas como realizadas.</p>'+
      '<div class="field mt-12"><label for="free-session-notes">Observações (opcional)</label>'+
      '<textarea id="free-session-notes" maxlength="1000" data-draft-meta="notes" placeholder="Ex.: abdominal depois da aula de Muay">'+esc(d.notes)+'</textarea></div>'+
      '<div class="free-completion-actions"><button type="button" class="primary full" data-action="finish">Salvar treino livre</button>'+
      '<button type="button" class="button-inline" data-action="cancel">Descartar rascunho</button></div></section></div>';
  }

  function seedSets(ex) {
    const h=history(ex.id);
    if(h.length){
      const s=h[0].entry.sets;
      return s.map(item=>({load:item.load,reps:'',rir:'',warmup:!!item.warmup}));
    }
    if(ex.example) return copy(ex.example);
    return Array.from({length:ex.sets},()=>({load:SETS.allowsZero(ex)?0:'',reps:'',rir:'',warmup:false}));
  }
  function startWorkout(id) {
    if (!DATA.rotation.includes(id)) return;
    if (ui.draft && !confirm('Existe um treino em andamento. Descartar esse rascunho e começar outro?')) return;
    if (ui.draft) clearDraft();
    ui.plan=id;
    ui.tab='plans';ui.editor=null;
    ui.focusedExercise=null;ui.focusedMode=false;ui.cardioOpen=false;
    ui.balancePending=null;ui.balanceDismissed=false;
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
    const cardioSummary=CARDIO.summarize(ui.draft.cardio);
    const workToday=CRECO?.workload?.({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      draft:ui.draft,today:today()})||{today:{exercises:0,sets:0},week:{exercises:0,sets:0}};
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
        ${ui.focusedMode ? `<div class="focus-utilities"><button type="button" class="secondary small-button focus-cardio-quick" data-action="focus-cardio" aria-controls="session-cardio-panel">${cardioSummary.totalMinutes?'Ver cardio · '+fmt(cardioSummary.totalMinutes)+' min':'+ Adicionar cardio (opcional)'}</button></div>` : ''}
        ${ui.focusedMode && selected ? `<div class="focus-step"><strong>Exercício ${focusIndex+1} de ${ids.length}</strong>
          <div class="focus-navigation">
            <button type="button" class="secondary small-button" data-action="focus-prev" ${focusIndex===0?'disabled':''}>Anterior</button>
            <button type="button" class="secondary small-button" data-action="focus-next" ${focusIndex===ids.length-1?'disabled':''}>Próximo</button>
          </div></div>
          <div class="focus-exercise-pills" aria-label="Escolher exercício da sessão">
            ${ids.map((id,i)=>`<button type="button" class="focus-exercise-pill ${selected===id?'selected':''}" data-action="focus-select" data-ex="${esc(id)}" aria-pressed="${selected===id}">${i+1}. ${esc(exerciseFor(id)?.name||id)} ${focus.byExercise[id]?.finished?'✓':''}</button>`).join('')}
          </div>` : ''}
      </section>
      ${renderSessionBalance()}
      <section class="session-exercises" aria-labelledby="session-exercises-title">
        <div class="session-exercises-header"><p class="section-eyebrow">REGISTRO DE SÉRIES</p>
          <h2 id="session-exercises-title">Exercícios da sessão</h2>
          <p>${ui.focusedMode?'Visualização de um exercício por vez.':'Cada cartão corresponde a um exercício. Registre as séries antes de avançar.'}</p></div>
        ${ui.focusedMode ? (selected?renderExercise(entries[selected],focusIndex,ids.length):'<p class="empty">Adicione um exercício para começar.</p>') : Object.values(entries).map((en,i)=>renderExercise(en,i,ids.length)).join('')}
      </section>
      ${ui.focusedMode ? renderCardio() : ''}
      <section class="card"><div class="row-between"><h2 class="section-title">Ajustar este treino</h2>${tag('Só hoje','green')}</div>
        <p class="small muted">Hoje: <strong>${workToday.today.exercises} exercícios · ${workToday.today.sets} séries</strong> executadas. Últimos 7 dias: <strong>${workToday.week.exercises} exercícios · ${workToday.week.sets} séries</strong>, sem contar aquecimento. Isso orienta as sugestões do catálogo.</p>
        <p class="small muted">Retirar ou adicionar exercícios aqui não altera sua ficha. Exercícios retirados não contam como realizados.</p>
        ${F.ensureDraft(ui.draft) && ui.draft.skipped.length ? '<div class="flex-skipped"><strong>Retirados nesta sessão</strong>' +
          ui.draft.skipped.map(item=>'<div class="flex-skip-item"><span>' + esc(exerciseFor(item.id)?.name||item.id) + '</span><select aria-label="Motivo de retirar ' + esc(exerciseFor(item.id)?.name||item.id) + '" data-skip-reason="' + esc(item.id) + '">' +
          Object.entries(F.reasons).map(([value,label])=>'<option value="' + esc(value) + '"' + (item.reason===value?' selected':'') + '>' + esc(label) + '</option>').join('') +
          '</select><button class="secondary small-button" data-action="flex-restore" data-ex="' + esc(item.id) + '">Restaurar</button></div>').join('') + '</div>' : ''}
        <div class="session-catalog-actions" role="group" aria-label="Ajustes de exercícios">
          <button type="button" class="secondary" data-action="catalog-session-open" data-mode="replace">Substituir exercício</button>
          <button type="button" class="secondary" data-action="catalog-session-open" data-mode="add">+ Adicionar só hoje</button>
          <button type="button" class="button-inline" data-action="catalog-session-open" data-mode="extra">Tenho energia para mais</button>
        </div>
        <p class="small muted">A biblioteca abre fora do registro das séries. Ao voltar, suas cargas e repetições continuam no rascunho.</p>
      </section>
      ${renderDosePanel(true)}
      ${!ui.focusedMode ? renderCardio() : ''}
      <section class="card session-review"><h2 class="section-title">Conferência antes de salvar</h2>
        <div id="workout-review" aria-live="polite">${renderReviewContent()}</div>
        <p class="tiny muted">As observações não são convertidas em séries reais; os registros incompletos do Muay Thai antigo permanecem intactos.</p>
      </section>
      <section class="card"><h2 class="section-title">Finalizar sessão</h2><div class="field mt-12"><label for="session-energy">Como foi a sessão?</label>
      <select id="session-energy" data-draft-meta="energy"><option value="leve" ${ui.draft.energy==='leve'?'selected':''}>Leve / sobrou energia</option><option value="normal" ${ui.draft.energy==='normal'?'selected':''}>Normal / esforço esperado</option><option value="intenso" ${ui.draft.energy==='intenso'?'selected':''}>Intensa / muita fadiga</option></select></div>
      <div class="field mt-12"><label for="session-notes">Observações (opcional)</label><textarea id="session-notes" data-draft-meta="notes" placeholder="Ex.: sono, dor, execução, Muay Thai no mesmo dia">${esc(ui.draft.notes)}</textarea></div></section>
      <div class="training-controls"><div class="btnrow"><button class="primary" style="flex:2" data-action="finish">Salvar treino</button><button class="ghost" style="flex:1" data-action="cancel">Cancelar</button></div></div>`;
  }
  function balanceReport(draft=ui.draft){
    return BALANCE?.evaluate?.({strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      exercises:state.exercises,draft,settings:state.settings,today:today()})||
      {ready:false,alerts:[],recommendations:[],message:'Recomendações indisponíveis.'};
  }
  function renderBalanceAlert(){
    const report=balanceReport(null);
    if(!report.ready||!report.alerts.length)return '';
    const primary=report.alerts[0],count=report.alerts.length;
    return '<aside class="balance-home-alert" aria-label="Revisão de estímulos musculares">'+
      '<strong>Revisar distribuição dos treinos</strong>'+
      '<p>'+esc(primary.label)+': '+esc(primary.reason)+'. '+
      (count>1?'Outras '+(count-1)+' regiões também merecem revisão.':'')+
      '</p><button type="button" class="button-inline" data-action="balance-review">Ver opções na evolução</button>'+
      '<p class="tiny muted">Baseado apenas nos treinos registrados. Não indica ausência comprovada de atividade nem exige adicionar séries.</p></aside>';
  }
  function renderSessionBalance(){
    const report=balanceReport();
    if(!report.ready||!report.alerts.length)return '';
    const candidate=report.recommendations[0];
    const chosen=ui.balancePending&&report.recommendations.find(x=>x.id===ui.balancePending.id);
    return '<aside class="balance-session" aria-label="Equilibrar estímulos do treino">'+
      '<div class="row-between"><div><strong>Equilibrar este treino</strong><p class="small muted">Trocas opcionais, somente nesta sessão.</p></div>'+
      '<span class="balance-tag">'+(report.alerts.length)+' regiões</span></div>'+
      '<p class="small"><strong>'+esc(report.alerts[0].label)+':</strong> '+esc(report.alerts[0].reason)+'.</p>'+
      (report.caution?'<p class="small balance-caution">'+esc(report.caution)+'</p>':'')+
      (!candidate||ui.balanceDismissed?
        '<details class="balance-alternatives"><summary>'+ (ui.balanceDismissed?'Ver recomendações novamente':'Ver regiões e alternativas')+'</summary>'+
        report.alerts.slice(0,4).map(item=>'<p class="small"><strong>'+esc(item.label)+':</strong> '+esc(item.reason)+'. '+
          (item.options.length?'Exemplos: '+item.options.slice(0,2).map(x=>esc(x.name)).join('; ')+'.':'Sem opção mapeada.')+'</p>').join('')+
        (ui.balanceDismissed?'<button type="button" class="button-inline" data-action="balance-show">Reexibir sugestões</button>':
          '<button type="button" class="button-inline" data-action="catalog-session-open" data-mode="add">Explorar catálogo e adicionar só hoje</button>')+
        '</details>':
        '<div class="balance-candidate"><span>OPÇÃO PARA ESTE TREINO</span>'+
        '<strong>'+esc(candidate.sourceName)+' → '+esc(candidate.targetName)+'</strong>'+
        '<p class="small">'+esc(candidate.region)+': '+esc(candidate.reason)+'.</p>'+
        '<details><summary>Por que sugerimos?</summary><p class="small">'+esc(candidate.explanation)+
          ' O músculo de origem recebe estímulo de outros exercícios na sessão, mas isso não demonstra recuperação completa.</p></details>'+
        (chosen?'<div class="balance-confirm"><p class="small"><strong>Confirmar substituição só hoje?</strong> '+
          'Nenhuma série registrada será apagada. Sua ficha continuará igual para os próximos treinos.</p>'+
          '<div class="balance-actions"><button type="button" class="primary" data-action="balance-apply" data-id="'+esc(chosen.id)+'">Confirmar troca</button>'+
          '<button type="button" class="secondary" data-action="balance-cancel">Cancelar</button></div></div>':
        '<div class="balance-actions"><button type="button" class="secondary" data-action="balance-select" data-id="'+esc(candidate.id)+'">Trocar só hoje</button>'+
          '<button type="button" class="button-inline" data-action="balance-dismiss">Ignorar hoje</button></div>')+
        '</div>')+
      '<p class="tiny muted">'+esc(report.message)+'</p></aside>';
  }
  function applyBalanceSwap(id){
    if(!ui.draft||!id)return;
    const report=balanceReport(),suggestion=report.recommendations.find(x=>x.id===id);
    if(!suggestion||!ui.balancePending||ui.balancePending.id!==id)
      return notify('A sugestão mudou. Revise a sessão antes de confirmar.');
    const target=F.prepareCatalog(suggestion.targetId,state.exercises);
    if(!target)return notify('Exercício não encontrado no catálogo.');
    const dayGuide=CRECO?.prescription?.({exercise:target.exercise,context:catalogAdviceContext(),
      draft:ui.draft,strengthSessions:state.sessions,muaySessions:state.muay.sessions,
      settings:state.settings,today:today()});
    const result=CSESSION.prepare({draft:ui.draft,mode:'replace',sourceId:suggestion.sourceId,
      targetId:suggestion.targetId,exercise:target.exercise,dayPrescription:dayGuide});
    if(!result.ok)return notify(result.error);
    const previous=ui.draft;
    let added=false;
    if(target.isNew){
      if(state.exercises.length>=200)return notify('O catálogo pessoal atingiu seu limite de exercícios.');
      state.exercises.push({...target.exercise,active:false});added=true;
      if(!save()){
        state.exercises.pop();
        return notify('Não foi possível salvar o novo exercício sem alterar a ficha.');
      }
    }
    ui.draft=result.draft;
    if(!persistDraft()){
      ui.draft=previous;
      if(added){state.exercises.pop();save();}
      return notify('A troca não foi salva. Sua sessão permanece como estava.');
    }
    ui.balancePending=null;
    ui.balanceDismissed=true;
    ui.focusedExercise=suggestion.targetId;
    render();notify('Troca registrada somente nesta sessão. A ficha não foi alterada.');
  }
  function renderCardio() {
    const rows=Array.isArray(ui.draft?.cardio)?ui.draft.cardio:[];
    const parsed=CARDIO.parse(rows);
    return `<details id="session-cardio-panel" class="card session-cardio" ${ui.cardioOpen?'open':''}>
      <summary><span>Cardio <small>(opcional)</small></span><span class="cardio-total">${parsed.ok&&parsed.totalMinutes?fmt(parsed.totalMinutes)+' min':''}</span></summary>
      <p class="small muted">Registre o tempo de esteira, escada ou outro cardio feito nesta sessão.</p>
      <div class="cardio-rows">${rows.slice(0,5).map((row,i)=>`<div class="cardio-row">
        <div class="field"><label for="cardio-type-${i}">Modalidade</label><select id="cardio-type-${i}" aria-label="Modalidade do cardio ${i+1}" data-cardio-field="type" data-cardio-index="${i}">
          ${CARDIO.TYPES.map(type=>`<option value="${type.id}" ${row?.type===type.id?'selected':''} ${rows.some((other,n)=>n!==i&&other?.type===type.id)?'disabled':''}>${esc(type.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="cardio-minutes-${i}">Tempo (min)</label><input id="cardio-minutes-${i}" aria-label="Minutos de cardio ${i+1}" type="number" min="0" max="300" step="0.5" inputmode="decimal" placeholder="Ex.: 10" value="${esc(row?.minutes??'')}" data-cardio-field="minutes" data-cardio-index="${i}" /></div>
        <div class="cardio-stair-pace" data-cardio-pace-index="${i}" ${row?.type==='escada'?'':'hidden'}>
          <div class="field"><label for="cardio-speed-${i}">Ritmo médio (opcional)</label>
            <input id="cardio-speed-${i}" aria-label="Ritmo médio da escada ${i+1}" type="number" min="1" max="240" step="any" inputmode="decimal"
              placeholder="Ex.: 55" value="${esc(row?.avgSpeed??'')}" data-cardio-field="avgSpeed" data-cardio-index="${i}" /></div>
          <div class="field"><label for="cardio-speed-unit-${i}">Unidade exibida</label><select id="cardio-speed-unit-${i}" data-cardio-field="speedUnit" data-cardio-index="${i}">
            ${CARDIO.STAIR_SPEED_UNITS.map(option=>`<option value="${option.id}" ${(row?.speedUnit||'steps_min')===option.id?'selected':''}>${esc(option.label)}</option>`).join('')}
          </select></div>
          <p class="tiny muted">Degraus/min é cadência. Se o painel só mostrar nível, registre o nível da máquina; ele não equivale a velocidade.</p>
        </div>
        <button type="button" class="button-inline cardio-remove" data-action="cardio-remove" data-index="${i}" aria-label="Retirar ${esc(CARDIO.label(row?.type))} deste treino">Retirar</button>
      </div>`).join('')}</div>
      <button type="button" class="secondary full" data-action="cardio-add" ${rows.length>=5?'disabled':''}>Adicionar cardio</button>
      <p class="tiny muted">Deixe em branco quando não fizer. O tempo fica no histórico deste treino.</p>
    </details>`;
  }
  function updateCardioSummary() {
    const total=document.querySelector('.session-cardio .cardio-total');
    const parsed=CARDIO.parse(ui.draft?.cardio);
    if(total)total.textContent=parsed.ok&&parsed.totalMinutes?fmt(parsed.totalMinutes)+' min':'';
    const shortcut=document.querySelector('[data-action="focus-cardio"]');
    if(shortcut)shortcut.textContent=parsed.ok&&parsed.totalMinutes?
      'Ver cardio · '+fmt(parsed.totalMinutes)+' min':'+ Adicionar cardio (opcional)';
  }
  function updateCardioChoices() {
    const rows=Array.isArray(ui.draft?.cardio)?ui.draft.cardio:[];
    document.querySelectorAll('[data-cardio-field="type"]').forEach(select=>{
      const index=Number(select.dataset.cardioIndex);
      [...select.options].forEach(option=>{
        option.disabled=rows.some((row,i)=>i!==index&&row?.type===option.value);
      });
      const pace=document.querySelector('[data-cardio-pace-index="'+index+'"]');
      if(pace) {
        pace.hidden=rows[index]?.type!=='escada';
        const speed=pace.querySelector('[data-cardio-field="avgSpeed"]');
        if(speed) {
          const byLevel=rows[index]?.speedUnit==='machine_level';
          speed.max=byLevel?'99':'240';
          speed.placeholder=byLevel?'Ex.: 7':'Ex.: 55';
        }
      }
    });
  }
  function renderReviewContent(){
    const {review,issues}=reviewWarning(ui.draft);
    const cardio=CARDIO.parse(ui.draft?.cardio);
    if(!cardio.ok)issues.push(cardio.error);
    return `<p class="small muted">${review.exercisesLogged} exercício(s) com séries · ${review.effectiveSets} série(s) efetiva(s)</p>
    ${cardio.ok&&cardio.totalMinutes?`<p class="small">Cardio: ${cardio.entries.map(item=>esc(CARDIO.label(item.type))+' · '+fmt(item.minutes)+' min'+(CARDIO.paceLabel(item)?' · '+esc(CARDIO.paceLabel(item)):'')).join(' + ')}.</p>`:''}
    ${issues.length?`<ul class="review-issues">${issues.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`:
    '<p class="small">Sem pendências de preenchimento identificadas.</p>'}`;
  }
  function refreshReview() {
    const node=document.querySelector('#workout-review');
    if(node)node.innerHTML=renderReviewContent();
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
    const hasCurrent=SETS.performed(current,ex);
    const delta=hasCurrent ? E.compareSet(previous,current) : null;
    const rir=previous.rir === '' || previous.rir == null ? '—' : String(previous.rir);
    return `<div class="previous-workout-reference">
      <div class="reference-heading"><span>REFERÊNCIA ANTERIOR</span>
        <span>${previousDate?dateBR(previousDate):'Última sessão'} · ${previous.warmup?'Aquecimento':'Efetiva'}</span></div>
      <dl class="previous-workout-metrics">
        <div class="history-metric"><dt>${SETS.allowsZero(ex)?'Carga extra':'Carga'}</dt><dd>${esc(fmt(previous.load))}<small>${esc(ex.unit)}</small></dd></div>
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
    const elastic=ex.id.endsWith('-elastico');
    return `<section class="exercise-card workout-exercise-card" data-exercise="${esc(ex.id)}" aria-label="Exercício ${index+1} de ${total}: ${esc(ex.name)}">
      <div class="workout-exercise-heading"><span class="workout-exercise-number">${String(index+1).padStart(2,'0')} <small>/ ${String(total).padStart(2,'0')}</small></span>
        <div class="workout-exercise-title"><p class="section-eyebrow">EXERCÍCIO ${index+1} · ${completedSets} ${completedSets===1?'série registrada':'séries registradas'}</p><h3>${esc(ex.name)}</h3>
        <p class="workout-exercise-target">${en.sets.length} séries nesta sessão · ${en.dayPrescription?.low||ex.low}–${en.dayPrescription?.high||ex.high} ${repsLabel(ex)}</p>
        ${en.dayPrescription?'<p class="small workout-day-guidance"><strong>Ajuste para hoje:</strong> '+esc(en.dayPrescription.reason)+
          ' Faixa '+en.dayPrescription.low+'–'+en.dayPrescription.high+' repetições, RIR '+esc(en.dayPrescription.rirTarget)+
          '. A ficha original não mudou.</p>':''}</div>
        <span class="workout-exercise-kind">${elastic?'Elástico':SETS.allowsZero(ex)?'Peso do corpo':ex.mode==='pyramid'?'Pirâmide':'Séries'}</span></div>
      ${ANATOMY?.panel(ex.id,Boolean(ui.anatomyOpen[ex.id]),ui.anatomyViews[ex.id])||''}
      <p class="workout-exercise-step">${elastic?'Elástico: registre 0 kg quando a tensão não for mensurada; informe repetições executadas e RIR.':SETS.allowsZero(ex)?'Carga extra: 0 kg = peso do corpo. Registre apenas o peso adicionado.':'Ajuste de carga: +'+fmt(ex.step)+' '+esc(ex.unit)}</p>
      ${ex.repPerSide?'<p class="small muted">Faça os dois lados. Registre as repetições por lado; a dupla conta como uma série.</p>':''}
      <p class="small muted">Toque no RIR para registrar o esforço. As repetições só contam quando você informar o que realmente fez.</p>
      ${hasData?`<div class="exercise-last-session"><span>ÚLTIMA SESSÃO · ${dateBR(reco.lastDate)}</span><strong>${esc(reco.last)}</strong></div>`:''}
      <div class="recommend ${cls}"><strong>${esc(reco.title)}</strong><p>${esc(reco.explanation)}</p>
      ${reco.level==='increase'?`<button class="button-inline mt-8" data-action="apply-reco" data-ex="${esc(ex.id)}">Usar ${fmt(reco.next)} ${esc(ex.unit)} na série mais pesada</button>`:''}</div>
      ${!hasData&&ex.example?'<p class="small muted">Modelo do seu supino: 20 → 22,5 → 25 → 25 kg por halter. Não é histórico registrado.</p>':''}
      <div class="set-grid"><div class="caption">Nº</div><div class="caption">Tipo</div><div class="caption">${SETS.allowsZero(ex)?'Extra':'Carga'}<br>(${esc(ex.unit)})</div><div class="caption">${ex.repPerSide?'Reps/lado':'Reps'}</div><div class="caption">RIR</div>
      ${en.sets.map((set,i)=>`<div class="cell-label">${i+1}</div><button class="button-inline set-type ${set.warmup?'warmup':'work'}" data-action="toggle-warmup" data-ex="${esc(ex.id)}" data-index="${i}" title="Alternar entre aquecimento e série efetiva">${set.warmup?'Aquec.':'Efetiva'}</button>
      <input aria-label="Série ${i+1}, carga ${SETS.allowsZero(ex)?'adicional ':''}${esc(ex.unit)} em ${esc(ex.name)}" type="number" min="0" max="1500" step="any" inputmode="decimal" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="load" value="${esc(set.load)}" />
      <input aria-label="Série ${i+1}, ${repsLabel(ex)} em ${esc(ex.name)}" type="number" min="0" max="100" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="reps" value="${esc(set.reps)}" />
      <input aria-label="Série ${i+1}, repetições em reserva em ${esc(ex.name)}" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="rir" value="${esc(set.rir)}" />
      <div class="set-history" data-ex="${esc(ex.id)}" data-index="${i}">${setComparisonText(previousEntry?.sets[i],set,ex,previousSession?.session.day)}</div>
      <div class="quick-set-row">
        <div class="quick-rir" role="group" aria-label="RIR rápido da série ${i+1} de ${esc(ex.name)}">
          ${[0,1,2,3].map(n=>`<button type="button" class="secondary ${String(set.rir)===String(n)?'selected':''}" data-action="quick-rir" data-ex="${esc(ex.id)}" data-index="${i}" data-rir="${n}" aria-pressed="${String(set.rir)===String(n)}">RIR ${n}</button>`).join('')}
        </div>
        <button type="button" class="secondary quick-set-confirm ${FOCUS.performed(set,ex.id)?'is-done':''}" data-action="quick-set-confirm" data-ex="${esc(ex.id)}" data-index="${i}">${FOCUS.performed(set,ex.id)?'Série registrada ✓':'Conferir série'}</button>
      </div>`).join('')}</div>
      <div class="quick-log-tools"><span class="small muted">Preparo rápido · confirme as repetições depois de executar</span>
      <div class="quick-log-buttons"><button type="button" class="secondary small-button" data-action="quick-previous" data-ex="${esc(ex.id)}">Repetir cargas da última sessão</button>
      <button type="button" class="secondary small-button" data-action="quick-current" data-ex="${esc(ex.id)}">Repetir carga da série anterior</button></div></div>
      <div class="card-footer"><button class="button-inline" data-action="add-set" data-ex="${esc(ex.id)}">+ Série</button><button class="button-inline" data-action="remove-set" data-ex="${esc(ex.id)}" ${en.sets.length<=1?'disabled':''}>− Última série</button><button class="button-inline" data-action="catalog-session-open" data-mode="replace" data-source="${esc(ex.id)}" ${F.hasRecordedReps(en)?'disabled title="Este exercício já tem repetições registradas"':''}>Substituir</button><button class="button-inline" data-action="flex-withdraw" data-ex="${esc(ex.id)}">Retirar só hoje</button></div>
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
  function dayAtOffset(offset){
    const d=new Date(today()+'T12:00:00');d.setDate(d.getDate()+offset);
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  }
  function progressStepsPanel(){
    const days=ui.progressStepDays;
    const map=new Map((state.activitySteps||[]).map(row=>[row.date,row.steps]));
    const points=Array.from({length:days},(_,i)=>{const date=dayAtOffset(i+1-days);return {date,steps:map.get(date)};});
    const known=points.filter(row=>row.steps!==undefined),maximum=Math.max(1,...known.map(row=>row.steps));
    const average=known.length?Math.round(known.reduce((sum,row)=>sum+row.steps,0)/known.length):null;
    return '<section class="card progress-steps-card" aria-labelledby="progress-steps-title">'+
      '<div class="row-between"><h2 class="section-title" id="progress-steps-title">Movimento diário</h2><span class="pill">'+known.length+'/'+days+' dias</span></div>'+
      '<p class="small muted">Média dos dias informados: <strong>'+(average==null?'—':fmt(average)+' passos')+'</strong>. O gráfico não preenche dias ausentes com zero.</p>'+
      '<div class="progress-period-picker" role="group" aria-label="Período dos passos">'+[7,14,28].map(n=>'<button type="button" class="tab-chip'+(days===n?' selected':'')+'" data-action="progress-steps-days" data-days="'+n+'" aria-pressed="'+(days===n)+'">'+n+' dias</button>').join('')+'</div>'+
      '<div class="progress-steps-scroll"><div class="progress-steps-bars" style="--steps-count:'+days+'" role="group" aria-label="Passos registrados por dia">'+points.map((row,i)=>{
        const logged=row.steps!==undefined,ratio=logged?Math.max(2,Math.round(row.steps/maximum*100)):0;
        const speech=dateBR(row.date)+(logged?' · '+fmt(row.steps)+' passos':' · sem registro');
        return '<div class="progress-steps-day'+(logged?' known':' missing')+'" role="img" aria-label="'+speech+'" title="'+speech+'">'+
          (logged?'<span class="progress-steps-bar" style="height:'+ratio+'%"></span>':'<span class="progress-steps-unknown" aria-hidden="true">–</span>')+
          '<small>'+(days===28?(i%4===0?row.date.slice(8):''):row.date.slice(8))+'</small></div>';
      }).join('')+'</div></div>'+
      '<p class="tiny muted">As barras mostram passos, não calorias gastas. O Samsung Health continua com lançamento manual.</p></section>';
  }
  function progressMeasuresPanel(){
    const rows=BODY.recent(state.bodyMeasurements||[]).filter(row=>Number.isFinite(row.values?.abdomen)).reverse();
    const latest=rows.at(-1),previous=rows.length>=2?rows[0]:null;
    if(!latest)return '<section class="card progress-measures-card"><h2 class="section-title">Circunferência abdominal</h2><p class="small muted">Sem aferição comparável. Registre o abdômen na altura do umbigo em Medidas corporais, no atalho acima, para ver tendências.</p></section>';
    const delta=previous?Math.round((latest.values.abdomen-previous.values.abdomen)*10)/10:null;
    const series=rows.slice(-10),vals=series.map(r=>r.values.abdomen),lo=Math.min(...vals)-2,hi=Math.max(...vals)+2;
    const sx=i=>series.length===1?160:22+i*276/(series.length-1),sy=v=>97-(v-lo)/Math.max(1,hi-lo)*78;
    const coords=series.map((r,i)=>sx(i).toFixed(1)+','+sy(r.values.abdomen).toFixed(1)).join(' ');
    return '<section class="card progress-measures-card" aria-labelledby="progress-measures-title">'+
      '<div class="row-between"><h2 id="progress-measures-title" class="section-title">Abdômen (umbigo)</h2><strong>'+fmt(latest.values.abdomen)+' cm</strong></div>'+
      '<p class="small muted">Aferido em '+dateBR(latest.date)+(delta==null?' · só uma aferição':'; variação desde '+dateBR(previous.date)+': '+(delta>0?'+':'')+fmt(delta)+' cm')+'.</p>'+
      (series.length>1?'<div class="chart-wrap"><svg viewBox="0 0 320 122" role="img" aria-label="Evolução de '+series.length+' medidas de abdômen; última '+fmt(latest.values.abdomen)+' centímetros">'+
        '<line x1="18" y1="100" x2="302" y2="100" stroke="#526477" />'+
        '<polyline fill="none" stroke="#80beff" stroke-width="3" stroke-linejoin="round" points="'+coords+'"/>'+
        series.map((r,i)=>'<circle cx="'+sx(i).toFixed(1)+'" cy="'+sy(r.values.abdomen).toFixed(1)+'" r="3.5" fill="#c5f56b"/>').join('')+
        '</svg></div>':'')+
      '<p class="small muted">Use Medidas corporais, no atalho acima, para editar aferições.</p>'+
      '<p class="tiny muted">Medidas diferentes ou feitas em condições distintas não devem ser interpretadas como perda de gordura comprovada.</p></section>';
  }
  function progressStrengthSummary(){
    const leaders=strengthOverview(90).leaders.slice(0,3);
    return '<section class="card progress-strength-card" aria-labelledby="progress-strength-title">'+
      '<h2 class="section-title" id="progress-strength-title">Força por exercício</h2>'+
      (leaders.length?'<p class="small muted">Comparação dentro de cada exercício registrado nos últimos 90 dias.</p><ul class="mini-list">'+
        leaders.map(item=>'<li><span><strong>'+esc(item.name)+'</strong><small class="progress-strength-period">'+dateBR(item.firstDate)+' → '+dateBR(item.lastDate)+'</small></span><strong>'+((item.percent||0)>=0?'+':'')+fmt(item.percent)+'%</strong></li>').join('')+'</ul>':
        '<p class="small muted">São necessárias ao menos duas sessões comparáveis do mesmo exercício para mostrar uma tendência.</p>')+
      '<p class="tiny muted">Carga, repetições, equipamento e esforço importam. Aumento de força não equivale diretamente a ganho de músculo.</p></section>';
  }
  function renderProgressLegacy() {
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
      ${progressMeasuresPanel()}
      ${progressStepsPanel()}
      ${progressStrengthSummary()}
      <details class="progress-advanced-radar mt-12" ${ui.progressRadarOpen?'open':''}><summary>Comparativo muscular avançado · radar</summary>${strengthSection(90)}</details>
      ${renderGoalPlannerSummary(goalPlan)}
      ${renderDosePanel()}
      ${weightForm()}
      <div class="section-row"><h2 class="section-title">Pesagens salvas</h2></div><div class="card"><ul class="mini-list">${all.slice().reverse().slice(0,15).map(it=>`<li><span>${dateBR(it.date)}${it.initial?' · referência inicial':''}</span><strong>${fmt(it.weight)} kg</strong></li>`).join('')}</ul></div>`;
  }
  function renderPerformanceTrends(){
    if(!PERF)return '';
    const r=PERF.assess(state,today()),w=r.weight,t=r.training,v=r.recovery;
    const fmtDelta=n=>n==null?'—':(n>0?'+':'')+fmt(n)+'%';
    const status=r.interpretation==='review'?'Vale conferir tendências':'Acompanhamento longitudinal';
    return '<details class="evo-performance card" id="evo-performance">'+
      '<summary><strong>Peso, desempenho e recuperação</strong><span>'+status+'</span></summary>'+
      '<div class="evo-performance-grid">'+
      '<div><small>Peso · últimas 4 semanas</small><strong>'+(w.ready?fmtDelta(w.pctPerWeek)+'/sem.':'Dados insuficientes')+'</strong><span>'+w.previousCount+' + '+w.recentCount+' pesagens em quinzenas</span></div>'+
      '<div><small>Força · exercícios comparáveis</small><strong>'+t.comparisons.length+' exercícios</strong><span>'+t.decliningExercises+' com queda de 5% ou mais (regra experimental)</span></div>'+
      '<div><small>Energia e fadiga</small><strong>'+v.recordedDays+' check-ins</strong><span>'+v.lowEnergyDays+' baixa energia · '+v.highFatigueDays+' fadiga alta</span></div></div>'+
      (r.interpretation==='review'?'<p class="evo-performance-note">Há mudanças simultâneas de força e recuperação. Confira sono, rotina, técnicas, descanso planejado e alimentação; se persistirem, converse com os profissionais que o acompanham. Nenhuma meta foi alterada.</p>':r.interpretation==='insufficient'?'<p class="evo-performance-note">Registre pesagens ao longo das semanas e check-ins do treino para uma comparação significativa. Ausência de informação não significa piora.</p>':'<p class="evo-performance-note">Tendências para revisão, não diagnóstico. Compare o mesmo exercício e considere semanas de recuperação.</p>')+
      (t.comparisons.length?'<details class="evo-performance-detail"><summary>Exercícios analisados</summary>'+t.comparisons.slice(0,8).map(c=>'<p>'+esc(state.exercises.find(e=>e.id===c.exerciseId)?.name||c.exerciseId)+': '+fmtDelta(c.changePct)+' · '+c.samplesBefore+' + '+c.samplesNow+' sessões</p>').join('')+'</details>':'')+
      '<p class="small muted">Janelas de 14 dias; 5% e cobertura mínima são heurísticas do FORJA, não limites clínicos. Não estimamos calorias gastas pela carga do treino nem diagnosticamos excesso de treinamento.</p></details>';
  }
  function renderBalanceProgress(){
    const report=balanceReport(null);
    if(!report.ready)return '<section class="card balance-progress"><h2>Equilíbrio muscular</h2><p class="small muted">'+esc(report.message)+'</p></section>';
    return '<section class="card balance-progress" aria-label="Regiões com menos séries diretas">'+
      '<h2 class="section-title">Regiões para acompanhar</h2>'+
      '<p class="small muted">Séries diretas nos últimos 30 dias. Participações auxiliares também aparecem no mapa acima.</p>'+
      (report.alerts.length?'<div class="balance-region-list">'+report.alerts.map(a=>
        '<div class="balance-region"><strong>'+esc(a.label)+'</strong><span>'+esc(a.reason)+'</span>'+
        '<small>'+fmt(a.direct30)+' séries diretas · '+fmt(a.indirect30)+' auxiliares</small>'+
        (a.options.length?'<p class="tiny muted">Alternativas: '+a.options.slice(0,2).map(x=>esc(x.name)).join(' · ')+'</p>':'')+
        '</div>').join('')+'</div>':'<p class="small">Não há regiões com lacuna de séries diretas nos registros recentes.</p>')+
      '<p class="tiny muted">'+esc(report.message)+'</p></section>';
  }
  function renderProgress(){
    const day=today();
    let content;
    if(ui.evolutionView==='nutrition'){
      content=EVO.renderNutrition(state.nutrition,day,ui.evolutionPeriods);
    }else if(ui.evolutionView==='training'){
      content='<section id="evo-panel-training" class="evo-pane" role="tabpanel" aria-labelledby="evo-tab-training">'+
        renderMuscleMap()+renderBalanceProgress()+progressStrengthSummary()+progressStepsPanel()+
        renderPerformanceTrends()+
        '<details class="evo-training-tools" '+(ui.evolutionTrainingOpen?'open':'')+'>'+
        '<summary>Constância e volume <span aria-hidden="true">⌄</span></summary>'+
        '<div class="evo-more-content">'+renderAdherencePanel()+renderDosePanel()+'</div></details></section>';
    }else{
      const bodyToolsHTML='<details class="evo-more-tools" '+(ui.evolutionExtrasOpen?'open':'')+'>'+
        '<summary>Objetivo e planejamento <span aria-hidden="true">⌄</span></summary>'+
        '<div class="evo-more-content">'+renderGoalPlannerSummary(PLANNER.plan(state,day))+'</div></details>'+
        '<details id="evo-weight-editor" class="evo-editor-fold"><summary>Registrar ou corrigir pesagem</summary>'+weightForm()+'</details>';
      content=EVO.renderWeight(state,day,ui.evolutionWeightLimit,{
        chartMode:ui.evolutionChartMode,measureKey:ui.evolutionMeasureKey,bodyToolsHTML,
      });
    }
    return '<div class="evo-shell">'+
      EVO.renderHeader(state,day,ui.evolutionView)+
      '<div class="evo-main">'+content+'</div></div>';
  }
  function muscleMapOptions(){
    return {days:ui.evolutionVolumeDays,view:ui.evolutionMuscleView,selected:ui.evolutionMuscleSelected,
      listOpen:ui.evolutionMuscleListOpen,methodOpen:ui.evolutionMuscleMethodOpen};
  }
  function renderMuscleMap(){
    // Preserve a readable overview if a new presentation asset is unavailable.
    return MUSCLE_MAP&&MUSCLE_BODY?MUSCLE_MAP.render(state,today(),muscleMapOptions()):
      EVO.renderGroupVolume(state,today(),ui.evolutionVolumeDays);
  }
  function refreshMuscleMap(focusSource=null){
    const card=document.querySelector('.muscle-map-card'),content=card?.querySelector('.muscle-map-content');
    if(!MUSCLE_MAP||!content)return;
    const focused=focusSource||document.activeElement;
    const restoreSelect=focused?.id==='muscle-map-select';
    const restoreMuscle=focused?.dataset?.action==='muscle-region'?focused.dataset.muscle:null;
    const restoreFigure=Boolean(restoreMuscle&&focused.closest('svg'));
    const restoreRow=Boolean(restoreMuscle&&focused.classList.contains('muscle-map-row'));
    const scroll=window.scrollY;
    // Native details.toggle is queued: read the actual open state before a
    // synchronous selection rebuild, so the replacement focus target is visible.
    ui.evolutionMuscleListOpen=Boolean(content.querySelector('.muscle-map-breakdown')?.open);
    ui.evolutionMuscleMethodOpen=Boolean(content.querySelector('.muscle-map-method')?.open);
    card.dataset.muscleDays=String(ui.evolutionVolumeDays);
    card.dataset.muscleView=ui.evolutionMuscleView;
    card.querySelectorAll('[data-action="evo-volume-days"]').forEach(control=>{
      const selected=Number(control.dataset.days)===ui.evolutionVolumeDays;
      control.setAttribute('aria-pressed',String(selected));control.classList.toggle('is-selected',selected);
    });
    card.querySelectorAll('[data-action="muscle-map-view"]').forEach(control=>{
      control.setAttribute('aria-pressed',String(control.dataset.view===ui.evolutionMuscleView));
    });
    // Controls stay mounted; only this read-only visualization changes.
    content.innerHTML=MUSCLE_MAP.content(state,today(),muscleMapOptions());
    if(restoreSelect)content.querySelector('#muscle-map-select')?.focus({preventScroll:true});
    else if(restoreMuscle){
      const choices=[...content.querySelectorAll('[data-action="muscle-region"]')];
      const target=choices.find(el=>el.dataset.muscle===restoreMuscle&&Boolean(el.closest('svg'))===restoreFigure&&
        el.classList.contains('muscle-map-row')===restoreRow);
      (target||content.querySelector('#muscle-map-select'))?.focus({preventScroll:true});
    }
    window.scrollTo(0,scroll);
  }
  function selectMuscleRegion(id,source=null,{reveal=false}={}){
    if(!MUSCLE_MAP||!MUSCLE_BODY)return;
    const regions=MUSCLE_MAP.model(state,today(),ui.evolutionVolumeDays).byId;
    const row=Object.hasOwn(regions,id)?regions[id]:null;
    if(id&&!row)return;
    ui.evolutionMuscleSelected=id||null;
    if(row&&!MUSCLE_BODY.visibleIds(ui.evolutionMuscleView).includes(id))
      ui.evolutionMuscleView=row.views.includes('front')?'front':'back';
    refreshMuscleMap(source);
    // On a narrow screen the shared detail panel sits below the body. A touch
    // selection should reveal that result, while keyboard exploration keeps
    // its position and focus on the selected muscle.
    if(row&&reveal&&window.matchMedia('(max-width: 699px)').matches){
      const detail=document.getElementById('muscle-map-detail');
      const reading=detail?.closest('.muscle-map-reading');
      const box=detail?.getBoundingClientRect();
      const nav=document.getElementById('nav')?.getBoundingClientRect();
      const bottom=nav&&nav.top>0?Math.min(window.innerHeight,nav.top):window.innerHeight;
      if(box&&reading&&(box.top<0||box.bottom>bottom))reading.scrollIntoView({
        block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
      });
    }
  }
  function openProgress(view='weight',options={}){
    if(!['weight','training','nutrition'].includes(view))return;
    ui.tab='progress';ui.editor=null;ui.bodyOpen=false;ui.evolutionView=view;
    render();
    if(options.weightEditor){
      const editor=document.getElementById('evo-weight-editor');
      if(editor)editor.open=true;
      editor?.scrollIntoView({block:'start'});
      document.getElementById('new-weight')?.focus({preventScroll:true});
    }else if(options.section){
      const target=document.getElementById(options.section);
      if(target){target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}
    }else if(options.focusTab){
      document.getElementById('evo-tab-'+view)?.focus({preventScroll:true});
    }else window.scrollTo(0,0);
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


  // Share is a read-only view of one already saved strength session.
  function shareModel(){
    return ui.share && SHARE?.build(state,ui.share.sessionId);
  }
  function openShare(id) {
    if(!STICKER || !SHARE) return notify('A geração de figurinhas não está disponível nesta versão.');
    const model=SHARE.build(state,id);
    if(!model)return notify('Não foi possível localizar a sessão salva.');
    const mode=model.largest?'load':model.cardioTop?'cardio':model.weekDays>0?'week':'done';
    ui.share={sessionId:id,...STICKER.options({view:model.preferredView,highlightMode:mode})};
    ui.shareBlob=null;ui.tab='share';render();window.scrollTo(0,0);
  }
  function renderShare() {
    const m=shareModel();
    if(!m)return '<section class="card"><h1>Conquista indisponível</h1><button type="button" class="secondary" data-action="share-back">Voltar ao Histórico</button></section>';
    const s=ui.share;
    const styleNames=[['conquest','Conquista'],['muscles','Músculos'],['highlight','Destaque']];
    const choices=styleNames.map(([id,label])=>'<button type="button" class="share-style-btn '+(s.style===id?'selected':'')+
      '" data-action="share-style" data-value="'+id+'" aria-pressed="'+(s.style===id)+'">'+label+'</button>').join('');
    const seen=new Set(),perExercise=m.loadChoices.filter(row=>{
      if(seen.has(row.exerciseId))return false;
      seen.add(row.exerciseId);return true;
    });
    const selected=perExercise.some(row=>row.key===s.highlightKey)?s.highlightKey:(m.largest?.key||perExercise[0]?.key||'');
    const optModes=[
      ...(m.largest?[['load','Maior carga registrada']]:[]),
      ...(m.cardioTop?[['cardio','Cardio do dia']]:[]),
      ...(m.weekDays?[['week','Constância da semana']]:[]),
      ['done','Treino concluído']
    ];
    return '<section class="share-screen" aria-label="Criar figurinha do treino">'+
      '<button type="button" class="button-inline share-back" data-action="share-back">← Voltar ao Histórico</button>'+
      headline('CONQUISTA DO DIA','Compartilhar treino','Uma figurinha sobre a sua foto no Instagram. Não é uma reprodução da ficha.')+
      '<div class="share-style-list" role="group" aria-label="Estilo da figurinha">'+choices+'</div>'+
      '<div class="share-preview" aria-label="Prévia da figurinha transparente">'+
        '<canvas id="share-canvas" width="1080" height="880" role="img" aria-label="Prévia do adesivo FORJA com a conquista e os músculos desta sessão"></canvas>'+
      '</div><p class="share-render-status small" id="share-render-status" role="status">Preparando PNG transparente…</p>'+
      '<div class="share-config">'+
        '<div class="field"><label for="share-phrase">Sua frase</label><input id="share-phrase" data-share-field="phrase" maxlength="66" value="'+esc(s.phrase)+'" placeholder="Hoje eu fiz minha parte." /></div>'+
        '<div class="field"><label for="share-mode">Destaque do treino</label><select id="share-mode" data-share-field="highlightMode">'+
          optModes.map(([id,label])=>'<option value="'+id+'" '+(s.highlightMode===id?'selected':'')+'>'+label+'</option>').join('')+
        '</select></div>'+
        (s.highlightMode==='load'&&perExercise.length?'<div class="field"><label for="share-exercise">Exercício em destaque</label><select id="share-exercise" data-share-field="highlightKey">'+
          perExercise.map(row=>'<option value="'+esc(row.key)+'" '+(row.key===selected?'selected':'')+'>'+esc(row.label)+'</option>').join('')+
          '</select><p class="small muted">Maior número de kg registrado, não é recorde pessoal nem compara equipamentos.</p></div>':'')+
        '<div class="share-config-options">'+
          '<label><input type="checkbox" data-share-field="showMuscles" '+(s.showMuscles?'checked':'')+' /> Mapa muscular</label>'+
          '<label><input type="checkbox" data-share-field="showWeek" '+(s.showWeek?'checked':'')+' /> Constância</label>'+
          '<label><input type="checkbox" data-share-field="showCardio" '+(s.showCardio?'checked':'')+' /> Cardio, se houver</label>'+
        '</div>'+
        '<div class="share-view-controls" role="group" aria-label="Visual da figurinha">'+
          '<span>Cor do texto</span>'+
          '<button type="button" class="secondary small-button" data-action="share-tone" data-value="dark" aria-pressed="'+(s.tone==='dark')+'">Para foto clara</button>'+
          '<button type="button" class="secondary small-button" data-action="share-tone" data-value="light" aria-pressed="'+(s.tone==='light')+'">Para foto escura</button>'+
        '</div>'+
        '<div class="share-view-controls" role="group" aria-label="Vista do mapa muscular">'+
          '<span>Mapa</span>'+
          '<button type="button" class="secondary small-button" data-action="share-view" data-value="front" aria-pressed="'+(s.view==='front')+'">Frente</button>'+
          '<button type="button" class="secondary small-button" data-action="share-view" data-value="back" aria-pressed="'+(s.view==='back')+'">Costas</button>'+
        '</div>'+
      '</div>'+
      '<div class="share-actions"><button type="button" class="primary" data-action="share-download" disabled>Salvar figurinha PNG</button>'+
      '<button type="button" class="secondary" data-action="share-copy" disabled>Copiar imagem</button>'+
      '<button type="button" class="secondary" data-action="share-native" disabled>Compartilhar arquivo</button></div>'+
      '<p class="small muted share-howto">Abra o Instagram, escolha sua foto para o Story e procure Figurinhas → Foto para adicionar o PNG. A disponibilidade varia por versão do aplicativo. O FORJA não publica nem acessa sua conta.</p>'+
      '<p class="tiny muted">Somente dados que você escolheu mostrar entram na imagem. Nenhuma foto ou informação é enviada a servidores.</p>'+
    '</section>';
  }
  async function mountSharePreview() {
    const token=++shareRenderVersion,canvas=document.getElementById('share-canvas'),m=shareModel();
    ui.shareBlob=null;
    if(!canvas||!m||!STICKER)return;
    const buttons=Array.from(document.querySelectorAll('[data-action="share-download"],[data-action="share-copy"],[data-action="share-native"]'));
    buttons.forEach(btn=>btn.disabled=true);
    const status=document.getElementById('share-render-status');
    if(status)status.textContent='Preparando PNG transparente…';
    try {
      await STICKER.render(canvas,m,{...ui.share});
      const png=await STICKER.blob(canvas);
      if(token!==shareRenderVersion||document.getElementById('share-canvas')!==canvas||ui.tab!=='share')return;
      ui.shareBlob=png;
      buttons.forEach(btn=>btn.disabled=false);
      if(status)status.textContent='Figurinha pronta: PNG transparente, gerado no seu aparelho.';
    }catch(err){
      console.warn('Não foi possível preparar a figurinha',err);
      if(token!==shareRenderVersion)return;
      if(status)status.textContent='Não foi possível gerar o PNG. Altere o estilo e tente novamente.';
    }
  }
  function downloadSharePNG() {
    const model=shareModel(),blob=ui.shareBlob;
    if(!model||!blob)return notify('A figurinha ainda não está pronta.');
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=STICKER.filename(model);document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    notify('PNG salvo. No Instagram, adicione-o sobre sua foto usando os adesivos disponíveis.');
  }
  function copySharePNG() {
    if(!ui.shareBlob)return notify('A figurinha ainda não está pronta.');
    if(!navigator.clipboard?.write||typeof window.ClipboardItem!=='function')
      return notify('Copiar imagem não está disponível neste navegador. Use Salvar PNG.');
    navigator.clipboard.write([new window.ClipboardItem({'image/png':ui.shareBlob})])
      .then(()=>notify('Imagem copiada. Cole no editor do Instagram se ele permitir.'))
      .catch(()=>notify('O navegador não permitiu copiar a imagem. Use Salvar PNG.'));
  }
  function nativeSharePNG() {
    const model=shareModel(),blob=ui.shareBlob;
    if(!model||!blob)return notify('A figurinha ainda não está pronta.');
    if(typeof File!=='function'||!navigator.canShare||!navigator.share)
      return notify('Compartilhamento de arquivos indisponível. Use Salvar PNG.');
    const file=new File([blob],STICKER.filename(model),{type:'image/png'});
    if(!navigator.canShare({files:[file]}))
      return notify('Seu aparelho não aceita compartilhar esse arquivo. Use Salvar PNG.');
    navigator.share({files:[file]}).catch(err=>{
      if(err?.name!=='AbortError')notify('Não foi possível compartilhar o arquivo. Use Salvar PNG.');
    });
  }

  function renderHistory() {
    const sessions=latestSessions(), muaySessions=M.sortedSessions(state.muay.sessions);
    const shown=sessions.slice(0,ui.historyStrengthLimit);
    const showStrength=ui.historyFilter!=='muay',showMuay=ui.historyFilter!=='strength';
    const filters=[['all','Todos',sessions.length+muaySessions.length],['strength','Musculação',sessions.length],['muay','Muay Thai',muaySessions.length]];
    const calendar=CAL.render({strengthSessions:state.sessions,muaySessions:state.muay.sessions,month:ui.calendarMonth,selectedDay:ui.calendarDay,today:today(),plans:DATA.plans,exercises:state.exercises});
    return `${headline('Sessões e calendário','Seu histórico.')}
      ${sessions.length?'<section class="history-share-quick"><div><strong>Sua última conquista</strong><p class="small muted">Transforme o treino salvo em uma figurinha para sua foto no Instagram.</p></div><button type="button" class="secondary" data-action="share-open" data-id="'+esc(sessions[0].id)+'">Compartilhar conquista</button></section>':''}
      <div class="history-filters" role="group" aria-label="Filtrar sessões por modalidade">
        ${filters.map(([kind,label,count])=>`<button type="button" class="history-filter ${ui.historyFilter===kind?'selected':''}" data-action="history-filter" data-kind="${kind}" aria-pressed="${ui.historyFilter===kind}">${label}<span>${count}</span></button>`).join('')}
      </div>
      <details class="history-calendar-fold" ${ui.historyCalendarOpen?'open':''}>
        <summary>Calendário de treinos <span aria-hidden="true">⌄</span></summary>
        <div class="history-calendar-content">${calendar}</div>
      </details>
      ${showStrength?`<section aria-label="Sessões de musculação"><div class="section-row"><h2 class="section-title">Musculação</h2><small>Mostrando ${shown.length} de ${sessions.length}</small></div>
      ${shown.length?shown.map(session=>{
        const cardio=CARDIO.summarize(session.cardio);
        const needsDay=session.entries.some(en=>exerciseFor(en.id)?.knee&&E.workSets(en).length)&&session.kneeNextDay==null;
        const canAssess=Date.now()-new Date(session.timestamp).getTime()>=86400000;
        const kneePrompt=needsDay&&canAssess;
        const count=session.entries.length;
        return `<details class="history-entry history-card" data-history-id="${esc(session.id)}" ${kneePrompt?'open':''}>
          <summary class="history-summary">
            <span class="history-summary-main"><small>${dateBR(session.day)} · Bloco ${esc(session.planId)}</small>
              <strong>${esc(planFor(session.planId).title)}</strong>
              <span>${count} exercício(s) · ${esc(session.energy||'Esforço não informado')}${cardio.totalMinutes?' · Cardio '+fmt(cardio.totalMinutes)+' min':''}${kneePrompt?' · Avaliar joelho':''}</span></span>
            <span class="history-chevron" aria-hidden="true">⌄</span>
          </summary>
          <div class="history-content">
            <button type="button" class="button-inline history-share-action" data-action="share-open" data-id="${esc(session.id)}">Compartilhar conquista desta sessão</button>
            <ul class="mini-list">${session.entries.map(en=>{
              const ex=exerciseFor(en.id),top=E.topSet(en);
              return `<li><div class="history-exercise"><strong>${esc(ex?.name||en.id)}</strong><br>
                <span>${E.workSets(en).length} séries efetivas${en.pain!=null?' · joelho '+en.pain+'/5+':''}</span>
                <details class="history-details"><summary>Ver todas as séries</summary><ol>${en.sets.map(set=>
                  `<li>${set.warmup?'Aquecimento':'Efetiva'}: ${esc(loadLabel(set.load,ex||en))} × ${set.reps} ${ex?.repPerSide?'rep./lado':'rep.'}${set.rir==null?'':` · RIR ${set.rir}`}</li>`).join('')}</ol></details>
              </div><div class="text-right"><strong>${top?esc(loadLabel(top.load,ex||en)):'—'}</strong><br><span>${top?`${top.reps} ${ex?.repPerSide?'rep./lado':'rep.'}`:''}</span></div></li>`;
            }).join('')}</ul>
            ${cardio.entries.length?`<section class="cardio-history" aria-label="Cardio deste treino"><h3>Cardio · ${fmt(cardio.totalMinutes)} min</h3><ul>${cardio.entries.map(item=>`<li><span>${esc(CARDIO.label(item.type))}</span><strong>${fmt(item.minutes)} min${CARDIO.paceLabel(item)?'<small class="cardio-pace-history">'+esc(CARDIO.paceLabel(item))+'</small>':''}</strong></li>`).join('')}</ul></section>`:''}
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
      ${sessions.length>ui.historyStrengthLimit?`<button class="secondary full history-more" data-action="history-more" data-kind="strength">Ver mais ${Math.min(5,sessions.length-ui.historyStrengthLimit)} treinos de musculação</button>`:''}</section>`:''}
      ${showMuay?`<section aria-label="Sessões de Muay Thai">${M.historySection(state.muay.sessions,ui.historyMuayLimit)}
      ${muaySessions.length>ui.historyMuayLimit?`<button class="secondary full history-more" data-action="history-more" data-kind="muay">Ver mais ${Math.min(5,muaySessions.length-ui.historyMuayLimit)} treinos de Muay Thai</button>`:''}
      </section>`:''}
      <button type="button" class="button-inline history-data-link" data-action="history-data">Backup e exportação <span aria-hidden="true">›</span></button>`;
  }
  function renderEditor() {
    const edit=ui.editor;
    const ex=edit.id?exerciseFor(edit.id):{
      id:'',name:'',group:edit.group,sets:3,low:8,high:12,step:2.5,unit:'kg',mode:'double',active:true,knee:false,
    };
    const bodyweight=SETS.allowsZero(ex);
    const elastic=ex.id.endsWith('-elastico');
    return `${headline('Personalização',edit.id?'Editar exercício':'Novo exercício','Adapte seu plano à sua academia, sem apagar os registros anteriores.')}
      <form class="card" id="exercise-form"><div class="field"><label for="ex-name">Nome do exercício</label><input id="ex-name" name="name" type="text" maxlength="100" required value="${esc(ex.name)}" /></div>
      <div class="field-row three mt-12"><div class="field"><label for="ex-sets">Séries</label><input id="ex-sets" name="sets" type="number" min="1" max="12" step="1" required value="${ex.sets}" /></div>
      <div class="field"><label for="ex-low">Reps mín.</label><input id="ex-low" name="low" type="number" min="1" max="50" step="1" required value="${ex.low}" /></div>
      <div class="field"><label for="ex-high">Reps máx.</label><input id="ex-high" name="high" type="number" min="1" max="50" step="1" required value="${ex.high}" /></div></div>
      ${bodyweight?`<p class="small muted mt-12">${elastic?'Resistência elástica: 0 kg = tensão não quantificada do elástico. Registre repetições reais.':'Peso do corpo · ajuste as séries e repetições. Durante o treino, 0 kg significa sem carga adicional.'}</p>
      <input type="hidden" name="step" value="${ex.step}" /><input type="hidden" name="unit" value="kg" /><input type="hidden" name="mode" value="bodyweight" />`:`<div class="field-row mt-12"><div class="field"><label for="ex-step">Incremento de carga</label><input id="ex-step" name="step" type="number" min="0.5" max="50" step="0.5" required value="${ex.step}" /></div>
      <div class="field"><label for="ex-unit">Unidade da carga</label><select id="ex-unit" name="unit"><option value="kg" ${ex.unit==='kg'?'selected':''}>kg (total/máquina)</option><option value="kg/halter" ${ex.unit==='kg/halter'?'selected':''}>kg por halter</option></select></div></div>
      <div class="field mt-12"><label for="ex-mode">Método de progressão</label><select id="ex-mode" name="mode"><option value="double" ${ex.mode==='double'?'selected':''}>Séries com carga estável</option><option value="pyramid" ${ex.mode==='pyramid'?'selected':''}>Pirâmide crescente</option></select></div>`}
      <label class="setting-item mt-12"><span>Exercício que exige acompanhamento do joelho</span><input class="switch" type="checkbox" name="knee" ${ex.knee?'checked':''}/></label>
      <label class="setting-item mt-12"><span>Ativo no treino</span><input class="switch" type="checkbox" name="active" ${ex.active?'checked':''}/></label>
      <p class="small muted">${bodyweight?'Acompanhe a progressão pelas repetições e pela técnica.':'Sugestões de carga só aparecem após duas sessões consistentes.'} Séries de aquecimento são excluídas da análise.</p>
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
      ${renderDailyRoutineSettings()}
      <form id="goal-form" class="card"><h2 class="section-title">Objetivo e prazo</h2>
      <div class="field mt-12"><label for="goal-mode">Meu objetivo</label><select id="goal-mode" name="goalMode">${Object.entries(PLANNER.MODES).map(([key,label])=>`<option value="${esc(key)}" ${(state.settings.goalMode||'weight')===key?'selected':''}>${esc(label)}</option>`).join('')}</select></div>
      <p class="small muted">Peso atual: <strong>${fmt(PLANNER.latestWeight(state,today())?.weight||state.settings.startWeight)} kg</strong>, calculado pela última pesagem. O peso inicial é referência histórica e não precisa ser atualizado diariamente.</p>
      <div class="field-row mt-12"><div class="field"><label for="initial-weight">Peso inicial de referência (kg)</label><input id="initial-weight" name="startWeight" type="number" step="0.1" min="30" max="350" value="${state.settings.startWeight}" required /></div>
      <div class="field"><label for="target-weight">Meta (kg)</label><input id="target-weight" name="targetWeight" type="number" step="0.1" min="30" max="350" value="${state.settings.targetWeight}" required /></div></div>
      <div class="field mt-12"><label for="goal-date">Data-alvo desejada</label><input id="goal-date" name="goalDate" type="date" value="${state.settings.goalDate}" required /></div><p class="small muted">Prazo desejado, não garantia de resultado. Nenhuma mudança de calorias é aplicada automaticamente.</p>
      <button class="primary full mt-12" type="submit">Salvar meta</button></form>
      <section class="card"><h2 class="section-title">Samsung Health · histórico importado</h2>${renderHealthSummary()}</section>
      <section class="card" id="settings-data" aria-labelledby="settings-data-title"><h2 class="section-title" id="settings-data-title" tabindex="-1">Seus dados</h2><p class="small muted">O histórico fica somente neste navegador. Ao trocar de celular, limpar os dados do site ou usar navegação privada, ele pode se perder. Exporte um backup periodicamente.</p>
      <button class="secondary full mt-12" data-action="import-health">Importar histórico do Samsung Health (JSON)</button><p class="small muted">Importe um arquivo de transcrição dos seus registros. Os totais mensais ficam separados dos dias observados. Importação local, sem substituir treinos, refeições ou pesagens existentes.</p>
      <button class="primary full mt-12" data-action="export-ai">Exportar todos os dados para IA (JSON)</button><p class="small muted">Inclui musculação, Muay Thai, histórico corporal, bioimpedância, passos diários, alimentação, rotina diária de saúde, metas e rascunhos. Arquivo gerado localmente, não enviado pela FORJA. Contém informações pessoais: compartilhe somente com uma IA confiável. Não é um arquivo de restauração.</p><div class="btnrow mt-12"><button class="secondary" data-action="export-json">Baixar backup JSON</button><button class="secondary" data-action="export-csv">Exportar séries CSV</button><button class="secondary" data-action="import-json">Importar ou mesclar backup</button></div>
        <p class="small muted mt-12">Ao importar, a FORJA mantém os registros existentes e acrescenta apenas sessões e exercícios ainda não encontrados. Em uma instalação vazia, carrega o backup completo. Exporte seu histórico atual antes de qualquer migração.</p></section>
      <section class="card"><h2 class="section-title">Sobre as sugestões</h2><p class="small muted">O app diferencia aquecimento e séries efetivas. Para sugerir aumento, exige duas sessões consistentes dentro da faixa de repetições e RIR informado. Em exercícios de joelho, também exige ausência de sintomas durante e no dia seguinte.</p>
      <div class="callout warn">Não é um diagnóstico. Dor recorrente abaixo da patela deve ser avaliada por profissional de saúde; uma joelheira não garante segurança para aumentar a carga.</div>
      <button class="danger-button full mt-12" data-action="reset">Apagar registros deste aparelho</button></section>
      <p class="small muted">FORJA · MVP 1.0 · Funciona offline depois do primeiro acesso seguro (HTTPS). Código aberto e armazenamento local.</p>`;
  }
  function collectDraft(event) {
    const el=event.target;
    if(!ui.draft) return;
    if(el.dataset.cardioField) {
      const index=Number(el.dataset.cardioIndex), field=el.dataset.cardioField;
      const row=ui.draft.cardio?.[index];
      if(!row||!Number.isInteger(index)||!['type','minutes','avgSpeed','speedUnit'].includes(field))return;
      row[field]=el.value;
      persistDraft();if(field==='type'||field==='speedUnit')updateCardioChoices();
      updateCardioSummary();refreshReview();return;
    }
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
    if(n===null || n<30 || n>350 || !PLANNER.dateOK(day) || day>today())
      return notify('Informe um peso válido e data não futura.');
    // A single logged weight drives evolution, goal planning and the nutrition
    // calculation profile. Start and target weights stay unchanged.
    const previousWeights=copy(state.weights);
    const previousProfile=state.nutrition?.settings?.profile?copy(state.nutrition.settings.profile):null;
    const existing=state.weights.find(w=>w.date===day);
    if(existing) {existing.weight=n;existing.initial=false;}
    else state.weights.push({id:`weight-${Date.now()}`,date:day,weight:n});
    const latest=PLANNER.latestWeight(state,today());
    if(latest&&!latest.reference&&state.nutrition?.settings?.profile)
      state.nutrition.settings.profile.weightKg=latest.weight;
    if(!save()){
      state.weights=previousWeights;
      if(previousProfile)state.nutrition.settings.profile=previousProfile;
      return notify('Não foi possível salvar a pesagem. O histórico anterior foi preservado.');
    }
    render();notify('Peso atual atualizado na evolução, objetivo e perfil nutricional. A meta alimentar permanece igual.');
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
    const bodyweight=SETS.allowsZero(existing);
    const patch={name,sets,low,high,step,unit:!bodyweight&&fd.get('unit')==='kg/halter'?'kg/halter':'kg',
      mode:bodyweight?'bodyweight':fd.get('mode')==='pyramid'?'pyramid':'double',knee:fd.has('knee'),active:fd.has('active')};
    if(existing) Object.assign(existing,patch);
    else state.exercises.push({id:`custom-${Date.now()}`,group:ui.editor.group,...patch});
    ui.editor=null;save();render();notify('Exercício salvo.');
  }
  function finishWorkout() {
    const cardio=CARDIO.parse(ui.draft?.cardio);
    if(!cardio.ok)return notify(cardio.error);
    const result=[];
    for (const raw of Object.values(ui.draft.entries)) {
      const ex=exerciseFor(raw.id), sets=[];
      for (const row of raw.sets) {
        const load=E.cleanNumber(row.load),reps=E.cleanNumber(row.reps),rir=E.cleanNumber(row.rir);
        if (reps===null) continue; // cargas sugeridas sem execucao nao viram historico
        if (!SETS.performed(row,ex)||
          (rir!==null && (!Number.isInteger(rir)||rir<0||rir>10)))
          return notify(`Confira carga, repetições e RIR de ${ex.name}.`);
        sets.push({load,reps,rir,warmup:!!row.warmup});
      }
      if (!sets.some(s=>!s.warmup)) continue;
      if (ex.knee && (raw.pain==='' || raw.pain===null))
        return notify(`Informe a dor no joelho (mesmo que zero) em ${ex.name}.`);
      result.push({id:ex.id,sets,pain:ex.knee?Number(raw.pain):null});
    }
    if(!result.length) return notify('Registre pelo menos uma série efetiva com carga e repetições. No abdominal com peso do corpo, use 0 kg adicionais.');
    const now=new Date();
    state.sessions.push({id:`session-${now.getTime()}-${Math.random().toString(36).slice(2,6)}`,planId:ui.draft.planId,
      timestamp:now.toISOString(),day:today(),entries:result,kneeNextDay:null,
      plannedIds:[...ui.draft.plannedIds],skipped:F.skippedForSave(ui.draft,result),
      energy:ui.draft.energy,notes:ui.draft.notes.trim().slice(0,1000),
      ...(cardio.entries.length?{cardio:cardio.entries}:{})});
    if (!save()) {
      state.sessions.pop();
      return notify('Não foi possível salvar o histórico. O rascunho foi mantido; não feche esta página.');
    }
    const discomfort=result.some(en=>en.pain!==null && en.pain>0);
    clearDraft();ui.tab='history';ui.historyFilter='all';render();window.scrollTo(0,0);
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
        'state.dailyRoutine contém somente confirmações manuais opcionais de medicamento/suplemento; ausência não indica dose esquecida, não demonstra efeito no desempenho e não fundamenta conclusões clínicas.',
        'Sugestões de fator de atividade são heurísticas categóricas, não PAL medido e não somam calorias de exercícios.',
        'session.cardio registra modalidade, minutos e, opcionalmente para escada, ritmo médio em degraus/min ou nível do aparelho. O nível é específico do equipamento. A escada aparece como atividade complementar em quadríceps, glúteos e panturrilhas, mas minutos e velocidade não viram séries musculares, calorias, força ou hipertrofia estimada.',
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
      abdomenDefaultsVersion:Math.max(current.abdomenDefaultsVersion||0,incoming.abdomenDefaultsVersion||0),
      weights:[...current.weights,...newWeights],
      exercises:unionById(current.exercises,incoming.exercises),
      sessions:unionById(current.sessions,incoming.sessions),
      bodyMeasurements:BODY.merge(current.bodyMeasurements,incoming.bodyMeasurements),
      bioimpedance:BODY.mergeBio(current.bioimpedance,incoming.bioimpedance),
      activitySteps:ACT.mergeSteps(current.activitySteps,incoming.activitySteps),
      healthMonthly:HEALTH.mergeMonthly(current.healthMonthly,incoming.healthMonthly),
      healthWeightReports:HEALTH.mergeWeightReports(current.healthWeightReports,incoming.healthWeightReports),
      reminderPrefs:current.reminderPrefs||incoming.reminderPrefs||{enabled:true,items:{}},
      dailyRoutine:ROUTINE.merge(current.dailyRoutine,incoming.dailyRoutine),
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
      DATA.ensureAbdomen(state);
      if(!validState(state)||!M.validArchive(state.muay)){state=oldState;throw new Error('Falha ao validar estado mesclado.');}
      if(!save()){state=oldState;return notify('Importação não concluída. Seu histórico anterior foi mantido.');}
      if(!hasCurrent)clearDraft();
      muayMode=false;ui.editor=null;ui.tab='home';render();
      notify(hasCurrent?'Backup mesclado. Dados anteriores preservados.':'Backup importado com sucesso.');
    }catch(err){console.warn('Importação não concluída',err);
      notify('Não foi possível importar: verifique o backup FORJA e os registros informados.');}
    document.getElementById('import-file').value='';
  }
  function commitSessionCatalogChoice(id){
    const mode=catalogContext();
    if(mode==='browse'||!ui.draft||ui.catalogDetailId!==id)return false;
    const found=F.prepareCatalog(id,state.exercises);
    if(!found)return notify('Exercício indisponível no catálogo.');
    if(found.isNew&&state.exercises.length>=200)return notify('Limite de exercícios atingido.');
    const approved=mode==='extra'?sessionAdvice('extra').recommendations.find(item=>
      item.kind==='extra-exercise'&&item.id===id&&item.sourceId):null;
    const context=mode!=='extra'?catalogAdviceContext():null;
    // Every manual addition is checked against completed work today/week and
    // the user's existing goal. This is guidance only; never edits the plan.
    const dayGuide=mode!=='extra'?CRECO?.prescription?.({exercise:found.exercise,
      context,draft:ui.draft,strengthSessions:state.sessions,
      muaySessions:state.muay.sessions,settings:state.settings,today:today()}):null;
    const result=CSESSION.prepare({draft:ui.draft,mode,sourceId:ui.catalogSourceId,
      targetId:id,exercise:found.exercise,dayPrescription:dayGuide,
      eligibleExtraIds:mode==='extra'?eligibleExtraIds():[],extraSourceId:approved?.sourceId});
    if(!result.ok)return notify(result.error);
    const before=ui.draft;
    let added=false;
    if(found.isNew){
      // In-session exercises remain inactive in the permanent training plan.
      state.exercises.push({...found.exercise,active:false});added=true;
      if(!save()){state.exercises.pop();return notify('Não foi possível salvar o exercício.');}
    }
    ui.draft=result.draft;
    if(!persistDraft()){
      ui.draft=before;
      if(added){state.exercises.pop();save();}
      return notify('O rascunho não foi salvo. Sua sessão anterior foi preservada.');
    }
    ui.focusedExercise=id;
    const message=mode==='replace'?'Exercício substituído só nesta sessão. O original permanece no histórico da ficha.':
      mode==='extra'?'Exercício opcional adicionado com uma série vazia.':'Exercício adicionado somente ao treino de hoje.';
    leaveSessionCatalog();notify(message);
    return true;
  }
  function handleAction(btn,event=null) {
    const action=btn.dataset.action;
    if (loadFailure) {
      if (action==='recovery-export-raw' && unreadableOriginal) {
        download('forja-recuperacao-bruta-'+today()+'.json',unreadableOriginal,'application/json;charset=utf-8');
        notify('Cópia original exportada. Guarde o arquivo em local seguro.');
      }
      return;
    }
    if(action==='balance-review'){
      ui.tab='progress';ui.evolutionView='training';ui.evolutionVolumeDays=30;
      render();document.querySelector('.muscle-map-card')?.scrollIntoView({block:'start'});return;
    }
    if(action==='balance-select'){
      const report=balanceReport(),candidate=report.recommendations.find(x=>x.id===btn.dataset.id);
      if(!candidate||!ui.draft)return notify('Esta alternativa não se aplica mais à sessão.');
      ui.balancePending={id:candidate.id};
      render();return;
    }
    if(action==='balance-apply'){applyBalanceSwap(btn.dataset.id);return;}
    if(action==='balance-dismiss'){ui.balanceDismissed=true;ui.balancePending=null;render();return;}
    if(action==='balance-show'){ui.balanceDismissed=false;render();return;}
    if(action==='balance-cancel'){ui.balancePending=null;render();return;}
    if(action==='share-open'){openShare(btn.dataset.id);return;}
    if(action==='share-back'){
      ui.tab='history';ui.share=null;ui.shareBlob=null;shareRenderVersion++;
      render();window.scrollTo(0,0);return;
    }
    if(action==='share-style'||action==='share-tone'||action==='share-view'){
      if(!ui.share)return;
      const field=action==='share-style'?'style':action==='share-tone'?'tone':'view';
      ui.share[field]=btn.dataset.value;
      render();return;
    }
    if(action==='share-download'){downloadSharePNG();return;}
    if(action==='share-copy'){copySharePNG();return;}
    if(action==='share-native'){nativeSharePNG();return;}
    if(action==='muscle-map-view'){
      const view=btn.dataset.view;
      if(!MUSCLE_BODY||!['front','back'].includes(view)||view===ui.evolutionMuscleView)return;
      ui.evolutionMuscleView=view;
      if(ui.evolutionMuscleSelected&&!MUSCLE_BODY.visibleIds(view).includes(ui.evolutionMuscleSelected))
        ui.evolutionMuscleSelected=null;
      refreshMuscleMap();return;
    }
    if(action==='muscle-region'){
      selectMuscleRegion(btn.dataset.muscle,btn,{reveal:event?.type==='click'&&event.detail>0});return;
    }
    if(action==='muscle-map-return'){
      const card=btn.closest('.muscle-map-card');
      const selected=card?.querySelector('svg [data-muscle-region][aria-pressed="true"]');
      const target=selected||card?.querySelector('[data-action="muscle-map-view"][aria-pressed="true"]');
      target?.focus({preventScroll:true});
      card?.querySelector('.muscle-map-canvas')?.scrollIntoView({
        block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
      });return;
    }
    if(action==='anatomy-view'){
      const viewer=btn.closest('.ex-anatomy-viewer');
      const id=viewer?.dataset.anatomyId,view=btn.dataset.view;
      if(!id||!['front','back'].includes(view)||viewer.dataset.anatomyView===view)return;
      const info=ANATOMY?.viewInfo(id,view);
      const canvas=viewer.querySelector('.ex-anatomy-canvas');
      if(!info||!canvas)return;
      // Keep the controls and workout inputs mounted. A view is UI state only:
      // no render(), storage write, draft update or change to workout selection.
      ui.anatomyViews[id]=view;
      viewer.dataset.anatomyView=view;
      canvas.innerHTML=ANATOMY.figure(id,false,view);
      canvas.dataset.switched='true';
      viewer.querySelectorAll('[data-action="anatomy-view"]').forEach(control=>{
        control.setAttribute('aria-pressed',String(control.dataset.view===view));
      });
      const status=viewer.querySelector('.ex-anatomy-view-note');
      if(status)status.textContent=info.note;
      const host=viewer.closest('.ex-anatomy,.catalog-detail-card');
      host?.querySelectorAll('[data-anatomy-location]').forEach(label=>{
        const note=ANATOMY.legendNote(id,view,label.dataset.anatomyLocation);
        label.textContent=note;label.hidden=!note;
      });
      const thumb=host?.querySelector('.ex-anatomy-thumb');
      if(thumb)thumb.innerHTML=ANATOMY.figure(id,true,view);
      return;
    }
    if(action==='routine-confirm'||action==='routine-hide'||action==='routine-show'||action==='routine-manage'||action==='routine-enable'){
      handleDailyRoutineAction(btn);return;
    }
    if(action==='reminder-manage'){ui.tab='settings';render();document.querySelector('.reminder-settings')?.scrollIntoView({block:'start'});return;}
    if(action==='reminder-open'||action==='reminder-snooze'||action==='reminder-dismiss'||action==='reminder-toggle'){
      handleReminderAction(btn);return;
    }
    if(action==='goal-open'){ui.tab='settings';ui.editor=null;render();window.scrollTo(0,0);document.getElementById('goal-form')?.scrollIntoView({block:'start'});return;}
    if(action==='nutrition-open'||action==='nutrition-goals'){
      ui.tab='nutrition';ui.editor=null;render();window.scrollTo(0,0);
      if(action==='nutrition-goals')diary.goals();return;
    }
    if(action==='progress-open-training'){
      openProgress('training',{section:btn.dataset.section==='progress-steps-title'?'progress-steps-title':null});return;
    }
    if(action==='history-filter'){
      if(!['all','strength','muay'].includes(btn.dataset.kind))return;
      ui.historyFilter=btn.dataset.kind;
      render();document.querySelector('.history-filter[aria-pressed="true"]')?.focus({preventScroll:true});return;
    }
    if(action==='history-knee'){
      ui.tab='history';ui.editor=null;ui.historyFilter='strength';
      const pendingIds=new Set(dueKnee().map(s=>s.id));
      const index=latestSessions().findIndex(s=>pendingIds.has(s.id));
      if(index>=0)ui.historyStrengthLimit=Math.max(ui.historyStrengthLimit,index+1);
      render();document.querySelector('.history-card[open]')?.scrollIntoView({block:'start'});return;
    }
    if(action==='history-data'){
      ui.tab='settings';ui.editor=null;render();
      document.getElementById('settings-data')?.scrollIntoView({block:'start'});
      document.getElementById('settings-data-title')?.focus({preventScroll:true});return;
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
    if(action==='cardio-add'){
      if(!ui.draft)return;
      const before=ui.draft.cardio;
      const rows=Array.isArray(before)?before:[];
      const next=CARDIO.TYPES.find(type=>!rows.some(row=>row?.type===type.id));
      if(!next||rows.length>=5)return;
      ui.draft.cardio=[...rows,{type:next.id,minutes:''}];ui.cardioOpen=true;
      if(!persistDraft()){ui.draft.cardio=before;return notify('Não foi possível salvar o cardio no rascunho.');}
      const scroll=window.scrollY;render();window.scrollTo(0,scroll);
      document.getElementById('cardio-minutes-'+rows.length)?.focus({preventScroll:true});return;
    }
    if(action==='cardio-remove'){
      const index=Number(btn.dataset.index),before=ui.draft?.cardio;
      if(!Array.isArray(before)||!Number.isInteger(index)||index<0||index>=before.length)return;
      ui.draft.cardio=before.filter((_,i)=>i!==index);ui.cardioOpen=true;
      if(!persistDraft()){ui.draft.cardio=before;return notify('Não foi possível salvar a alteração.');}
      const scroll=window.scrollY;render();window.scrollTo(0,scroll);
      document.querySelector('[data-action="cardio-add"]')?.focus({preventScroll:true});return;
    }
    if(action==='focus-cardio'){
      if(!ui.draft||!ui.focusedMode)return;
      // The same single cardio form is moved next to the focused exercise.
      // Opening it changes UI state only; entries remain in the shared draft.
      ui.cardioOpen=true;
      const panel=document.getElementById('session-cardio-panel');
      if(!panel)return;
      panel.open=true;
      panel.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      panel.querySelector('summary')?.focus({preventScroll:true});
      return;
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
      if(!FOCUS.performed(row,en.id))return notify('Informe a carga e as repetições realmente executadas nesta série.');
      notify('Série registrada no rascunho automático.');return;
    }
    if(action==='recovery-energy'){
      if(!['boa','normal','baixa'].includes(btn.dataset.value))return;
      ui.homeRecoveryOpen=true;
      const existing=checkin();
      state.settings.recoveryCheckin={
        day:today(),energy:btn.dataset.value,fatigue:existing?.fatigue||'normal',
        kneePain:existing?.kneePain??''};
      const beforeHistory=(state.recoveryHistory||[]).slice();
      state.recoveryHistory=PERF?.upsertRecovery(beforeHistory,state.settings.recoveryCheckin)||beforeHistory;
      if(!save()){state.recoveryHistory=beforeHistory;return;}
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
      ui.bodyOpen=true;ui.bodyView='current';ui.bodyEditDate=null;ui.tab='progress';ui.evolutionView='weight';
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
    if(action==='catalog-session-open'){
      if(!ui.draft)return;
      openSessionCatalog(btn.dataset.mode||'add',btn.dataset.source||null);return;
    }
    if(action==='catalog-session-mode'){
      if(ui.tab!=='catalog'||catalogContext()==='browse'||!['replace','add','extra'].includes(btn.dataset.mode))return;
      ui.catalogContext=btn.dataset.mode;
      ui.catalogDetailId=null;ui.catalogConfirmId=null;
      render();window.scrollTo(0,0);return;
    }
    if(action==='catalog-return-session'){
      if(ui.tab!=='catalog'||!ui.draft)return;
      leaveSessionCatalog();return;
    }
    if(action==='catalog-energy'){
      if(!ui.draft||ui.tab!=='catalog'||catalogContext()!=='extra')return;
      const before=ui.draft.energy;
      ui.draft.energy=before==='leve'?'normal':'leve';
      if(!persistDraft()){ui.draft.energy=before;return notify('Não foi possível salvar a energia da sessão.');}
      render();return;
    }
    if(action==='training-destination'){
      const target=btn.dataset.to;
      if(!['plans','catalog'].includes(target))return;
      if(target==='plans'&&catalogContext()!=='browse'){leaveSessionCatalog();return;}
      ui.tab=target;
      ui.editor=null;ui.catalogContext='browse';ui.catalogSourceId=null;
      ui.catalogDetailId=null;ui.catalogConfirmId=null;
      render();window.scrollTo(0,0);return;
    }
    if(action==='catalog-view'){
      const ex=F.options(state.exercises,null).find(item=>item.id===btn.dataset.ex);
      if(ui.tab!=='catalog'||!ex)return;
      ui.catalogScrollY=window.scrollY;
      ui.catalogDetailId=ex.id;
      ui.catalogConfirmId=null;
      render();window.scrollTo(0,0);
      document.getElementById('catalog-detail-heading')?.focus({preventScroll:true});return;
    }
    if(action==='catalog-back'){
      if(ui.tab!=='catalog'||!ui.catalogDetailId)return;
      const id=ui.catalogDetailId;
      ui.catalogDetailId=null;
      ui.catalogConfirmId=null;
      render();window.scrollTo(0,ui.catalogScrollY||0);
      Array.from(document.querySelectorAll('[data-action="catalog-view"]'))
        .find(item=>item.dataset.ex===id)?.focus({preventScroll:true});return;
    }
    if(action==='catalog-intent'){
      if(ui.tab!=='catalog'||ui.catalogDetailId!==btn.dataset.ex)return;
      if(catalogContext()==='browse'){
        const current=state.exercises.find(ex=>ex.id===btn.dataset.ex);
        if(current?.active)return;
      }else{
        const check=CSESSION.canChoose({draft:ui.draft,mode:catalogContext(),
          sourceId:ui.catalogSourceId,targetId:btn.dataset.ex,
          eligibleExtraIds:catalogContext()==='extra'?eligibleExtraIds():[]});
        if(!check.ok)return notify(check.error);
      }
      ui.catalogConfirmId=btn.dataset.ex;
      render();
      document.querySelector('[data-action="catalog-confirm"]')?.focus({preventScroll:true});return;
    }
    if(action==='catalog-cancel'){
      if(ui.tab!=='catalog'||!ui.catalogConfirmId)return;
      ui.catalogConfirmId=null;
      render();document.querySelector('[data-action="catalog-intent"]')?.focus({preventScroll:true});return;
    }
    if(action==='catalog-confirm'){
      const id=btn.dataset.ex;
      if(ui.tab!=='catalog'||ui.catalogDetailId!==id||ui.catalogConfirmId!==id)return;
      if(catalogContext()!=='browse'){commitSessionCatalogChoice(id);return;}
      const current=state.exercises.find(ex=>ex.id===id);
      if(current?.active){ui.catalogConfirmId=null;render();return;}
      if(current){
        const old=current.active;current.active=true;
        if(!save()){current.active=old;return notify('Não foi possível ativar o exercício.');}
        notify('Exercício ativado no bloco '+current.group+'.');
      }else{
        if(state.exercises.length>=200)return notify('Limite de exercícios atingido.');
        const found=F.prepareCatalog(id,state.exercises);
        if(!found?.isNew)return;
        const added={...found.exercise,active:true};
        state.exercises.push(added);
        if(!save()){state.exercises.pop();return notify('Não foi possível adicionar o exercício.');}
        notify('Exercício incluído na ficha do bloco '+added.group+'.');
      }
      ui.catalogConfirmId=null;render();return;
    }
    if(action==='catalog-edit-in-plan'){
      if(ui.tab!=='catalog'||ui.catalogDetailId!==btn.dataset.ex)return;
      const ex=state.exercises.find(item=>item.id===btn.dataset.ex);
      if(!ex?.active)return;
      ui.plan=ex.group;ui.tab='plans';muayMode=false;
      ui.catalogDetailId=null;ui.catalogConfirmId=null;
      ui.editor={id:ex.id};
      render();window.scrollTo(0,0);return;
    }
    if(action==='catalog-more'){
      if(ui.tab!=='catalog'||ui.catalogDetailId)return;
      ui.catalogLimit=Math.min(ui.catalogLimit+12,240);
      filterCatalogDOM();return;
    }
    if(action==='catalog-filter'){
      if(!['all','S','A','B','C','D'].includes(btn.dataset.group))return;
      ui.catalogGroup=btn.dataset.group;ui.catalogStyle='all';ui.catalogLimit=12;render();return;
    }
    if(action==='catalog-style'){
      if(ui.tab!=='catalog'||ui.catalogGroup!=='S'||!['all','easy','home','machine','free'].includes(btn.dataset.style))return;
      ui.catalogStyle=btn.dataset.style;ui.catalogLimit=12;render();return;
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
    if(['muay-quick-mode','muay-quick-choice','muay-combo-add','muay-combo-remove','muay-quick-add'].includes(action)){
      const draft=state.muay.draft,quick=draft?.place==='academia'?draft.quick:null;
      if(!quick)return;
      const before=copy(quick);
      if(action==='muay-quick-mode'){
        if(!Object.hasOwn(M.QUICK_MODES,btn.dataset.value))return;
        quick.mode=btn.dataset.value;
      }else if(action==='muay-quick-choice'){
        const field=btn.dataset.quickField,value=btn.dataset.value;
        const catalogs={movement:M.QUICK_MOVEMENTS,limb:M.QUICK_LIMBS,
          preset:{20:1,50:1,ladder:1,ladderCumulative:1,custom:1},exchange:M.SPARRING_EXCHANGE,
          rules:M.SPARRING_RULES,contact:M.SPARRING_CONTACT};
        if(!Object.hasOwn(catalogs[field]||{},value))return;
        quick[field]=value;
        if(field==='movement'){
          if(value==='agachamento')quick.limb='bilateral';
          else if(quick.limb==='bilateral')quick.limb='both';
        }
        if(field==='preset'&&['20','50'].includes(value))quick.quantity=value;
      }else if(action==='muay-combo-add'){
        if(!Object.hasOwn(M.COMBO_STRIKES,btn.dataset.value)||quick.combo.length>=12)return;
        quick.combo.push(btn.dataset.value);
      }else if(action==='muay-combo-remove'){
        const index=Number(btn.dataset.index);
        if(!Number.isInteger(index)||index<0||index>=quick.combo.length)return;
        quick.combo.splice(index,1);
      }else{
        if(draft.activities.length>=30)return notify('Limite de 30 blocos por sessão.');
        const prepared=M.quickActivity(quick);
        if(prepared.error)return notify(prepared.error);
        draft.activities.push(prepared.activity);
        if(!save()){draft.activities.pop();return notify('Não foi possível salvar este bloco.');}
        render();return;
      }
      if(!save()){draft.quick=before;return notify('Não foi possível atualizar o registro.');}
      render();return;
    }
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
      ui.tab='history';ui.historyFilter='all';render();notify('Treino de Muay Thai salvo.');return;
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
    if(action==='navigate') {ui.tab=btn.dataset.to;ui.editor=null;ui.nutritionOpen=false;ui.catalogContext='browse';ui.catalogSourceId=null;ui.catalogDetailId=null;ui.catalogConfirmId=null;render();window.scrollTo(0,0);}
    else if(action==='select-plan') {ui.plan=btn.dataset.plan;render();}
    else if(action==='start') startWorkout(btn.dataset.plan);
    else if(action==='add-set') {const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length<12){en.sets.push({load:SETS.allowsZero(en)?0:'',reps:'',rir:'',warmup:false});persistDraft();render();}}
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
    else if(action==='evo-view'){
      openProgress(btn.dataset.view,{focusTab:true});return;
    }
    else if(action==='evo-chart-mode'){
      if(!['weight','measures'].includes(btn.dataset.mode))return;
      ui.evolutionChartMode=btn.dataset.mode;render();return;
    }
    else if(action==='evo-volume-days'){
      const days=Number(btn.dataset.days);
      if(![7,30,90].includes(days))return;
      ui.evolutionVolumeDays=days;
      if(document.querySelector('.muscle-map-card'))refreshMuscleMap();else render();
      return;
    }
    else if(action==='evo-period'){
      const kind=btn.dataset.kind,days=Number(btn.dataset.days);
      if(!['energy','macros','average'].includes(kind)||![7,30,90].includes(days))return;
      ui.evolutionPeriods[kind]=days;render();return;
    }
    else if(action==='evo-weight-more'){
      ui.evolutionWeightLimit=Math.min(100,ui.evolutionWeightLimit+10);render();return;
    }
    else if(action==='evo-add-weight'){
      const editor=document.getElementById('evo-weight-editor');
      if(editor)editor.open=true;
      editor?.scrollIntoView({behavior:'smooth',block:'start'});
      document.getElementById('new-weight')?.focus({preventScroll:true});return;
    }
    else if(action==='progress-steps-days'){
      const days=Number(btn.dataset.days);if(![7,14,28].includes(days))return;
      ui.progressStepDays=days;render();return;
    }
    else if(action==='strength-group') {
      const group = btn.dataset.group;
      if (!DATA.rotation.includes(group)) return;
      ui.progressRadarOpen=true;
      ui.strengthGroup = ui.strengthGroup === group ? null : group;
      ui.strengthExercise = null;
      render();
      if (ui.strengthGroup) document.getElementById('strength-group-details')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
    else if(action==='strength-exercise') {
      const ex = exerciseFor(btn.dataset.ex);
      if (!ex || ex.group !== ui.strengthGroup) return;
      ui.progressRadarOpen=true;ui.strengthExercise = ex.id;
      render();
      document.getElementById('strength-exercise-panel')?.scrollIntoView({behavior:'smooth', block:'nearest'});
    }
    else if(action==='strength-close') {
      ui.progressRadarOpen=true;ui.strengthGroup = null; ui.strengthExercise = null;
      render();
      document.getElementById('strength-radar-title')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
    else if(action==='resume'){if(ui.draft){ui.tab='plans';ui.plan=ui.draft.planId;render();window.scrollTo(0,0);}}
    else if(action==='cancel'){if(confirm('Descartar o treino em andamento e apagar seu rascunho salvo neste aparelho?')){clearDraft();render();}}
    else if(action==='edit-ex'){ui.tab='plans';ui.editor={id:btn.dataset.ex};render();window.scrollTo(0,0);}
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
    if (loadFailure) return;
    ui.editor=null;ui.tab='settings';ui.catalogContext='browse';ui.catalogSourceId=null;render();window.scrollTo(0,0);
  });
  document.getElementById('nav').addEventListener('click',event=>{
    if (loadFailure) return;
    const btn=event.target.closest('[data-tab]');if(!btn)return;
    ui.editor=null;ui.tab=btn.dataset.tab;
    ui.catalogContext='browse';ui.catalogSourceId=null;ui.catalogDetailId=null;ui.catalogConfirmId=null;
    if(ui.tab==='progress'){ui.bodyOpen=false;ui.nutritionOpen=false;ui.nutritionEditId=null;}
    render();window.scrollTo(0,0);
  });
  const screen=document.getElementById('screen');
  screen.addEventListener('toggle',event=>{
    if(event.target.matches?.('.session-cardio'))ui.cardioOpen=event.target.open;
    if(event.target.matches?.('.home-recovery'))ui.homeRecoveryOpen=event.target.open;
    if(event.target.matches?.('.ex-anatomy'))ui.anatomyOpen[event.target.dataset.anatomy]=event.target.open;
    if(event.target.matches?.('.progress-advanced-radar'))ui.progressRadarOpen=event.target.open;
    if(event.target.matches?.('.evo-more-tools'))ui.evolutionExtrasOpen=event.target.open;
    if(event.target.matches?.('.evo-training-tools'))ui.evolutionTrainingOpen=event.target.open;
    if(event.target.matches?.('.muscle-map-breakdown'))ui.evolutionMuscleListOpen=event.target.open;
    if(event.target.matches?.('.muscle-map-method'))ui.evolutionMuscleMethodOpen=event.target.open;
    if(event.target.matches?.('.history-calendar-fold'))ui.historyCalendarOpen=event.target.open;
  },true);
  screen.addEventListener('click',event=>{
    const btn=event.target.closest('[data-action]');if(btn)handleAction(btn,event);
  });
  screen.addEventListener('keydown',event=>{
    const region=event.target.closest('[data-action="muscle-region"][role="button"]');
    if(region&&['Enter',' '].includes(event.key)){
      event.preventDefault();if(!event.repeat)handleAction(region);return;
    }
    const tab=event.target.closest('[data-action="evo-view"]');
    if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const views=['weight','training','nutrition'],index=views.indexOf(tab.dataset.view);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?views.length-1:
      (index+(event.key==='ArrowRight'?1:-1)+views.length)%views.length;
    openProgress(views[next],{focusTab:true});
  });
  function updateMuayField(event) {
    const el=event.target,d=state.muay.draft;
    if(!d)return;
    if(el.dataset.muayQuickField && d.quick && d.place==='academia'){
      const field=el.dataset.muayQuickField;
      if(!['quantity','sequenceMinutes','rounds','roundMinutes'].includes(field))return;
      d.quick[field]=el.value;
      if(field==='quantity')d.quick.preset='custom';
      if(!save())notify('Rascunho não salvo. Revise o campo informado.');
      if(['rounds','roundMinutes'].includes(field)){
        const total=Number(d.quick.rounds)*Number(d.quick.roundMinutes);
        const label=document.getElementById('muay-spar-total');
        if(label)label.textContent=Number.isFinite(total)&&total>0?total+' min':'—';
      }
      return;
    }else if(el.dataset.muayField){
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
    if(ui.tab==='share' && event.target.dataset.shareField==='phrase' && ui.share){
      ui.share.phrase=event.target.value.slice(0,66);
      mountSharePreview();return;
    }
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
      ui.catalogLimit=12;
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
    if(ui.tab==='share' && event.target.dataset.shareField && ui.share){
      const field=event.target.dataset.shareField;
      if(['showMuscles','showWeek','showCardio'].includes(field))ui.share[field]=event.target.checked;
      else if(['highlightMode','highlightKey'].includes(field))ui.share[field]=event.target.value;
      else if(field==='phrase'){ui.share.phrase=event.target.value.slice(0,66);mountSharePreview();return;}
      else return;
      render();return;
    }
    if(event.target.id==='muscle-map-select'){
      selectMuscleRegion(event.target.value,event.target);return;
    }
    if(event.target.id==='evo-measure-field'){
      const id=event.target.value;
      if(BODY.FIELDS.some(f=>f.id===id)){ui.evolutionMeasureKey=id;render();}
      return;
    }
    if(event.target.id==='home-step-date'){
      const previous=(state.activitySteps||[]).find(row=>row.date===event.target.value);
      const input=screen.querySelector('#home-step-count');if(input)input.value=previous?String(previous.steps):'';
      return;
    }
    if(event.target.id==='catalog-source-select'&&ui.tab==='catalog'&&catalogContext()==='replace'){
      const id=event.target.value;
      if(id&&!CSESSION.sourceOptions(ui.draft).some(entry=>entry.id===id))return;
      ui.catalogSourceId=id||null;ui.catalogConfirmId=null;
      const scroll=window.scrollY;render();window.scrollTo(0,scroll);return;
    }
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
      const beforeHistory=(state.recoveryHistory||[]).slice();
      state.recoveryHistory=PERF?.upsertRecovery(beforeHistory,state.settings.recoveryCheckin)||beforeHistory;
      if(!save()){state.settings.recoveryCheckin=previous;state.recoveryHistory=beforeHistory;return;}
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
    else if(event.target.id==='home-steps-form')saveHomeSteps(event.target);
    else if(event.target.id==='daily-routine-form')saveDailyRoutineSettings(event.target);
    else if(event.target.id==='exercise-form')saveExercise(event.target);
    else if(event.target.id==='body-measures-form')saveBodyMeasures(event.target);
    else if(event.target.id==='bio-form')saveBio(event.target);

  });
  document.getElementById('import-file').addEventListener('change',event=>importJSON(event.target.files?.[0]));
  document.getElementById('import-health-file').addEventListener('change',event=>importHealthFile(event.target.files?.[0]));
  render();
  // Resuming the installed PWA after midnight must show today's status,
  // even if Android kept the JavaScript tab alive in the background.
  let lastVisibleDay=today();
  function refreshOnNewDay(){
    const currentDay=today();
    if(currentDay===lastVisibleDay)return;
    lastVisibleDay=currentDay;
    ui.routineHidden=false;
    if(ui.tab==='home')render();
    else if(ui.tab==='progress'&&ui.evolutionView==='training')refreshMuscleMap();
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')refreshOnNewDay();
  });
  window.addEventListener('pageshow',refreshOnNewDay);
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
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=20261123-muayquick1',{updateViaCache:'none'})
      .catch(err=>console.warn('Offline indisponível',err)));
  }
})();
