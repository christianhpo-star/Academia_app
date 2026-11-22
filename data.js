/* Plano inicial personalizavel. Nenhuma carga de exemplo e tratada como historico. */
(function (root) {
  'use strict';
  const ex = (id, name, group, sets, low, high, step, extras = {}) => ({
    id, name, group, sets, low, high, step, unit: 'kg', mode: 'double',
    knee: false, active: true, ...extras,
  });
  const exercises = [
    // A — costas e biceps
    ex('pulley-aberto', 'Pulley frente · pegada aberta', 'A', 3, 10, 12, 5),
    ex('pulley-fechado', 'Pulley frente · pegada fechada', 'A', 3, 10, 12, 5, { active: false }),
    ex('remada-baixa', 'Remada baixa', 'A', 3, 10, 12, 5),
    ex('remada-cavalinho', 'Remada cavalinho', 'A', 3, 8, 12, 5),
    ex('rosca-w', 'Rosca direta · barra W', 'A', 3, 10, 12, 2.5),
    ex('rosca-martelo', 'Rosca martelo', 'A', 3, 10, 12, 2.5, { unit: 'kg/halter' }),
    ex('rosca-inversa', 'Rosca inversa', 'A', 2, 10, 12, 2.5, { active: false }),
    ex('abdominal-solo', 'Abdominal no solo (crunch)', 'A', 2, 10, 15, 1, {
      mode: 'bodyweight', bodyweight: true, complement: 'abdomen',
      equipment: 'Solo / colchonete', muscle: 'Abdômen',
      aliases: ['abdominal', 'crunch', 'reto abdominal', 'core', 'peso do corpo'],
    }),
    // B — peito, triceps e ombros
    ex('supino-halteres', 'Supino reto com halteres', 'B', 4, 10, 12, 2.5, {
      mode: 'pyramid', unit: 'kg/halter',
      example: [
        { load: 20, reps: '', rir: '', warmup: true },
        { load: 22.5, reps: '', rir: '', warmup: false },
        { load: 25, reps: '', rir: '', warmup: false },
        { load: 25, reps: '', rir: '', warmup: false },
      ],
    }),
    ex('supino-barra', 'Supino reto com barra', 'B', 3, 6, 10, 2.5, { active: false }),
    ex('supino-inclinado', 'Supino inclinado com halteres', 'B', 4, 8, 12, 2.5, {
      unit: 'kg/halter',
      // Cargas aproximadas relatadas; nao sao series concluidas.
      example: [20, 22.5, 22.5, 22.5].map(load => ({load, reps:'', rir:'', warmup:false})),
    }),
    ex('voador', 'Voador (peck deck)', 'B', 4, 10, 15, 5, {
      example: [55, 55, 55, 55].map(load => ({load, reps:'', rir:'', warmup:false})),
    }),
    ex('elevacao-lateral', 'Elevação lateral', 'B', 3, 12, 15, 2.5, { unit: 'kg/halter' }),
    ex('triceps-testa', 'Tríceps testa na polia', 'B', 4, 10, 12, 2.5, {
      example: [50, 55, 60, 60].map(load => ({load, reps:'', rir:'', warmup:false})),
    }),
    ex('triceps-corda', 'Tríceps corda', 'B', 3, 10, 15, 2.5),
    ex('triceps-maquina', 'Tríceps na máquina', 'B', 3, 10, 12, 5, { active: false }),
    ex('remada-alta', 'Remada alta', 'B', 3, 10, 12, 2.5, { active: false }),
    ex('abdominal-inverso', 'Abdominal inverso', 'B', 2, 10, 15, 1, {
      mode: 'bodyweight', bodyweight: true, complement: 'abdomen',
      equipment: 'Solo / colchonete', muscle: 'Abdômen',
      aliases: ['abdominal', 'reverse crunch', 'elevação do quadril', 'core', 'peso do corpo'],
    }),
    // C — quadriceps
    ex('agachamento-hack', 'Agachamento hack / máquina', 'C', 3, 8, 12, 5, { knee: true }),
    ex('agachamento-livre', 'Agachamento livre', 'C', 3, 8, 12, 2.5, { knee: true, active: false }),
    ex('bulgaro', 'Búlgaro com halteres', 'C', 3, 8, 12, 2.5, { knee: true, unit: 'kg/halter' }),
    ex('leg-press', 'Leg press', 'C', 3, 10, 12, 5, { knee: true }),
    ex('extensora', 'Cadeira extensora', 'C', 2, 10, 15, 5, { knee: true }),
    ex('flexora-c', 'Mesa flexora', 'C', 2, 10, 15, 5),
    ex('panturrilha-leg', 'Panturrilha no leg press', 'C', 3, 12, 20, 5),
    // D — posterior e gluteos
    ex('stiff', 'Stiff / terra romeno', 'D', 3, 8, 10, 2.5),
    ex('flexora-d', 'Mesa ou cadeira flexora', 'D', 3, 10, 15, 5),
    ex('elevacao-pelvica', 'Elevação pélvica', 'D', 3, 8, 12, 5),
    ex('sumo-maquina', 'Sumô na máquina', 'D', 3, 10, 15, 5),
    ex('abdutora', 'Cadeira abdutora', 'D', 2, 12, 20, 5),
    ex('panturrilha-banco', 'Panturrilha sentada/em pé', 'D', 3, 12, 20, 5),
    ex('extensora-d', 'Cadeira extensora (alternativa)', 'D', 3, 10, 12, 5, { knee: true, active: false }),
  ];
  const plans = [
    { id: 'A', title: 'Costas + bíceps', subtitle: 'Puxadas, remadas e complemento de abdômen', type: 'upper' },
    { id: 'C', title: 'Quadríceps', subtitle: 'Pernas com atenção ao joelho', type: 'lower' },
    { id: 'B', title: 'Peito + tríceps', subtitle: 'Supinos, ombros e complemento de abdômen', type: 'upper' },
    { id: 'D', title: 'Posteriores + glúteos', subtitle: 'Cadeia posterior e estabilidade', type: 'lower' },
  ];
  // One additive upgrade for existing installations. Existing IDs (including
  // disabled or personalized versions), saved sessions and drafts stay intact.
  function ensureAbdomen(value) {
    if (!value || value.abdomenDefaultsVersion >= 1 || !Array.isArray(value.exercises)) return false;
    const existing = new Set(value.exercises.map(item => item.id));
    const missing = exercises.filter(item => item.complement === 'abdomen' && !existing.has(item.id));
    if (value.exercises.length + missing.length > 200) return false;
    value.exercises.push(...missing.map(item => JSON.parse(JSON.stringify(item))));
    value.abdomenDefaultsVersion = 1;
    return true;
  }
  root.AcademiaData = { plans, exercises, rotation: ['A', 'C', 'B', 'D'], ensureAbdomen };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AcademiaData;
})(typeof globalThis !== 'undefined' ? globalThis : this);
