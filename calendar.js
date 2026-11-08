(function installCalendar(root) {
  'use strict';
  const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const LONG_WEEKDAYS = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  function validMonth(month) {
    return typeof month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
      Number(month.slice(0,4)) >= 1900 && Number(month.slice(0,4)) <= 9999;
  }
  function validDay(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !validMonth(day.slice(0,7))) return false;
    const date = new Date(day + 'T12:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
  }
  function shiftMonth(month, direction) {
    if (!validMonth(month) || !Number.isInteger(direction) || Math.abs(direction) !== 1) return month;
    const date = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5,7))-1 + direction, 1));
    const year = date.getUTCFullYear();
    return year < 1900 || year > 9999 ? month : year + '-' + String(date.getUTCMonth()+1).padStart(2,'0');
  }
  const fullDate = day => `${Number(day.slice(8,10))} de ${MONTHS[Number(day.slice(5,7))-1]} de ${day.slice(0,4)}`;
  function collect(strengthSessions, muaySessions, month) {
    const byDay = Object.create(null);
    let strengthCount=0, muayCount=0;
    function add(sessions, kind) {
      if (!Array.isArray(sessions)) return;
      for (const session of sessions) {
        if (!session || !validDay(session.day) || session.day.slice(0,7) !== month) continue;
        (byDay[session.day] ||= []).push({ kind, session });
        if (kind === 'strength') strengthCount++; else muayCount++;
      }
    }
    add(strengthSessions,'strength');
    add(muaySessions,'muay');
    const days = Object.keys(byDay).sort();
    for (const day of days) byDay[day].sort((a,b) => String(a.session.timestamp||'').localeCompare(String(b.session.timestamp||'')));
    return {byDay,days,daysActive:days.length,strengthCount,muayCount,total:strengthCount+muayCount};
  }
  function detailsForDay(day, activities, plans, exercises) {
    const heading = `<h3 class="calendar-detail-heading" id="calendar-selected-heading">${esc(fullDate(day))}</h3>`;
    if (!activities?.length) {
      return `<div class="calendar-selected" aria-live="polite">${heading}<p class="small muted">Nenhum treino concluído nesta data.</p></div>`;
    }
    const planLabels = Object.fromEntries((Array.isArray(plans)?plans:[]).map(p=>[p.id,p.title]));
    const exerciseLabels = Object.fromEntries((Array.isArray(exercises)?exercises:[]).map(e=>[e.id,e.name]));
    return `<div class="calendar-selected" aria-live="polite">${heading}<p class="small muted">${activities.length} ${activities.length===1?'sessão salva':'sessões salvas'} neste dia</p>` +
      activities.map(({kind,session})=>{
        const strength = kind==='strength';
        const title = strength
          ? 'Bloco '+String(session.planId||'?')+' · '+String(planLabels[session.planId]||'Musculação')
          : session.kind==='aula'?'Aula de Muay Thai':'Muay Thai individual';
        const label = strength ? 'Musculação' : 'Muay Thai';
        const names = strength
          ? (Array.isArray(session.entries)?session.entries:[]).map(en=>String(exerciseLabels[en.id]||en.id))
          : (Array.isArray(session.activities)?session.activities:[]).map(a=>String(a.name));
        const location = !strength ? (session.place==='casa'?'Em casa':session.place==='academia'?'Na academia':'Outro local') : '';
        const parts = strength ? [session.energy||'Esforço não informado'] : [
          location,session.duration == null ? '' : session.duration+' min',
          session.intensity == null ? '' : 'Esforço '+session.intensity+'/10',
        ];
        return `<article class="calendar-session calendar-session--${kind}">
          <div class="calendar-session-heading"><span class="calendar-modality calendar-modality--${kind}">${label}</span><strong>${esc(title)}</strong></div>
          <p class="small muted">${esc(parts.filter(Boolean).join(' · '))}</p>
          ${names.length ? `<details class="calendar-exercise-list"><summary>Ver ${names.length} ${names.length===1?'exercício':'exercícios'}</summary><ul>${names.map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:''}
        </article>`;
      }).join('')+'</div>';
  }
  function render({strengthSessions=[],muaySessions=[],month,selectedDay=null,today='',plans=[],exercises=[]}={}) {
    const currentMonth = validMonth(today.slice(0,7)) ? today.slice(0,7) : '2026-01';
    const chosen = validMonth(month) ? month : currentMonth;
    const overview = collect(strengthSessions,muaySessions,chosen);
    const day = validDay(selectedDay) && selectedDay.slice(0,7) === chosen ? selectedDay :
      (chosen===currentMonth && validDay(today) ? today : overview.days.at(-1) || null);
    const year=Number(chosen.slice(0,4)), monthN=Number(chosen.slice(5,7));
    const daysCount = new Date(Date.UTC(year,monthN,0)).getUTCDate();
    const offset = (new Date(Date.UTC(year,monthN-1,1)).getUTCDay()+6)%7;
    const cells = Array.from({length:offset},()=>'<span class="calendar-blank" aria-hidden="true"></span>');
    for(let n=1;n<=daysCount;n++){
      const date = chosen+'-'+String(n).padStart(2,'0');
      const sessions=overview.byDay[date]||[];
      const gym=sessions.filter(s=>s.kind==='strength').length;
      const muay=sessions.length-gym;
      const weekday=LONG_WEEKDAYS[new Date(Date.UTC(year,monthN-1,n)).getUTCDay()];
      const amount = sessions.length ? `${sessions.length} ${sessions.length===1?'treino salvo':'treinos salvos'}: ${gym} de musculação, ${muay} de Muay Thai` : 'sem treinos salvos';
      const classes = ['calendar-day',sessions.length?'has-activity':'',date===today?'is-today':'',day===date?'is-selected':''].filter(Boolean).join(' ');
      cells.push(`<button type="button" class="${classes}" data-action="calendar-select" data-day="${date}" aria-label="${weekday}, ${esc(fullDate(date))}: ${amount}" aria-pressed="${date===day}">
        <span class="calendar-day-number">${n}</span><span class="calendar-day-marks" aria-hidden="true">
        ${gym?'<i class="calendar-dot calendar-dot--strength"></i>':''}${muay?'<i class="calendar-dot calendar-dot--muay"></i>':''}
        ${sessions.length>1?`<small>${sessions.length}</small>`:''}</span></button>`);
    }
    const thisMonth=chosen===currentMonth;
    return `<section class="card training-calendar" id="training-calendar" aria-labelledby="calendar-title">
      <div class="calendar-intro"><h2 id="calendar-title" class="section-title">Calendário de treinos</h2>
      <p class="small muted">Atividades concluídas e salvas neste aparelho. Dias sem registro não são considerados descanso.</p></div>
      <div class="calendar-toolbar">
        <button type="button" class="calendar-nav" data-action="calendar-shift" data-delta="-1" aria-label="Mês anterior">‹</button>
        <strong class="calendar-month" aria-live="polite">${MONTHS[monthN-1]} de ${year}</strong>
        <button type="button" class="calendar-nav" data-action="calendar-shift" data-delta="1" aria-label="Próximo mês">›</button>
        ${!thisMonth?'<button type="button" class="calendar-today" data-action="calendar-today">Mês atual</button>':''}
      </div>
      <div class="calendar-stats" aria-label="Resumo do mês">
        <div><strong>${overview.daysActive}</strong><span>dias ativos</span></div>
        <div><strong>${overview.strengthCount}</strong><span>musculação</span></div>
        <div><strong>${overview.muayCount}</strong><span>Muay Thai</span></div>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">${WEEKDAYS.map(w=>`<span>${w}</span>`).join('')}</div>
      <div class="calendar-days">${cells.join('')}</div>
      <div class="calendar-legend"><span><i class="calendar-dot calendar-dot--strength"></i>Musculação</span>
        <span><i class="calendar-dot calendar-dot--muay"></i>Muay Thai</span></div>
      ${overview.total===0?'<p class="calendar-empty-note">Nenhum treino salvo neste mês.</p>':''}
      ${day ? detailsForDay(day,overview.byDay[day]||[],plans,exercises) :
        '<p class="small muted calendar-empty-note">Selecione uma data para consultar seus treinos.</p>'}
    </section>`;
  }
  root.ForjaCalendar = {validMonth,validDay,shiftMonth,collect,render};
  if (typeof module!=='undefined' && module.exports) module.exports=root.ForjaCalendar;
})(typeof globalThis !== 'undefined' ? globalThis : this);
