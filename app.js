(function () {
  'use strict';
  const DATA = window.AcademiaData;
  const E = window.AcademiaEngine;
  const KEY = 'forja.academia.v1';
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
      settings: { startWeight: 88.3, targetWeight: 82, goalDate: '2027-01-14', fatigue: 'normal', kneePain: '' },
      weights: [{ id:'initial-2026-10-30', date:'2026-10-30', weight:88.3, initial:true }],
      sessions: [], exercises: copy(DATA.exercises),
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return initial();
      const parsed = JSON.parse(raw);
      if (!validState(parsed)) throw new Error('Backup incompatível');
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
  let state = load();
  const ui = { tab:'home', plan:'A', editor:null, draft:null };
  let toastTimeout;
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
  function render() {
    const main = document.getElementById('screen');
    main.innerHTML = ui.editor ? renderEditor() : ui.draft ? renderTraining() :
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
  function renderHome() {
    const goal = E.progress(state.weights,state.settings.startWeight,state.settings.targetWeight);
    const left = dayGap(today(),state.settings.goalDate);
    const next = getNext(), plan = planFor(next.id);
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
      ${pending.length?`<div class="callout warn"><strong>Cheque o joelho no dia seguinte.</strong> Há ${pending.length} treino(s) de pernas aguardando registro. <button class="button-inline" data-action="navigate" data-to="history">Registrar agora</button></div>`:''}
      <div class="section-row"><h2 class="section-title">Seu próximo treino</h2>${tag(`Bloco ${next.id}`,'green')}</div>
      <section class="card"><div class="card-row"><div><h3>${esc(plan.title)}</h3><p>${esc(plan.subtitle)}</p></div><span class="rounded-emoji" aria-hidden="true">${plan.type==='upper'?'↗':'⌁'}</span></div>
        <p class="bodycopy mt-12">${esc(next.reason)}</p>
        <div class="field-row mt-12"><div class="field"><label for="fatigue-home">Fadiga das pernas</label><select id="fatigue-home" data-setting="fatigue"><option value="normal" ${state.settings.fatigue==='normal'?'selected':''}>Normal</option><option value="moderada" ${state.settings.fatigue==='moderada'?'selected':''}>Moderada</option><option value="alta" ${state.settings.fatigue==='alta'?'selected':''}>Alta</option></select></div>
        <div class="field"><label for="knee-home">Dor no joelho agora</label><select id="knee-home" data-setting="kneePain">${painOptions(state.settings.kneePain)}</select></div></div>
        <button class="primary full mt-12" data-action="start" data-plan="${next.id}">Iniciar ${esc(plan.title)}</button>
        <button class="button-inline mt-8" data-action="navigate" data-to="plans">Escolher outro bloco</button>
      </section>
      ${last?`<div class="section-row"><h2 class="section-title">Última atividade</h2><span class="tiny muted">${dateBR(last.day)}</span></div><div class="card"><strong>${esc(planFor(last.planId).title)}</strong><p class="small muted mt-8">${last.entries.length} exercícios registrados · ${esc(last.energy||'Esforço não informado')}</p></div>`:''}
      ${lastTop?`<div class="section-row"><h2 class="section-title">Seu último peso de treino</h2></div><div class="card"><div class="card-row"><div><strong>${esc(lastTop.x.name)}</strong><p class="last">${esc(lastTop.r.last)}</p></div>${tag(lastTop.r.level==='increase'?'Pode subir':'Em evolução',lastTop.r.level==='increase'?'green':'')}</div><p class="small muted mt-12">${esc(lastTop.r.title)}. ${esc(lastTop.r.explanation)}</p></div>`:''}
      ${weightForm()}
      <p class="small muted">As recomendações são regras de acompanhamento, não substituem orientação de um profissional. Dor no joelho ou piora após treino bloqueiam sugestões automáticas de aumento.</p>`;
  }
  function painOptions(current) {
    return [['','Não informado'],['0','0 · Sem dor'],['1','1 · Mínima'],['2','2 · Leve'],['3','3 · Moderada'],['4','4 · Importante'],['5','5+ · Forte']]
      .map(([v,label])=>`<option value="${v}" ${String(current??'')===v?'selected':''}>${label}</option>`).join('');
  }
  function renderPlans() {
    const next=getNext(), p=planFor(ui.plan);
    const all=state.exercises.filter(x=>x.group===ui.plan);
    return `${headline('Seu planejamento','Treinos flexíveis.','A → C → B → D, alternando membros superiores e inferiores. Adapte a ordem conforme a fadiga.')}
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
    const chosen=planFor(id);
    if(!chosen) return;
    ui.plan=chosen.id;
    ui.tab='plans';ui.editor=null;
    ui.draft={planId:id,energy:'normal',notes:'',entries:{}};
    currentExercises(id).forEach(ex => {ui.draft.entries[ex.id]={id:ex.id,sets:seedSets(ex),pain:''};});
    render();window.scrollTo(0,0);
  }
  function renderTraining() {
    const p=planFor(ui.draft.planId);
    const entries=ui.draft.entries;
    return `${headline('Sessão em andamento',p.title,'Anote o que realizou. As cargas preenchidas são referência; repetições e RIR devem ser informados após cada série.')}
      <div class="callout">${p.type==='lower'?'Treino de pernas: registre dor no joelho durante os exercícios e no dia seguinte. Se doer, não aumente a carga.':'Carga por halter significa o peso de cada halter, não a soma do par.'}</div>
      ${Object.values(entries).map(en=>renderExercise(en)).join('')}
      <section class="card"><h2 class="section-title">Finalizar sessão</h2><div class="field mt-12"><label for="session-energy">Como foi a sessão?</label>
      <select id="session-energy" data-draft-meta="energy"><option value="leve" ${ui.draft.energy==='leve'?'selected':''}>Leve / sobrou energia</option><option value="normal" ${ui.draft.energy==='normal'?'selected':''}>Normal / esforço esperado</option><option value="intenso" ${ui.draft.energy==='intenso'?'selected':''}>Intensa / muita fadiga</option></select></div>
      <div class="field mt-12"><label for="session-notes">Observações (opcional)</label><textarea id="session-notes" data-draft-meta="notes" placeholder="Ex.: sono, dor, execução, Muay Thai no mesmo dia">${esc(ui.draft.notes)}</textarea></div></section>
      <div class="training-controls"><div class="btnrow"><button class="primary" style="flex:2" data-action="finish">Salvar treino</button><button class="ghost" style="flex:1" data-action="cancel">Cancelar</button></div></div>`;
  }
  function renderExercise(en) {
    const ex=exerciseFor(en.id), reco=E.recommend(ex,state.sessions), hasData=history(ex.id).length>0;
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
      <input aria-label="Série ${i+1}, repetições em reserva em ${esc(ex.name)}" type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="—" data-ex="${esc(ex.id)}" data-index="${i}" data-field="rir" value="${esc(set.rir)}" />`).join('')}</div>
      <div class="card-footer"><button class="button-inline" data-action="add-set" data-ex="${esc(ex.id)}">+ Série</button><button class="button-inline" data-action="remove-set" data-ex="${esc(ex.id)}" ${en.sets.length<=1?'disabled':''}>− Última série</button></div>
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
      ${weightForm()}
      <div class="section-row"><h2 class="section-title">Pesagens salvas</h2></div><div class="card"><ul class="mini-list">${all.slice().reverse().slice(0,15).map(it=>`<li><span>${dateBR(it.date)}${it.initial?' · referência inicial':''}</span><strong>${fmt(it.weight)} kg</strong></li>`).join('')}</ul></div>`;
  }
  function renderHistory() {
    const sessions=latestSessions();
    return `${headline('Diário','Seu histórico.','Veja cargas e repetições reais. Treinos registrados neste aparelho ficam disponíveis mesmo sem internet.')}
      ${sessions.length ? sessions.map(session=>{
        const needsDay= session.entries.some(en=>exerciseFor(en.id)?.knee && E.workSets(en).length) && session.kneeNextDay == null;
        const canAssess=Date.now()-new Date(session.timestamp).getTime()>=86400000;
        return `<article class="card history-card"><div class="card-row"><div><strong class="session-date">${esc(planFor(session.planId).title)}</strong><p class="small muted mt-8">${dateBR(session.day)} · ${session.entries.length} exercícios · ${esc(session.energy||'Esforço não informado')}</p></div>${tag(`Bloco ${session.planId}`,'green')}</div>
        <ul class="mini-list">${session.entries.map(en=>{
          const ex=exerciseFor(en.id), top=E.topSet(en);
          return `<li><div><strong>${esc(ex?.name||en.id)}</strong><br><span>${E.workSets(en).length} séries efetivas${en.pain!=null?' · dor joelho '+en.pain+'/5+':''}</span></div><div class="text-right"><strong>${top?`${fmt(top.load)} ${esc(ex?.unit||'kg')}`:'—'}</strong><br><span>${top?`${top.reps} rep.`:''}</span></div></li>`;
        }).join('')}</ul>
        ${session.notes?`<p class="small muted">Observações: ${esc(session.notes)}</p>`:''}
        ${needsDay?(canAssess?`<div class="callout warn"><strong>Como ficou o joelho no dia seguinte?</strong><div class="field-row mt-8"><div class="field"><label for="after-${esc(session.id)}">Dor após 24 h</label><select id="after-${esc(session.id)}" data-after-day="${esc(session.id)}">${painOptions('')}</select></div><div style="display:flex;align-items:end"><button class="secondary full" data-action="save-knee" data-id="${esc(session.id)}">Salvar</button></div></div></div>`:
          `<p class="small muted mt-12">Amanhã, informe se houve dor ou rigidez no joelho antes de progredir cargas de pernas.</p>`):
          session.kneeNextDay!=null?`<p class="small muted mt-12">Joelho no dia seguinte: ${session.kneeNextDay}/5+</p>`:''}
        </article>`;
      }).join(''):`<div class="empty"><span class="empty-icon" aria-hidden="true">↗</span>Nenhum treino registrado ainda.<br>Inicie um bloco para criar seu primeiro histórico.</div>`}
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
    if(el.dataset.draftMeta) {ui.draft[el.dataset.draftMeta]=el.value;return;}
    if(el.dataset.exPain && ui.draft.entries[el.dataset.exPain]) {
      ui.draft.entries[el.dataset.exPain].pain=el.value;return;
    }
    if(el.dataset.ex && el.dataset.field && el.dataset.index !== undefined) {
      const row=ui.draft.entries[el.dataset.ex]?.sets[Number(el.dataset.index)];
      if(row) row[el.dataset.field]=el.value;
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
      energy:ui.draft.energy,notes:ui.draft.notes.trim().slice(0,1000)});
    const discomfort=result.some(en=>en.pain!==null && en.pain>0);
    ui.draft=null;ui.tab='history';save();render();window.scrollTo(0,0);
    notify(discomfort?'Treino salvo. Como houve desconforto no joelho, não aumente a carga.':'Treino salvo. Histórico e sugestões atualizados.');
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
      if(!confirm('Importar este backup substitui os registros salvos neste aparelho. Continuar?')) return;
      state=parsed;ui.editor=null;ui.draft=null;ui.tab='home';save();render();notify('Backup importado com sucesso.');
    }catch(err){notify('Não foi possível importar: verifique se é um backup FORJA válido.');}
    document.getElementById('import-file').value='';
  }
  function handleAction(btn) {
    const action=btn.dataset.action;
    if(action==='navigate') {ui.tab=btn.dataset.to;ui.editor=null;render();window.scrollTo(0,0);}
    else if(action==='select-plan') {ui.plan=btn.dataset.plan;render();}
    else if(action==='start') startWorkout(btn.dataset.plan);
    else if(action==='add-set') {const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length<12){en.sets.push({load:'',reps:'',rir:'',warmup:false});render();}}
    else if(action==='remove-set'){const en=ui.draft?.entries[btn.dataset.ex];if(en && en.sets.length>1){en.sets.pop();render();}}
    else if(action==='toggle-warmup'){const set=ui.draft?.entries[btn.dataset.ex]?.sets[Number(btn.dataset.index)];if(set){set.warmup=!set.warmup;render();}}
    else if(action==='apply-reco'){
      const ex=exerciseFor(btn.dataset.ex), en=ui.draft?.entries[btn.dataset.ex], rec=E.recommend(ex,state.sessions);
      if(en&&rec.level==='increase'){
        const work=en.sets.filter(s=>!s.warmup);const heaviest=work.reduce((best,s)=> Number(s.load)>=Number(best?.load??-1)?s:best,null);
        if(heaviest) {heaviest.load=rec.next;render();notify('Carga sugerida aplicada à série mais pesada. Ajuste conforme sua execução.');}
      }
    }
    else if(action==='finish')finishWorkout();
    else if(action==='cancel'){if(confirm('Descartar o treino não salvo?')){ui.draft=null;render();}}
    else if(action==='edit-ex'){ui.editor={id:btn.dataset.ex};render();window.scrollTo(0,0);}
    else if(action==='add-ex'){ui.editor={id:null,group:btn.dataset.plan};render();window.scrollTo(0,0);}
    else if(action==='exit-editor'){ui.editor=null;render();}
    else if(action==='save-knee')saveKnee(btn.dataset.id);
    else if(action==='export-json')exportJSON();
    else if(action==='export-csv')exportCSV();
    else if(action==='import-json')document.getElementById('import-file').click();
    else if(action==='reset'){
      if(confirm('Apagar permanentemente todos os registros deste aparelho? Exporte um backup antes de continuar.')){
        state=initial();ui.draft=null;ui.editor=null;ui.tab='home';save();render();notify('Registros locais redefinidos.');
      }
    }
  }
  document.getElementById('nav').addEventListener('click',event=>{
    const btn=event.target.closest('[data-tab]');if(!btn)return;
    if(ui.draft && !confirm('Você possui um treino em andamento. Sair descarta os dados não salvos. Continuar?'))return;
    ui.draft=null;ui.editor=null;ui.tab=btn.dataset.tab;render();window.scrollTo(0,0);
  });
  const screen=document.getElementById('screen');
  screen.addEventListener('click',event=>{
    const btn=event.target.closest('[data-action]');if(btn)handleAction(btn);
  });
  screen.addEventListener('input',collectDraft);
  screen.addEventListener('change',event=>{
    collectDraft(event);
    const el=event.target;
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
