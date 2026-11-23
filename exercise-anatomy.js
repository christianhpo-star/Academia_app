/* FORJA muscle guides. Original 2D educational sketches, no copied third-party artwork.
   Muscle participation is approximate: technique, grip, apparatus, range and anatomy
   alter emphasis. Offline vector artwork: no downloads, timers or history writes. */
(function installExerciseAnatomy(root){
  'use strict';
  const fam = {

    shrug:{view:'back',main:['upperTraps'],assist:[],
      primary:'Trapézio superior',secondary:'',
      cue:'Eleve as escápulas com os braços estáveis, sem girar os ombros; desça de modo controlado.'},
    yRaise:{view:'back',main:['midTraps'],assist:['rearDelts'],
      primary:'Musculatura escapular (trapézio)',secondary:'Deltoide posterior',
      cue:'Eleve os braços em Y com cargas leves e sem arquear a lombar. O mapa não distingue trapézio inferior e médio com precisão.'},
    frontRaise:{view:'front',main:['frontDelts'],assist:[],
      primary:'Deltoide anterior',secondary:'',
      cue:'Eleve os braços à frente em amplitude confortável, sem embalar a carga.'},
    reverseFly:{view:'back',main:['rearDelts'],assist:['midTraps','rhomboids'],
      primary:'Deltoide posterior',secondary:'Trapézio médio e romboides',
      cue:'Afaste os braços com controle e evite elevar os ombros.'},
    facePull:{view:'back',main:['rearDelts'],assist:['midTraps','rhomboids'],
      primary:'Deltoide posterior',secondary:'Trapézio médio e músculos entre as escápulas',
      cue:'Puxe na direção do rosto sem perder o controle das escápulas.'},
    latPull:{view:'back',main:['lats'],assist:['biceps','midTraps'],
      primary:'Latíssimo do dorso',secondary:'Bíceps e musculatura escapular',
      cue:'Conduza os cotovelos para baixo, evitando impulsos com o tronco.'},
    row:{view:'back',main:['lats','rhomboids','midTraps'],assist:['biceps'],
      primary:'Costas (dorsais e região média)',secondary:'Flexores do cotovelo',
      cue:'Puxe os cotovelos para trás com a coluna estável e sem balanço.'},
    pullover:{view:'back',main:['lats'],assist:[],
      primary:'Latíssimo do dorso',secondary:'',
      cue:'Mantenha o tronco estável e mova os braços sem impulsionar.'},
    curl:{view:'front',main:['biceps'],assist:['forearms'],
      primary:'Flexores do cotovelo',secondary:'Músculos do antebraço',
      cue:'Mantenha os cotovelos próximos do tronco, sem embalar a carga.'},
    hammerCurl:{view:'front',main:['biceps','forearms'],assist:[],
      primary:'Braquial, braquiorradial e bíceps',secondary:'',
      cue:'Use pegada neutra e controle a descida.'},
    reverseCurl:{view:'front',main:['forearms'],assist:['biceps'],
      primary:'Braquiorradial e extensores do punho',secondary:'Outros flexores do cotovelo',
      cue:'Mantenha o punho alinhado e evite compensar com o tronco.'},
    chestPress:{view:'front',main:['chest'],assist:['frontDelts','triceps'],
      primary:'Peitoral maior',secondary:'Deltoide anterior e tríceps',
      cue:'Controle a descida e mantenha ombros estáveis.'},
    chestFly:{view:'front',main:['chest'],assist:['frontDelts'],
      primary:'Peitoral maior',secondary:'Deltoide anterior',
      cue:'Aproxime os braços com controle, sem forçar a amplitude do ombro.'},
    lateralRaise:{view:'front',main:['sideDelts'],assist:['upperTraps'],
      primary:'Deltoide lateral',secondary:'Trapézio superior',
      cue:'Eleve os braços com controle, sem encolher os ombros.'},
    shoulderPress:{view:'front',main:['frontDelts','sideDelts'],assist:['triceps'],
      primary:'Deltoides anterior e lateral',secondary:'Tríceps',
      cue:'Empurre acima da cabeça sem arquear excessivamente as costas.'},
    triceps:{view:'back',main:['triceps'],assist:[],
      primary:'Tríceps braquial',secondary:'',
      cue:'Estabilize o braço e estenda o cotovelo sem impulsionar o tronco.'},
    uprightRow:{view:'front',main:['sideDelts'],assist:['upperTraps'],
      primary:'Deltoide lateral',secondary:'Trapézio superior',
      cue:'Mantenha uma amplitude confortável, sem forçar os ombros.'},
    crunch:{view:'front',main:['abs'],assist:['obliques'],
      primary:'Reto do abdômen',secondary:'Oblíquos',
      cue:'Com os joelhos flexionados e os pés apoiados, aproxime as costelas da pelve elevando pouco as escápulas. Não puxe o pescoço e desça com controle.'},
    reverseCrunch:{view:'front',main:['abs'],assist:['obliques'],
      primary:'Reto do abdômen',secondary:'Oblíquos',
      cue:'Deitado, mantenha os joelhos flexionados e eleve um pouco a pelve em direção às costelas. Retorne devagar, sem embalar as pernas.'},
    cableCrunch:{view:'front',main:['abs'],assist:['obliques'],
      primary:'Reto do abdômen',secondary:'Oblíquos',
      cue:'Segure a corda próxima à cabeça e aproxime as costelas da pelve, com movimento controlado do tronco. Evite puxar só com os braços ou deslocar o quadril.'},
    // Primary/auxiliary roles summarize the movement; they are not measured
    // activation percentages. Deeper stabilizers are not assigned extra sets.
    bicycleCrunch:{view:'front',main:['abs','obliques'],assist:[],
      primary:'Reto do abdômen e oblíquos',secondary:'',
      cue:'Alterne o tronco e o joelho contrários sem puxar a cabeça, em movimento controlado.'},
    deadBug:{view:'front',main:['abs'],assist:['obliques'],
      primary:'Reto do abdômen',secondary:'Oblíquos (estabilização)',
      cue:'Mantenha o tronco estável e alterne braço e perna contrários sem arquear a lombar.'},
    hangingKnee:{view:'front',main:['abs'],assist:[],
      primary:'Reto do abdômen',secondary:'',
      cue:'Eleve os joelhos com controle e leve a pelve levemente em direção às costelas, evitando embalar o tronco.'},
    cableRotation:{view:'front',main:['obliques'],assist:['abs'],
      primary:'Oblíquos',secondary:'Reto do abdômen (estabilização)',
      cue:'Gire o tronco em amplitude confortável, controlando a volta e sem puxões com os braços.'},
    sideBend:{view:'front',main:['obliques'],assist:['abs'],
      primary:'Oblíquos',secondary:'Reto do abdômen (estabilização)',
      cue:'Faça uma flexão lateral controlada com o quadril estável e repita do outro lado.'},
    backExtension:{body:'lower',view:'back',main:['glutes','hamstrings'],assist:[],
      primary:'Glúteos e posteriores da coxa',secondary:'Extensores da coluna auxiliam, mas a região lombar ainda não é quantificada no mapa.',
      cue:'Movimente o quadril com a coluna neutra. Não hiperestenda as costas nem acrescente carga sem controle.'},
    lateralLunge:{body:'lower',view:'back',main:['hipAbductors','glutes'],assist:['quadriceps'],
      primary:'Abdutores do quadril e glúteos',secondary:'Quadríceps',
      cue:'Dê um passo lateral em amplitude confortável, mantendo o pé estável e evitando forçar o joelho.'},
    pallofPress:{view:'front',main:['obliques'],assist:['abs'],
      primary:'Oblíquos',secondary:'Reto do abdômen',
      cue:'De lado para a polia na altura do peito, estenda e recolha os braços sem girar o tronco. Faça os dois lados: uma série reúne as repetições de cada lado.'},
    squat:{body:'lower',view:'front',main:['quadriceps'],assist:['glutes'],
      primary:'Quadríceps',secondary:'Glúteo máximo',
      cue:'Mantenha os pés apoiados e conduza os joelhos na direção dos pés, em uma amplitude confortável.'},
    kneeExtension:{body:'lower',view:'front',main:['quadriceps'],assist:[],
      primary:'Quadríceps',secondary:'',
      cue:'Ajuste o apoio ao aparelho e estenda os joelhos com controle, sem impulsionar a carga.'},
    kneeFlexion:{body:'lower',view:'back',main:['hamstrings'],assist:[],
      primary:'Posteriores da coxa (isquiotibiais)',secondary:'',
      cue:'Alinhe os joelhos ao eixo do aparelho e flexione com controle, mantendo o quadril estável.'},
    hipHinge:{body:'lower',view:'back',main:['hamstrings'],assist:['glutes'],
      primary:'Posteriores da coxa (isquiotibiais)',secondary:'Glúteo máximo',
      cue:'Leve o quadril para trás com os joelhos levemente flexionados, mantendo a carga próxima do corpo.'},
    hipExtension:{body:'lower',view:'back',main:['glutes'],assist:[],
      primary:'Glúteo máximo',secondary:'',
      cue:'Estenda o quadril com controle, sem compensar o movimento arqueando a região lombar.'},
    pullThrough:{body:'lower',view:'back',main:['glutes'],assist:['hamstrings'],
      primary:'Glúteo máximo',secondary:'Posteriores da coxa',
      cue:'Leve o quadril para trás e retorne estendendo-o, sem puxar a carga com os braços.'},
    sumo:{body:'lower',view:'back',main:['glutes'],assist:['quadriceps','adductors'],
      primary:'Glúteo máximo',secondary:'Quadríceps e adutores',
      cue:'Movimento composto: a participação varia com a execução e o aparelho. Siga o trajeto orientado da máquina.'},
    hipAbduction:{body:'lower',view:'back',main:['hipAbductors'],assist:[],
      primary:'Abdutores do quadril (região lateral)',secondary:'',
      cue:'Afaste a coxa com controle, mantendo o quadril estável e evitando balanços do tronco.'},
    hipAdduction:{body:'lower',view:'front',main:['adductors'],assist:[],
      primary:'Adutores da coxa',secondary:'',
      cue:'Aproxime a coxa da linha central do corpo com controle, sem impulsionar a carga.'},
    calfRaise:{body:'lower',view:'back',main:['calves'],assist:[],
      primary:'Panturrilhas (gastrocnêmio e sóleo)',secondary:'',
      cue:'Eleve e abaixe os calcanhares com controle. A posição dos joelhos altera a ênfase entre os músculos.'}
  };
  const maps={};
  const assign=(type,ids)=>ids.split(' ').forEach(id=>{maps[id]=type;});
  assign('reverseFly','voador-inverso crucifixo-inverso-halter crucifixo-inverso-polia crucifixo-inverso-banco');
  assign('shrug','encolhimento-halteres encolhimento-barra encolhimento-smith');
  assign('yRaise','elevacao-y-inclinada');
  assign('frontRaise','elevacao-frontal-polia');
  assign('facePull','face-pull face-pull-alto');
  assign('latPull','pulley-aberto pulley-fechado puxada-neutra puxada-unilateral-polia');
  assign('row','remada-baixa remada-cavalinho remada-unilateral-halter remada-articulada remada-peito-apoiado');
  assign('pullover','pullover-polia');
  assign('curl','rosca-w rosca-scott rosca-inclinada-halter rosca-polia-baixa');
  assign('hammerCurl','rosca-martelo');
  assign('reverseCurl','rosca-inversa');
  assign('chestPress','supino-halteres supino-barra supino-inclinado supino-maquina supino-canadense supino-inclinado-maquina');
  assign('chestFly','voador crucifixo-cabo crossover-polia crucifixo-inclinado-halter');
  assign('lateralRaise','elevacao-lateral elevacao-lateral-polia elevacao-lateral-maquina');
  assign('shoulderPress','desenvolvimento-halter desenvolvimento-maquina desenvolvimento-barra');
  assign('triceps','triceps-testa triceps-corda triceps-maquina triceps-frances triceps-unilateral-polia triceps-coice-halter');
  assign('uprightRow','remada-alta remada-alta-polia');
  assign('crunch','abdominal-solo');
  assign('reverseCrunch','abdominal-inverso');
  assign('cableCrunch','abdominal-polia');
  assign('pallofPress','pallof-press');
  assign('bicycleCrunch','abdominal-bicicleta');
  assign('deadBug','dead-bug');
  assign('hangingKnee','elevacao-joelhos-suspenso');
  assign('cableRotation','woodchop-polia');
  assign('sideBend','flexao-lateral-polia');
  assign('backExtension','extensao-lombar-45');
  assign('lateralLunge','passada-lateral-halter');
  assign('squat','agachamento-hack agachamento-livre agachamento-goblet agachamento-smith leg-press leg-press-horizontal bulgaro passada-reversa step-up-baixo');
  assign('kneeExtension','extensora extensora-d extensora-unilateral');
  assign('kneeFlexion','flexora-c flexora-d flexora-sentada flexora-unilateral flexora-em-pe');
  assign('hipHinge','stiff terra-romeno-halter');
  assign('hipExtension','elevacao-pelvica gluteo-cabo ponte-gluteo hip-thrust-maquina');
  assign('pullThrough','pull-through-polia');
  assign('sumo','sumo-maquina agachamento-sumo-halter');
  assign('hipAbduction','abdutora abducao-polia');
  assign('hipAdduction','cadeira-adutora aducao-polia');
  assign('calfRaise','panturrilha-leg panturrilha-banco panturrilha-em-pe panturrilha-unilateral-pe panturrilha-smith panturrilha-sentada-maquina');

  // Original schematic torso, authored as paired vector regions. The two views
  // deliberately omit hidden muscles instead of moving them to the visible side.
  // Deep regions (for example rhomboids) are indicated by approximate location;
  // these shapes are not an atlas or a measurement of muscle activation.
  const pair=d=>[{d},{d,mirror:true}];
  const front={
    chest:pair('M126 103 C117 99 106 98 97 101 L87 114 C87 124 84 132 87 141 C98 151 115 154 128 147 L128 108 Q128 104 126 103 Z'),
    frontDelts:pair('M78 98 C87 98 95 103 99 110 Q92 121 88 134 L78 144 C72 138 71 132 73 121 Q74 107 78 98 Z'),
    sideDelts:pair('M70 99 C59 102 53 114 54 130 Q54 143 60 151 C67 145 72 135 74 125 C77 114 77 105 70 99 Z'),
    upperTraps:pair('M115 75 C112 84 102 89 89 93 L104 98 L123 95 L121 89 Z'),
    biceps:pair('M60 151 Q69 149 74 143 C73 159 70 177 64 187 Q58 195 52 187 C48 180 50 168 54 159 Z'),
    forearms:pair('M46 196 C51 192 58 192 62 198 C63 213 54 232 46 249 L34 253 C35 239 40 214 46 196 Z'),
    abs:[
      ...pair('M112 158 Q121 155 128 158 L128 176 L112 175 Q109 168 112 158 Z'),
      ...pair('M112 180 L128 181 L128 200 L112 199 Q109 190 112 180 Z'),
      ...pair('M112 204 L128 205 L128 226 Q117 225 112 217 Z'),
      ...pair('M114 231 L128 232 L128 254 Q118 249 114 240 Z')
    ],
    obliques:[
      ...pair('M91 155 L104 162 L107 181 L98 196 Q93 177 91 155 Z'),
      ...pair('M99 202 L108 188 L109 231 L119 262 L98 242 Q102 224 99 202 Z')
    ]
  };
  const back={
    upperTraps:pair('M117 75 Q111 86 93 93 L85 99 L110 108 L128 101 L128 88 Z'),
    rearDelts:pair('M77 99 C87 99 96 104 101 113 L88 132 L77 144 Q65 133 68 117 C68 109 72 104 77 99 Z'),
    sideDelts:pair('M70 99 C59 102 53 114 54 130 Q54 143 60 151 C67 145 72 135 74 125 C77 114 77 105 70 99 Z'),
    midTraps:pair('M91 104 Q106 110 128 105 L128 123 L112 127 L99 119 Z'),
    rhomboids:pair('M113 130 L128 127 L128 161 Q118 155 109 144 Z'),
    lats:pair('M86 141 Q98 148 109 147 L123 178 L121 231 L105 250 Q98 228 95 205 C90 187 87 164 86 141 Z'),
    triceps:pair('M59 151 Q69 150 75 141 C75 157 71 176 65 189 L58 194 Q48 189 49 179 C49 168 54 157 59 151 Z'),
    forearms:pair('M45 196 C51 193 58 195 62 199 C62 214 53 234 46 249 L34 253 C35 238 39 214 45 196 Z')
  };
  // Original lower-body drawings use a waist-to-feet crop. Separate outlines
  // show the anterior thigh, medial adductors and posterior chain in their own
  // views. Deep muscles are represented by the group's region, not a cutaway.
  const lowerFront={
    quadriceps:[
      ...pair('M96 87 C88 103 84 122 83 144 Q82 170 88 190 L96 203 Q101 187 103 166 L108 121 L108 96 Z'),
      ...pair('M83 86 C71 94 66 117 65 139 Q66 163 76 187 L85 196 C80 170 79 145 83 121 L91 94 Z'),
      ...pair('M111 141 C108 159 108 174 102 186 L98 204 Q107 209 114 197 C119 183 116 162 111 141 Z')
    ],
    adductors:pair('M112 72 L126 98 L121 126 C118 145 116 158 114 176 L109 168 L110 133 L106 99 Z')
  };
  const lowerBack={
    glutes:pair('M92 52 Q107 51 127 69 L127 104 Q120 121 103 122 C84 123 72 113 70 99 Q71 74 92 52 Z'),
    hipAbductors:pair('M83 36 Q97 38 113 48 L123 58 L124 66 Q104 53 92 57 C81 65 76 77 72 91 L68 87 Q70 58 83 36 Z'),
    hamstrings:[
      ...pair('M73 121 Q84 128 96 128 C98 151 91 177 88 195 L80 209 C70 191 65 170 65 148 Z'),
      ...pair('M101 128 Q114 128 122 116 L120 157 Q116 183 113 207 L102 211 L95 195 C99 173 104 151 101 128 Z')
    ],
    calves:[
      ...pair('M80 231 C71 238 66 254 69 272 Q72 288 81 297 C88 289 92 270 92 250 L88 234 Z'),
      ...pair('M97 232 Q108 231 112 242 C118 258 113 280 105 296 Q95 291 93 276 L94 247 Z'),
      ...pair('M69 278 C73 291 79 302 87 305 L91 328 L96 328 L101 305 Q110 301 114 281 C113 310 103 327 101 340 L89 340 C88 321 76 309 69 278 Z')
    ]
  };
  const lowerBody='M87 12 Q130 20 173 12 L177 34 C188 50 195 74 195 98 C196 125 195 155 188 179 L182 211 C185 225 195 240 195 261 C196 286 182 313 176 339 L176 356 C179 365 190 370 198 375 Q204 384 192 386 L153 386 Q144 385 146 376 L151 359 L151 340 C151 316 143 292 142 268 C142 248 147 232 143 214 L137 176 L134 139 Q130 124 126 139 L123 176 L117 214 C113 232 118 248 118 268 C117 292 109 316 109 340 L109 359 L114 376 Q116 385 107 386 L68 386 Q56 384 62 375 C70 370 81 365 84 356 L84 339 C78 313 64 286 65 261 C65 240 75 225 78 211 L72 179 C65 155 64 125 65 98 C65 74 72 50 83 34 Z';
  const lowerNeutralFront=[
    ...pair('M82 215 Q96 209 111 216 L110 229 Q96 238 83 229 Z'),
    ...pair('M88 241 L94 243 C94 269 98 305 98 338 L91 343 C87 321 80 290 80 268 Z'),
    ...pair('M108 243 Q115 256 111 278 L103 320 L100 333 L99 292 L101 257 Z')
  ];
  const lowerNeutralBack=[
    ...pair('M88 345 L101 345 L103 365 L99 376 L87 376 L90 361 Z'),
    ...pair('M83 215 L96 224 L111 215 L111 227 L97 233 L83 227 Z')
  ];
  const areasFor=(item,view)=>item.body==='lower'
    ?(view==='back'?lowerBack:lowerFront):(view==='back'?back:front);
  const regionLabels={
    chest:'Peitoral maior',frontDelts:'Deltoide anterior',sideDelts:'Deltoide lateral',
    rearDelts:'Deltoide posterior',upperTraps:'Trapézio superior',midTraps:'Trapézio médio',
    rhomboids:'Romboides',lats:'Latíssimo do dorso',biceps:'Bíceps',
    triceps:'Tríceps',forearms:'Músculos do antebraço',abs:'Reto do abdômen',obliques:'Oblíquos',
    quadriceps:'Quadríceps',glutes:'Glúteo máximo',hamstrings:'Posteriores da coxa',
    hipAbductors:'Abdutores do quadril',adductors:'Adutores da coxa',
    calves:'Panturrilhas (gastrocnêmio e sóleo)'
  };
  const lumbar=[
    ...pair('M125 169 L128 177 L128 271 L121 282 L116 263 Q120 244 121 224 Z'),
    ...pair('M105 254 L117 265 L120 288 L96 279 Z')
  ];
  const torso='M116 63 C119 80 111 85 100 89 L80 94 C72 98 71 115 77 130 L85 153 Q87 183 94 209 C99 233 95 256 90 279 L88 306 Q130 319 172 306 L170 279 C165 256 161 233 166 209 Q173 183 175 153 L183 130 C189 115 188 98 180 94 L160 89 C149 85 141 80 144 63 Z';
  const arm='M81 94 C64 92 54 101 51 116 C48 131 48 147 44 164 L40 186 C37 194 35 203 35 212 L28 247 L23 262 C20 266 20 275 21 280 Q23 282 25 277 L28 269 L26 288 Q27 294 30 288 L33 274 L32 293 Q34 298 37 290 L40 275 L39 289 Q41 293 44 285 L48 268 Q50 262 47 255 L57 226 C63 212 66 204 64 193 C71 175 74 158 76 143 C84 131 89 118 85 105 Z';
  const head='M111 45 C106 38 108 19 115 12 Q130 4 145 12 C152 19 154 38 149 45 L146 59 Q140 72 130 73 Q120 72 114 59 Z';
  const safe=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const listLabel=names=>{
    const labels=names.map((name,index)=>{
      const label=regionLabels[name]||name;
      return index?label.charAt(0).toLowerCase()+label.slice(1):label;
    });
    return labels.length<2?labels.join(''):labels.slice(0,-1).join(', ')+' e '+labels[labels.length-1];
  };
  let figureSequence=0;
  function describe(id){
    const type=maps[id],item=type?fam[type]:null;
    return item?{id,type,...item}:null;
  }
  function viewInfo(id,viewOverride=null){
    const item=describe(id);if(!item)return null;
    const view=viewOverride==='front'||viewOverride==='back'?viewOverride:item.view;
    const area=areasFor(item,view);
    const visibleMain=item.main.filter(name=>Boolean(area[name]));
    const visibleAssist=item.assist.filter(name=>Boolean(area[name]));
    const hiddenMain=item.main.filter(name=>!area[name]);
    const hiddenAssist=item.assist.filter(name=>!area[name]);
    const hidden=[...hiddenMain,...hiddenAssist];
    const opposite=view==='back'?'Frente':'Costas';
    const note=!visibleMain.length&&!visibleAssist.length
      ?'Sem músculos destacados nesta vista. Veja '+opposite+'.'
      :hidden.length?listLabel(hidden)+' na vista '+opposite+'.':'';
    return {view,label:view==='back'?'Costas':'Frente',visibleMain,visibleAssist,hiddenMain,hiddenAssist,
      visiblePrimaryLabel:listLabel(visibleMain),visibleSecondaryLabel:listLabel(visibleAssist),note};
  }
  function legendNote(id,view,role='main'){
    const info=viewInfo(id,view);if(!info)return '';
    const hidden=role==='assist'?info.hiddenAssist:info.hiddenMain;
    const visible=role==='assist'?info.visibleAssist:info.visibleMain;
    if(!hidden.length)return '';
    return (visible.length?'Parte em ':'Veja em ')+(info.view==='back'?'Frente':'Costas');
  }
  const shape=(part,attrs='')=>'<path d="'+part.d+'"'+(part.mirror?' transform="translate(260 0) scale(-1 1)"':'')+attrs+'/>';
  function figure(id,thumbnail=false,viewOverride=null){
    const item=describe(id),info=viewInfo(id,viewOverride);if(!item||!info)return '';
    const uid='fa-'+(++figureSequence),titleId=uid+'-title',descId=uid+'-desc';
    const lower=item.body==='lower';
    const area=areasFor(item,info.view);
    const regions=(names,cls)=>names.map(name=>area[name].map(part=>shape(part,' class="'+cls+'" data-muscle="'+name+'"')).join('')).join('');
    const neutral=Object.keys(area).map(name=>area[name].map(part=>shape(part,' data-muscle="'+name+'"')).join('')).join('');
    const label=info.view==='back'?'Vista posterior':'Vista anterior';
    const desc=label+'. '+
      (info.visiblePrimaryLabel?'Principais visíveis: '+info.visiblePrimaryLabel+'. ':'')+
      (info.visibleSecondaryLabel?'Auxiliares visíveis: '+info.visibleSecondaryLabel+'. ':'')+
      (!info.visibleMain.length&&!info.visibleAssist.length?'Nenhum músculo destacado nesta vista. ':'')+
      'Localização ilustrativa, sem medir ativação muscular.';
    const fibres=lower?(info.view==='back'
      ?'M82 80 Q102 76 121 88 M79 90 Q99 86 121 99 M81 102 Q100 99 117 108 M80 133 L78 183 M87 135 L83 185 M109 138 L108 186 M115 133 L113 175 M78 246 L79 276 M84 244 L83 278 M103 244 L104 279'
      :'M98 100 L93 179 M103 104 L99 171 M77 106 L74 158 M82 101 L79 151 M110 160 L106 190 M116 95 L115 129')
      :info.view==='back'
      ?'M92 151 L120 216 M93 162 L116 226 M96 181 L112 236 M98 112 L125 113 M104 119 L125 119 M115 135 L125 141 M114 141 L125 149 M80 108 L78 133 M87 112 L81 131 M61 157 L58 181 M67 155 L63 181'
      :'M91 121 L123 107 M89 128 L124 118 M90 136 L124 129 M97 143 L124 140 M80 106 L78 133 M87 109 L81 130 M60 157 L56 180 M66 155 L62 181';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="ex-anatomy-svg" data-anatomy-figure-view="'+info.view+'" data-anatomy-body="'+(lower?'lower':'upper')+'" viewBox="'+(lower?'48 0 164 400':'0 0 260 320')+'" '+
      (thumbnail?'aria-hidden="true" focusable="false"':'role="img" aria-labelledby="'+titleId+' '+descId+'" focusable="false"')+'>'+
      (thumbnail?'':'<title id="'+titleId+'">Mapa muscular: '+label+'</title><desc id="'+descId+'">'+safe(desc)+'</desc>')+
      '<defs><linearGradient id="'+uid+'-skin" x1="0" x2="1" y1="0" y2=".4">'+
      '<stop offset="0" stop-color="#273D50"/><stop offset=".47" stop-color="#41596C"/><stop offset="1" stop-color="#263D50"/>'+
      '</linearGradient><linearGradient id="'+uid+'-head" x1="0" x2=".9" y1="0" y2="1">'+
      '<stop offset="0" stop-color="#415A6E"/><stop offset="1" stop-color="#263D50"/></linearGradient>'+
      '<pattern id="'+uid+'-assist" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">'+
      '<path d="M0 0 L0 6" stroke="#B6E5F8" stroke-width="1.2" opacity=".32"/></pattern></defs>'+
      '<g class="ex-anatomy-body" fill="url(#'+uid+'-skin)" stroke="#678296" stroke-width="1.1" stroke-linejoin="round">'+
      (lower?shape({d:lowerBody}):shape({d:arm})+shape({d:arm,mirror:true})+shape({d:torso})+
      '<path d="'+head+'" fill="url(#'+uid+'-head)"/>')+
      '</g>'+
      '<g class="ex-anatomy-neutral" fill="#263D50" stroke="#6A879C" stroke-width=".8" stroke-linejoin="round" opacity=".58">'+
      neutral+(lower?(info.view==='back'?lowerNeutralBack:lowerNeutralFront):(info.view==='back'?lumbar:[])).map(part=>shape(part)).join('')+'</g>'+
      '<g class="ex-anatomy-secondary">'+regions(info.visibleAssist,'secondary')+'</g>'+
      '<g class="ex-anatomy-assist-texture" fill="url(#'+uid+'-assist)" stroke="none" pointer-events="none" aria-hidden="true">'+
      info.visibleAssist.map(name=>area[name].map(part=>shape(part)).join('')).join('')+'</g>'+
      '<g class="ex-anatomy-primary">'+regions(info.visibleMain,'primary')+'</g>'+
      '<g class="ex-anatomy-fibres" fill="none" stroke="#C3DCEB" stroke-width=".7" stroke-linecap="round" opacity=".22" aria-hidden="true">'+
      '<path d="'+fibres+'"/><path d="'+fibres+'" transform="translate(260 0) scale(-1 1)"/></g>'+
      '<g class="ex-anatomy-contours" fill="none" stroke="#91ACBF" stroke-width=".9" stroke-linecap="round" opacity=".38" aria-hidden="true">'+
      (lower?(info.view==='back'
        ?'<path d="M87 28 Q130 38 173 28 M130 44 L130 105 M73 113 Q93 128 117 119 M187 113 Q167 128 143 119 M85 218 L96 225 L109 218 M175 218 L164 225 L151 218 M94 344 L95 370 M166 344 L165 370"/>'
        :'<path d="M87 28 Q130 37 173 28 M81 51 Q101 60 124 98 M179 51 Q159 60 136 98 M130 40 L130 70 M89 217 Q97 213 105 218 M171 217 Q163 213 155 218 M96 242 L103 339 M164 242 L157 339"/>')
        :info.view==='back'
        ?'<path d="M116 61 Q130 66 144 61 M130 78 L130 281 M101 113 Q99 132 107 144 M159 113 Q161 132 153 144 M96 279 Q111 282 121 293 M164 279 Q149 282 139 293"/>'
        :'<path d="M113 45 Q112 52 116 53 M147 45 Q148 52 144 53 M123 59 Q130 63 137 59 M115 77 L123 93 M145 77 L137 93 M104 98 Q119 96 127 102 M156 98 Q141 96 133 102 M130 108 L130 256 M129 233 L131 233 M97 270 Q117 278 130 297 Q143 278 163 270"/>')+
      (lower?'<path d="M88 351 L104 351 M172 351 L156 351 M74 376 L103 378 M186 376 L157 378"/>':'<path d="M45 192 L58 196 M215 192 L202 196 M35 252 L45 255 M225 252 L215 255 M91 299 Q130 310 169 299"/>')+'</g></svg>';
  }
  function viewer(id,viewOverride=null,context='workout'){
    const info=viewInfo(id,viewOverride);if(!info)return '';
    const canvasClass=context==='catalog'?'catalog-detail-figure':'ex-anatomy-large';
    return '<div class="ex-anatomy-viewer" data-anatomy-id="'+safe(id)+'" data-anatomy-view="'+info.view+'" data-anatomy-context="'+safe(context)+'">'+
      '<div class="ex-anatomy-view-header"><strong>Mapa muscular</strong>'+
      '<div class="ex-anatomy-view-switch" role="group" aria-label="Vista do mapa muscular">'+
      ['front','back'].map(view=>'<button type="button" class="ex-anatomy-view-button" data-action="anatomy-view" data-view="'+view+'" aria-pressed="'+(view===info.view?'true':'false')+'">'+(view==='front'?'Frente':'Costas')+'</button>').join('')+
      '</div></div><div class="ex-anatomy-canvas '+canvasClass+'">'+figure(id,false,info.view)+'</div>'+
      '<p class="ex-anatomy-view-note" role="status" aria-live="polite" aria-atomic="true">'+safe(info.note)+'</p></div>';
  }
  function panel(id,expanded=false,viewOverride=null){
    const item=describe(id),info=viewInfo(id,viewOverride);if(!item||!info)return '';
    const location=role=>{
      const note=legendNote(id,info.view,role);
      return '<small class="ex-anatomy-legend-location" data-anatomy-location="'+role+'"'+(note?'':' hidden')+'>'+safe(note)+'</small>';
    };
    return '<details class="ex-anatomy" data-anatomy="'+safe(item.id)+'"'+(expanded?' open':'')+'>'+
      '<summary class="ex-anatomy-summary">'+
      '<span class="ex-anatomy-thumb">'+figure(id,true,info.view)+'</span>'+
      '<span class="ex-anatomy-title"><strong>Músculos e execução</strong>'+
      '<small>'+safe(item.primary)+'</small></span>'+
      '<span class="ex-anatomy-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="ex-anatomy-expanded">'+viewer(id,info.view,'workout')+
      '<div class="ex-anatomy-info"><span class="ex-anatomy-legend"><span class="ex-anatomy-legend-head"><i class="ex-anatomy-swatch is-main"></i><b>Principal</b></span><span>'+safe(item.primary)+'</span>'+location('main')+'</span>'+
      (item.secondary?'<span class="ex-anatomy-legend"><span class="ex-anatomy-legend-head"><i class="ex-anatomy-swatch is-assist"></i><b>Auxiliares</b></span><span>'+safe(item.secondary)+'</span>'+location('assist')+'</span>':'')+
      '<p class="ex-anatomy-cue">'+safe(item.cue)+'</p>'+
      '<p class="ex-anatomy-disclaimer">Ilustração orientativa: a participação muscular varia com a execução, carga e equipamento.</p>'+
      '</div></div></details>';
  }
  const api={VERSION:4,describe,viewInfo,legendNote,figure,viewer,panel,coveredIds:Object.keys(maps)};
  root.ForjaExerciseAnatomy=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
