/* Motor de progressao explicavel, conservador, sem diagnosticos ou prescricao medica. */
(function (root) {
  'use strict';
  const workSets = (entry) => (entry?.sets || []).filter(s => !s.warmup && Number(s.load) > 0 && Number(s.reps) > 0);
  const historyOf = (sessions, id) => [...(sessions || [])]
    .filter(s => (s.entries || []).some(e => e.id === id && workSets(e).length))
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .map(s => ({ session: s, entry: s.entries.find(e => e.id === id) }));
  const topSet = (entry) => workSets(entry).reduce((best, item) => {
    if (!best || Number(item.load) > Number(best.load) ||
      (Number(item.load) === Number(best.load) && Number(item.reps) > Number(best.reps))) return item;
    return best;
  }, null);
  const roundWeight = n => Math.round((n + Number.EPSILON) * 100) / 100;
  const cleanNumber = v => {
    if (typeof v === 'string') v = v.replace(',', '.');
    const n = Number(v);
    return v === '' || v === null || !Number.isFinite(n) ? null : n;
  };
  const formatWeight = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  function successful(item, ex) {
    const sets = workSets(item.entry);
    if (!sets.length) return false;
    const hasRir = sets.every(s => Number.isFinite(cleanNumber(s.rir)));
    if (!hasRir || sets.some(s => Number(s.rir) < 1)) return false;
    if (ex.mode === 'pyramid') {
      const top = topSet(item.entry);
      return !!top && Number(top.reps) >= ex.high && Number(top.rir) >= 2;
    }
    return sets.length >= Math.max(1, ex.sets - 1) &&
      sets.every(s => Number(s.reps) >= ex.high && Number(s.rir) >= 1);
  }
  function kneeSafe(item) {
    // Falta de relato explicito, mesmo com joelheira, nunca libera aumento automatico.
    return item.entry.pain === 0 && item.session.kneeNextDay === 0;
  }
  function recommend(ex, sessions) {
    const h = historyOf(sessions, ex.id);
    if (!h.length) return {
      level: 'start', title: 'Primeiro registro', last: null, next: null,
      explanation: ex.example
        ? 'As cargas exibidas são um modelo informado por você, não um treino salvo. Registre repetições e esforço reais.'
        : 'Registre sua primeira sessão: carga, repetições e repetições em reserva (RIR).',
    };
    const last = h[0];
    const lastTop = topSet(last.entry);
    const next = Number(lastTop.load);
    const lastText = `${formatWeight(next)} ${ex.unit} · ${lastTop.reps} rep. no topo`;
    const base = { last: lastText, next, lastSets: workSets(last.entry), lastDate: last.session.day };
    if (ex.knee && !kneeSafe(last)) {
      const notice = last.entry.pain === null || last.entry.pain === undefined
        ? 'Registre a dor no joelho durante o exercício (inclusive 0) antes de considerar subir.'
        : last.entry.pain > 0
          ? 'Houve desconforto no joelho: não aumente a carga; reavalie técnica, recuperação e sintomas.'
          : last.session.kneeNextDay === null || last.session.kneeNextDay === undefined
            ? 'Aguarde e registre como ficou o joelho no dia seguinte antes de aumentar.'
            : 'Houve sintoma no dia seguinte: mantenha ou reduza carga e procure avaliação se persistir.';
      return { ...base, level: 'protect', title: 'Não aumentar por enquanto', explanation: notice };
    }
    const qualified = successful(last, ex);
    if (!qualified) {
      const hasRir = workSets(last.entry).every(s => cleanNumber(s.rir) !== null);
      const plateau = h.length >= 3 && h.slice(0,3).every(item => {
        const top = topSet(item.entry); return top && Number(top.load) === next;
      }) && Number(lastTop.reps) <= Number(topSet(h[2].entry).reps);
      return {
        ...base, level: 'hold', title: plateau ? 'Reavalie o exercício' : 'Mantenha a carga',
        explanation: plateau
          ? 'Três registros sem avanço no topo: revise descanso, técnica e recuperação antes de trocar a variação. Não mude exercício automaticamente.'
          : hasRir
            ? `Primeiro consolide a faixa de ${ex.low}–${ex.high} repetições com técnica e 1–3 RIR.`
            : 'Registre o RIR em todas as séries efetivas para liberar recomendações mais confiáveis.',
      };
    }
    if (h.length < 2 || !successful(h[1], ex) || Number(topSet(h[1].entry).load) !== next ||
      (ex.knee && !kneeSafe(h[1]))) {
      return { ...base, level: 'confirm', title: 'Confirme mais uma sessão',
        explanation: 'Você atingiu a meta uma vez. Repita com boa técnica e recuperação antes de aumentar.' };
    }
    const candidate = roundWeight(next + Number(ex.step));
    return { ...base, level: 'increase', title: `Pode testar ${formatWeight(candidate)} ${ex.unit}`,
      next: candidate,
      explanation: `Duas sessões consecutivas no topo da faixa (${ex.high} rep.) com esforço controlado${ex.knee ? ' e sem sintomas relatados' : ''}. Aumente somente se a execução seguir boa; comece na parte baixa da faixa.` };
  }
  function nextWorkout(sessions, fatigue, kneePain, rotation = ['A', 'C', 'B', 'D']) {
    const last = [...(sessions || [])].sort((a,b)=>(b.timestamp || '').localeCompare(a.timestamp || ''))[0];
    const nextIndex = last && rotation.includes(last.planId) ? (rotation.indexOf(last.planId) + 1) % rotation.length : 0;
    let index = nextIndex;
    const legBlocked = fatigue === 'alta' || Number(kneePain) > 0;
    if (legBlocked && ['C','D'].includes(rotation[index])) {
      const upper = rotation.find((id, i) => i !== index && ['A','B'].includes(id) && id !== last?.planId);
      if (upper) return { id: upper, reason: 'Pernas sensíveis: antecipe superiores ou descanse; retome o bloco de pernas quando recuperar.', modified: true };
      return { id: rotation[index], reason: 'Priorize descanso se não houver grupo muscular recuperado.', modified: true };
    }
    return { id: rotation[index], reason: last ? 'Sequência alternada: superiores e inferiores.' : 'Comece pela sua divisão e ajuste conforme a recuperação.', modified: false };
  }
  function progress(weights, start, goal) {
    const latest = [...(weights || [])].sort((a,b)=> (b.date || '').localeCompare(a.date || ''))[0];
    const current = latest ? Number(latest.weight) : Number(start);
    const lost = Number(start) - current;
    const total = Number(start) - Number(goal);
    return { current, lost: roundWeight(lost), remaining: roundWeight(current - Number(goal)),
      percent: total > 0 ? Math.max(0, Math.min(100, Math.round(lost / total * 100))) : 0 };
  }
  const api = { workSets, historyOf, topSet, cleanNumber, formatWeight, successful, kneeSafe, recommend, nextWorkout, progress };
  root.AcademiaEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);