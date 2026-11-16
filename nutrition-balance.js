/* FORJA optional seven-day energy balance. Not a diet prescription.
 * See docs/energy-balance.md. No automatic change of user targets or diary.
 */
(function installEnergyBalance(root) {
  'use strict';
  const N = root.ForjaNutrition || (typeof require === 'function' ? require('./nutrition.js') : null);
  const G = root.ForjaNutritionGoals || (typeof require === 'function' ? require('./nutrition-goals.js') : null);
  const KEY_NUTRIENTS = ['energyKcal', 'proteinG', 'carbsG', 'fatG'];
  const MIN_REVIEWED_DAYS = 3; // product safety heuristic, NOT a clinical threshold
  const MAX_DAILY_REDUCTION_KCAL = 200; // configurable product ceiling, NOT evidence-based prescription
  const WINDOW_DAYS = 7;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

  function shift(day, offset) {
    if (!N.dateOk(day) || !Number.isInteger(offset) || Math.abs(offset) > 366) return null;
    const d = new Date(day + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(from, to) {
    if (!N.dateOk(from) || !N.dateOk(to)) return null;
    return Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
  }
  function mealsFor(nutrition, day) {
    return (nutrition?.entries || []).filter(e => e.date === day);
  }
  // A change detector, not a cryptographic signature. No personal entries leave the device.
  function fingerprint(nutrition, day) {
    const str = JSON.stringify(mealsFor(nutrition, day).slice().sort((a, b) =>
      a.id.localeCompare(b.id)));
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0') + '-' + str.length;
  }
  const config = nutrition => nutrition?.balance || { reviewedDays: [], plan: null };
  function exerciseOn(state, day) {
    return (state?.sessions || []).some(x => (x.day || x.date || x.timestamp?.slice(0, 10)) === day) ||
      (state?.muay?.sessions || []).some(x => (x.day || x.date || x.timestamp?.slice(0, 10)) === day);
  }
  function quality(nutrition, day) {
    const meals = mealsFor(nutrition, day);
    if (!meals.length) return {complete: false, reason: 'Sem refeições registradas.'};
    const observed = N.observedTotals(meals, day);
    if (KEY_NUTRIENTS.some(k => observed.totals[k] === null)) {
      return {complete: false, reason: 'Há nutrientes ausentes ou estimativas; o saldo não é seguro para ajustes.'};
    }
    return {complete: true, energyKcal: observed.totals.energyKcal,
      proteinG: observed.totals.proteinG, items: observed.itemsRecorded};
  }
  function reviewed(nutrition, day) {
    const record = config(nutrition).reviewedDays?.find(x => x.date === day);
    return !!record && record.fingerprint === fingerprint(nutrition, day) &&
      quality(nutrition, day).complete;
  }
  function markReviewed(nutrition, day, currentDay) {
    if (!N.dateOk(day) || !N.dateOk(currentDay) || day >= currentDay)
      return {error: 'Confira um dia já encerrado, anterior a hoje.'};
    const check = quality(nutrition, day);
    if (!check.complete) return {error: check.reason};
    const previous = config(nutrition);
    const reviewedDays = (previous.reviewedDays || []).filter(x => x.date !== day);
    reviewedDays.push({date: day, reviewedAt: currentDay, fingerprint: fingerprint(nutrition, day)});
    return {balance: {...previous, reviewedDays: reviewedDays.sort((a,b)=>a.date.localeCompare(b.date))}};
  }
  function unmarkReviewed(nutrition, day) {
    const previous = config(nutrition);
    return {balance: {...previous, reviewedDays: (previous.reviewedDays || []).filter(x => x.date !== day)}};
  }
  function matchesPlan(nutrition, state, plan) {
    if (!plan) return false;
    if (JSON.stringify(nutrition.settings.profile || null) !== JSON.stringify(plan.profile)) return false;
    if (!plan.sources.every(s => reviewed(nutrition, s.date) &&
       s.fingerprint === fingerprint(nutrition, s.date) &&
       G.active(nutrition.settings, s.date)?.id === plan.targetId)) return false;
    if (plan.baseValues.some((n, i) => n !== [G.active(nutrition.settings, plan.acceptedAt)?.values.energyKcal,
      G.active(nutrition.settings, plan.acceptedAt)?.values.proteinG,
      G.active(nutrition.settings, plan.acceptedAt)?.values.carbsG,
      G.active(nutrition.settings, plan.acceptedAt)?.values.fatG,
      G.active(nutrition.settings, plan.acceptedAt)?.values.fiberG][i])) return false;
    return true;
  }
  function planForDay(nutrition, state, day) {
    const plan = config(nutrition).plan;
    if (!plan || !N.dateOk(day) || !matchesPlan(nutrition, state, plan) ||
        exerciseOn(state, day)) return null;
    const adjustment = plan.days.find(x => x.date === day);
    const base = G.active(nutrition.settings, day);
    if (!adjustment || !base || base.source === 'professional' || base.id !== plan.targetId ||
        base.values.energyKcal !== plan.baseValues[0]) return null;
    const values = {...base.values,
      energyKcal: round(base.values.energyKcal - adjustment.reductionKcal),
      carbsG: round(base.values.carbsG - adjustment.reductionKcal / 4)};
    if (values.energyKcal <= 0 || values.carbsG <= 0) return null;
    return {date: day, values, baseValues: base.values, reductionKcal: adjustment.reductionKcal};
  }
  function assessment(nutrition, state, currentDay) {
    if (!N.dateOk(currentDay)) return {status: 'blocked', reason: 'Data inválida.', days: []};
    const base = G.active(nutrition.settings, currentDay);
    const days = Array.from({length: WINDOW_DAYS}, (_, i) => {
      const date = shift(currentDay, i - WINDOW_DAYS);
      const checked = reviewed(nutrition, date);
      const target = G.active(nutrition.settings, date);
      const facts = quality(nutrition, date);
      return {date, checked, quality: facts.complete,
        energyKcal: facts.complete ? facts.energyKcal : null,
        proteinG: facts.complete ? facts.proteinG : null,
        targetProteinG: target?.values.proteinG ?? null,
        targetKcal: target?.values.energyKcal ?? null,
        compatible: !!base && target?.id === base.id,
        deltaKcal: checked && facts.complete && target?.values.energyKcal != null ?
          round(facts.energyKcal - target.values.energyKcal) : null};
    });
    const validDays = days.filter(d => d.checked && d.compatible && d.deltaKcal !== null);
    const balanceKcal = round(validDays.reduce((sum, d) => sum + d.deltaKcal, 0));
    const summary = {days, reviewedCount: days.filter(d => d.checked).length,
      usableCount: validDays.length, balanceKcal, base, maintenanceKcal: null};
    const blocked = reason => ({...summary, status:'blocked', reason});
    if (!base || !Number.isFinite(base.values?.energyKcal))
      return blocked('Configure uma meta energética antes de avaliar a semana.');
    if (base.source === 'professional')
      return blocked('Metas profissionais não recebem ajustes sugeridos pelo FORJA.');
    const profile = nutrition.settings.profile;
    const estimate = G.estimate(profile);
    if (estimate.error || !['loss','recomposition'].includes(profile.goal))
      return blocked('Ajustes exigem perfil adulto confirmado em perda de gordura ou recomposição; outras metas permanecem intactas.');
    summary.maintenanceKcal = estimate.maintenance;
    if (KEY_NUTRIENTS.some(k => !Number.isFinite(base.values[k]) || base.values[k] <= 0) ||
        !Number.isFinite(base.values.fiberG) || base.values.fiberG <= 0)
      return blocked('Preencha energia, proteína, carboidratos, gorduras e fibras na meta.');
    const macroDiff = G.difference(base.values);
    if (macroDiff === null || Math.abs(macroDiff) > 80)
      return blocked('As calorias e os macronutrientes configurados não estão coerentes; revise a meta antes de ajustar.');
    const cutFloor = Math.max(base.values.carbsG * 0.85, profile.weightKg * 2);
    const safeCut = Math.floor(Math.min(MAX_DAILY_REDUCTION_KCAL,
      base.values.energyKcal * 0.08,
      (base.values.carbsG - cutFloor) * 4,
      base.values.energyKcal - estimate.resting));
    summary.maxDailyReductionKcal = Math.max(0, safeCut);
    if (summary.maxDailyReductionKcal < 40)
      return blocked('A meta atual não oferece margem conservadora para reduzir carboidratos e manter a recuperação.');
    const stored = config(nutrition);
    if (stored.ignoredUntil && stored.ignoredUntil >= currentDay)
      return {...summary,status:'paused',reason:'Você optou por continuar a meta normal neste período.'};
    if (stored.plan && daysBetween(stored.plan.acceptedAt, currentDay) >= 0 &&
        daysBetween(stored.plan.acceptedAt, currentDay) <= WINDOW_DAYS) {
      return {...summary,status:'plan',activePlan:matchesPlan(nutrition,state,stored.plan) ?
        stored.plan : null, reason:matchesPlan(nutrition,state,stored.plan) ?
        'Ajuste temporário já aprovado. Não vamos gerar outra compensação para os mesmos dias.' :
        'Plano anterior suspenso porque refeições ou metas mudaram; não será reaplicado automaticamente.'};
    }
    if (validDays.length < MIN_REVIEWED_DAYS)
      return blocked('Confirme ao menos três dias anteriores completos e com nutrientes conhecidos. Dias ausentes não contam como zero.');
    if (validDays.some(d => d.proteinG < d.targetProteinG * 0.85))
      return blocked('A proteína registrada em pelo menos um dia confirmado ficou abaixo de 85% da meta. Priorize alimentação e recuperação, sem propor cortes.');
    if (balanceKcal < 150)
      return {...summary, status:'steady', reason:'O saldo dos dias conferidos não indica necessidade de compensação.'};
    if (!validDays.some(d => d.energyKcal > estimate.maintenance + 100))
      return {...summary, status:'steady', reason:'O consumo ultrapassou a meta, mas não a manutenção estimada de forma relevante; mantenha o plano.'};
    const candidates = Array.from({length: 7},(_,i)=>shift(currentDay,i))
      .filter(d=>!exerciseOn(state,d));
    if (!candidates.length)
      return blocked('Todos os próximos dias têm treino registrado; priorize energia e recuperação.');
    return {...summary,status:'ready',reason:'Há um saldo positivo parcial; você pode distribuir um ajuste leve em dias escolhidos como leves ou de descanso.',
      candidates, sourceDays: validDays.map(d=>({date:d.date,fingerprint:fingerprint(nutrition,d.date)}))};
  }
  function makePlan(nutrition, state, currentDay, selectedDates, makeId) {
    const report = assessment(nutrition, state, currentDay);
    if (report.status !== 'ready') return {error: report.reason};
    if (!Array.isArray(selectedDates) || selectedDates.length < 1 || selectedDates.length > 5 ||
        new Set(selectedDates).size !== selectedDates.length ||
        selectedDates.some(d=>!report.candidates.includes(d)))
      return {error:'Selecione de 1 a 5 dias leves, sem treinos registrados, nos próximos sete dias.'};
    const reduction = Math.min(report.maxDailyReductionKcal,
      Math.floor(report.balanceKcal / selectedDates.length));
    if (reduction < 40) return {error:'O ajuste por dia ficaria muito pequeno; continue suas metas normais.'};
    const plan = {
      id:makeId('balance'), acceptedAt:currentDay,targetId:report.base.id,
      profile:JSON.parse(JSON.stringify(nutrition.settings.profile)),
      baseValues: G.KEYS.map(k=>report.base.values[k]),
      sources: report.sourceDays,
      days:selectedDates.slice().sort().map(date=>({date,reductionKcal:reduction}))
    };
    return {plan,totalReductionKcal:reduction*selectedDates.length,
      outstandingKcal:Math.max(0,round(report.balanceKcal - reduction*selectedDates.length))};
  }
  const api = {WINDOW_DAYS,MIN_REVIEWED_DAYS,shift,fingerprint,quality,reviewed,markReviewed,
    unmarkReviewed,exerciseOn,matchesPlan,planForDay,assessment,makePlan};
  root.ForjaEnergyBalance = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
