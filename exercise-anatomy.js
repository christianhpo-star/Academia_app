/* FORJA muscle guides. Original 2D educational sketches, no copied third-party artwork.
   Muscle participation is approximate: technique, grip, apparatus, range and anatomy
   alter emphasis. Static/offline: no image downloads, animations or history writes. */
(function installExerciseAnatomy(root){
  'use strict';
  const fam = {
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
      cue:'Mantenha uma amplitude confortável, sem forçar os ombros.'}
  };
  const maps={};
  const assign=(type,ids)=>ids.split(' ').forEach(id=>{maps[id]=type;});
  assign('reverseFly','voador-inverso crucifixo-inverso-halter crucifixo-inverso-polia');
  assign('facePull','face-pull');
  assign('latPull','pulley-aberto pulley-fechado puxada-neutra puxada-unilateral-polia');
  assign('row','remada-baixa remada-cavalinho remada-unilateral-halter remada-articulada remada-peito-apoiado');
  assign('pullover','pullover-polia');
  assign('curl','rosca-w rosca-scott rosca-inclinada-halter rosca-polia-baixa');
  assign('hammerCurl','rosca-martelo');
  assign('reverseCurl','rosca-inversa');
  assign('chestPress','supino-halteres supino-barra supino-inclinado supino-maquina supino-canadense supino-inclinado-maquina');
  assign('chestFly','voador crucifixo-cabo crossover-polia crucifixo-inclinado-halter');
  assign('lateralRaise','elevacao-lateral elevacao-lateral-polia');
  assign('shoulderPress','desenvolvimento-halter desenvolvimento-maquina');
  assign('triceps','triceps-testa triceps-corda triceps-maquina triceps-frances triceps-unilateral-polia triceps-coice-halter');
  assign('uprightRow','remada-alta');

  // Each anatomical region is authored once. Position is educational rather than
  // medical atlas precision; do not infer quantitative activation percentages.
  const back={
    rearDelts:[
      'M65 73 C73 66 84 74 89 85 L82 104 C74 102 66 95 62 84 Z',
      'M135 73 C127 66 116 74 111 85 L118 104 C126 102 134 95 138 84 Z'],
    midTraps:[
      'M91 73 L100 89 L93 125 L81 110 Z',
      'M109 73 L100 89 L107 125 L119 110 Z'],
    rhomboids:[
      'M92 107 L99 117 L98 139 L83 124 Z',
      'M108 107 L101 117 L102 139 L117 124 Z'],
    lats:[
      'M78 114 L91 124 L96 159 L82 181 Q70 153 72 132 Z',
      'M122 114 L109 124 L104 159 L118 181 Q130 153 128 132 Z'],
    triceps:[
      'M58 104 Q70 108 68 131 L53 153 L42 147 Q48 119 58 104 Z',
      'M142 104 Q130 108 132 131 L147 153 L158 147 Q152 119 142 104 Z'],
    biceps:[
      'M52 108 L64 119 L55 143 L43 139 Z',
      'M148 108 L136 119 L145 143 L157 139 Z']
  };
  const front={
    chest:[
      'M78 87 Q91 79 99 87 L99 126 Q87 124 77 117 Z',
      'M122 87 Q109 79 101 87 L101 126 Q113 124 123 117 Z'],
    frontDelts:[
      'M71 71 Q83 72 85 87 L79 107 L64 99 Q62 80 71 71 Z',
      'M129 71 Q117 72 115 87 L121 107 L136 99 Q138 80 129 71 Z'],
    sideDelts:[
      'M64 76 Q75 75 80 84 L74 111 L58 99 Z',
      'M136 76 Q125 75 120 84 L126 111 L142 99 Z'],
    upperTraps:[
      'M91 58 L100 74 L83 84 L75 70 Z',
      'M109 58 L100 74 L117 84 L125 70 Z'],
    biceps:[
      'M57 102 Q66 107 64 128 L52 150 L43 142 L49 119 Z',
      'M143 102 Q134 107 136 128 L148 150 L157 142 L151 119 Z'],
    forearms:[
      'M38 151 Q45 148 50 154 L38 180 L28 179 Z',
      'M162 151 Q155 148 150 154 L162 180 L172 179 Z'],
    triceps:[
      'M58 106 L68 114 L59 139 L46 140 Z',
      'M142 106 L132 114 L141 139 L154 140 Z']
  };
  const safe=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function describe(id){
    const type=maps[id],item=type?fam[type]:null;
    return item?{id,type,...item}:null;
  }
  function figure(id,thumbnail=false){
    const info=describe(id);if(!info)return '';
    const titleId='fa-title-'+info.id+'-'+(thumbnail?'mini':'full');
    const descId='fa-desc-'+info.id+'-'+(thumbnail?'mini':'full');
    const area=info.view==='back'?back:front;
    const regions=(names,cls)=>names.map(name=>(area[name]||[]).map(path=>
      '<path d="'+path+'" class="'+cls+'"/>').join('')).join('');
    const label=info.view==='back'?'Vista posterior':'Vista anterior';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="ex-anatomy-svg" viewBox="0 0 200 205" '+
      (thumbnail?'aria-hidden="true" focusable="false"':'role="img" aria-labelledby="'+titleId+' '+descId+'"')+'>'+
      (thumbnail?'':'<title id="'+titleId+'">Mapa muscular: '+safe(info.primary)+'</title>'+
        '<desc id="'+descId+'">'+safe(label)+'. Azul vivo: '+safe(info.primary)+
        (info.secondary?'. Azul suave: '+safe(info.secondary):'')+'. Destaque ilustrativo, sem medir ativação muscular.</desc>')+
      '<defs><linearGradient id="fa-skin-'+info.id+'-'+(thumbnail?'mini':'full')+'" x1="0" x2="1" y1="0" y2="1">'+
      '<stop offset="0" stop-color="#4B6276"/><stop offset=".65" stop-color="#293F50"/><stop offset="1" stop-color="#1B3142"/></linearGradient></defs>'+
      '<g class="ex-anatomy-body" fill="url(#fa-skin-'+info.id+'-'+(thumbnail?'mini':'full')+')" stroke="#668295" stroke-width="1.1" stroke-linejoin="round">'+
      '<path d="M84 61 Q79 61 71 69 Q62 67 56 77 C52 86 49 101 43 120 L28 167 Q22 183 33 187 Q43 189 49 175 L65 134 L71 145 L77 164 L76 182 Q86 190 100 191 Q114 190 124 182 L123 164 L129 145 L135 134 L151 175 Q157 189 167 187 Q178 183 172 167 L157 120 C151 101 148 86 144 77 Q138 67 129 69 Q121 61 116 61 Z"/>'+
      '<path d="M91 51 L91 66 Q100 73 109 66 L109 51 Z"/>'+
      '<ellipse cx="100" cy="32" rx="19" ry="24"/>'+
      '</g>'+
      '<g class="ex-anatomy-underlines" fill="none" stroke="#7C9BAE" opacity=".33" stroke-width="1.1">'+
      (info.view==='back'?
        '<path d="M100 66 L100 185 M76 94 L85 119 L99 134 M124 94 L115 119 L101 134 M78 125 Q87 141 93 157 M122 125 Q113 141 107 157"/>':
        '<path d="M100 84 L100 165 M78 113 Q100 128 122 113 M88 129 Q100 136 112 129 M92 140 L92 165 M108 140 L108 165"/>')+
      '<path d="M61 108 L45 153 M139 108 L155 153"/></g>'+
      '<g class="ex-anatomy-secondary">'+regions(info.assist,'secondary')+'</g>'+
      '<g class="ex-anatomy-primary">'+regions(info.main,'primary')+'</g>'+
      '<path d="M100 69 L100 184" stroke="#91A9B7" stroke-width=".7" stroke-dasharray="2 3" opacity="'+(info.view==='back'?'0.45':'0')+'"/>'+
      '</svg>';
  }
  function panel(id,expanded=false){
    const item=describe(id);if(!item)return '';
    return '<details class="ex-anatomy" data-anatomy="'+safe(item.id)+'"'+(expanded?' open':'')+'>'+
      '<summary class="ex-anatomy-summary">'+
      '<span class="ex-anatomy-thumb">'+figure(id,true)+'</span>'+
      '<span class="ex-anatomy-title"><strong>Músculos e execução</strong>'+
      '<small>'+safe(item.primary)+'</small></span>'+
      '<span class="ex-anatomy-chevron" aria-hidden="true">⌄</span></summary>'+
      '<div class="ex-anatomy-expanded">'+
      '<div class="ex-anatomy-large">'+figure(id,false)+'</div>'+
      '<div class="ex-anatomy-info"><span class="ex-anatomy-legend"><span class="ex-anatomy-legend-head"><i class="ex-anatomy-swatch is-main"></i><b>Principal</b></span><span>'+safe(item.primary)+'</span></span>'+
      (item.secondary?'<span class="ex-anatomy-legend"><span class="ex-anatomy-legend-head"><i class="ex-anatomy-swatch is-assist"></i><b>Auxiliares</b></span><span>'+safe(item.secondary)+'</span></span>':'')+
      '<p class="ex-anatomy-cue">'+safe(item.cue)+'</p>'+
      '<p class="ex-anatomy-disclaimer">Ilustração orientativa: a participação muscular varia com a execução, carga e equipamento.</p>'+
      '</div></div></details>';
  }
  const api={VERSION:1,describe,figure,panel,coveredIds:Object.keys(maps)};
  root.ForjaExerciseAnatomy=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
