/* Optional cardio alongside a saved strength workout. Minutes are reported by
 * the user; they never become calories, exercise intensity or muscle sets. */
(function installCardio(root) {
  'use strict';
  const TYPES = Object.freeze([
    {id: 'esteira', label: 'Esteira'},
    {id: 'escada', label: 'Escada'},
    {id: 'bicicleta', label: 'Bicicleta'},
    {id: 'eliptico', label: 'Elíptico'},
    {id: 'outro', label: 'Outro cardio'},
  ].map(Object.freeze));
  const STAIR_SPEED_UNITS = Object.freeze([
    {id: 'steps_min', label: 'Degraus/min'},
    {id: 'machine_level', label: 'Nível da máquina'},
  ].map(Object.freeze));
  const known = new Map(TYPES.map(type => [type.id, type.label]));
  const label = type => known.get(type) || 'Cardio';
  const total = entries => Number(entries.reduce((sum, entry) => sum + entry.minutes, 0).toFixed(10));
  function duration(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return 0;
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    const text = typeof value === 'string' ? value.trim().replace(',', '.') : value;
    if (typeof text === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const minutes = Number(text);
    return Number.isFinite(minutes) && minutes >= 0 && minutes <= 300 ? minutes : null;
  }
  // The machine level is a proprietary setting, never an equivalent cadence.
  // Average pace is optional; we do not infer it from minutes or level.
  function stairPace(row) {
    if (row?.type !== 'escada') return {ok:true};
    const raw = row.avgSpeed;
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) return {ok:true};
    const unit = row.speedUnit == null || row.speedUnit === '' ? 'steps_min' : row.speedUnit;
    if (!STAIR_SPEED_UNITS.some(option => option.id === unit)) return {ok:false};
    const speed = duration(raw);
    if (speed === null || speed <= 0 || speed > (unit === 'machine_level' ? 99 : 240)) return {ok:false};
    return {ok:true, avgSpeed:speed, speedUnit:unit};
  }
  // Distance is the treadmill's displayed distance in kilometres, not GPS.
  // Save only the observed distance and time; average speed is derived.
  function treadmillMetrics(row) {
    if (row?.type !== 'esteira') return {ok:true};
    const raw=row.distanceKm;
    if (raw == null || (typeof raw==='string' && raw.trim()==='')) return {ok:true};
    const distanceKm=duration(raw),minutes=duration(row.minutes);
    if (distanceKm===null || distanceKm<=0) return {ok:false,error:'Informe a distância da esteira em km, maior que zero (até 300 km), ou deixe em branco.'};
    if (minutes===null || minutes<=0) return {ok:false,error:'Informe o tempo positivo de esteira para calcular a velocidade média.'};
    const speedKmh=distanceKm*60/minutes;
    if (!Number.isFinite(speedKmh)||speedKmh>40) return {ok:false,error:'Confira a distância em quilômetros e o tempo em minutos: velocidade média acima de 40 km/h.'};
    return {ok:true,distanceKm,speedKmh};
  }
  const format=(value,digits=2)=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:digits});
  function paceLabel(row) {
    if(row?.type==='esteira'){
      const metrics=treadmillMetrics(row);
      return metrics.ok&&metrics.distanceKm!=null?format(metrics.distanceKm,3)+' km · '+format(metrics.speedKmh)+' km/h':'';
    }
    const pace = stairPace(row);
    if (!pace.ok || pace.avgSpeed == null) return '';
    const speed = Number(pace.avgSpeed).toLocaleString('pt-BR', {maximumFractionDigits:2});
    return pace.speedUnit === 'machine_level' ? 'nível ' + speed + ' (máquina)' : speed + ' degraus/min';
  }
  function validRow(row) {
    return row && typeof row === 'object' && !Array.isArray(row) && known.has(row.type);
  }
  function invalid(error) {
    return {ok: false, entries: [], totalMinutes: 0, error};
  }
  function parse(rows) {
    if (rows == null) return {ok: true, entries: [], totalMinutes: 0};
    if (!Array.isArray(rows)) return invalid('Revise os registros de cardio.');
    if (rows.length > TYPES.length) return invalid('Registre no máximo um item de cada tipo de cardio.');
    const entries = [], seen = new Set();
    for (const row of rows) {
      if (!validRow(row)) return invalid('Escolha um tipo de cardio disponível.');
      if (seen.has(row.type)) return invalid('Some os minutos de ' + label(row.type) + ' em um único registro.');
      seen.add(row.type);
      const minutes = duration(row.minutes);
      if (minutes === null) return invalid('Informe os minutos de ' + label(row.type) + ' entre 0 e 300.');
      const pace = stairPace(row);
      if (!pace.ok) return invalid('Confira a velocidade média da escada: 1 a 240 degraus/min ou nível 1 a 99.');
      if (minutes === 0 && pace.avgSpeed != null) return invalid('Informe o tempo de escada para registrar o ritmo médio.');
      const treadmill=treadmillMetrics(row);
      if (!treadmill.ok) return invalid(treadmill.error);
      if (minutes > 0) entries.push({type: row.type, minutes,
        ...(pace.avgSpeed != null ? {avgSpeed:pace.avgSpeed, speedUnit:pace.speedUnit} : {}),
        ...(treadmill.distanceKm!=null?{distanceKm:treadmill.distanceKm}:{})});
    }
    return {ok: true, entries, totalMinutes: total(entries)};
  }
  function summarize(rows) {
    const entries = [], seen = new Set();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!validRow(row) || seen.has(row.type)) continue;
      const minutes = duration(row.minutes);
      if (minutes === null || minutes <= 0) continue;
      seen.add(row.type);
      const pace = stairPace(row),treadmill=treadmillMetrics(row);
      entries.push({type: row.type, minutes,
        ...(pace.ok && pace.avgSpeed != null ? {avgSpeed:pace.avgSpeed, speedUnit:pace.speedUnit} : {}),
        ...(treadmill.ok && treadmill.distanceKm!=null?{distanceKm:treadmill.distanceKm}:{})});
    }
    return {entries, totalMinutes: total(entries)};
  }
  // Free sessions may be entirely cardio. Keep them distinct from strength
  // without introducing a new storage schema or changing existing records.
  const isStandalone = session => session?.planId==='FREE' && Array.isArray(session.entries) &&
    session.entries.length===0 && summarize(session.cardio).totalMinutes>0;
  // Read-only aggregation. Missing distance is unknown; weighted speed uses
  // only durations paired with an observed distance. Multiple sessions on one
  // date contribute to that day's total, never to an artificial average of speeds.
  function treadmillHistory(sessions,endDay,days=30){
    const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
    const length=[7,30,90].includes(Number(days))?Number(days):30;
    const from=validDay(endDay)?new Date(Date.parse(endDay+'T12:00:00Z')-(length-1)*86400000).toISOString().slice(0,10):null;
    const byDay=new Map(),seen=new Set();
    let sessionCount=0,knownSessions=0,totalMinutes=0,knownMinutes=0,totalDistance=0;
    for(const session of Array.isArray(sessions)?sessions:[]){
      if(!from||!validDay(session?.day)||session.day<from||session.day>endDay)continue;
      if(typeof session.id==='string'&&seen.has(session.id))continue;
      const treadmill=summarize(session.cardio).entries.find(row=>row.type==='esteira');
      if(!treadmill)continue;
      if(typeof session.id==='string')seen.add(session.id);
      const current=byDay.get(session.day)||{day:session.day,sessionCount:0,knownSessions:0,minutes:0,knownMinutes:0,distanceKm:null};
      current.sessionCount++;sessionCount++;current.minutes+=treadmill.minutes;totalMinutes+=treadmill.minutes;
      if(treadmill.distanceKm!=null){
        current.knownSessions++;knownSessions++;
        current.knownMinutes+=treadmill.minutes;knownMinutes+=treadmill.minutes;
        current.distanceKm=(current.distanceKm??0)+treadmill.distanceKm;totalDistance+=treadmill.distanceKm;
      }
      byDay.set(session.day,current);
    }
    const rows=[...byDay.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(row=>({...row,
      speedKmh:row.knownMinutes>0?row.distanceKm*60/row.knownMinutes:null}));
    return {from,endDay,days:length,rows,sessionCount,knownSessions,totalMinutes,knownMinutes,
      distanceKm:knownSessions?totalDistance:null,speedKmh:knownMinutes?totalDistance*60/knownMinutes:null};
  }
  const api = Object.freeze({TYPES, STAIR_SPEED_UNITS, parse, summarize, label, paceLabel, isStandalone,treadmillMetrics,treadmillHistory});
  root.ForjaCardio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
