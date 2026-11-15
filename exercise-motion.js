(function installMotion(root, PROFILES, MEMBERS){
'use strict';
const JOINTS=['H','S','E','W','P','K','A','S2','E2','W2','P2','K2','A2'];
const EXERCISES=Object.fromEntries(Object.entries(MEMBERS).flatMap(([family,ids])=>ids.map(id=>[id,family])));
const TITLES={supino:'Supino',puxada:'Puxada alta',remada:'Remada',rosca:'Rosca de bíceps',lateral:'Elevação lateral',desenvolvimento:'Desenvolvimento de ombro',triceps:'Extensão de tríceps',agachamento:'Agachamento',legpress:'Leg press',hinge:'Terra romeno / stiff',ponte:'Elevação pélvica',afundo:'Afundo / passada',extensora:'Cadeira extensora',flexora:'Flexão de joelho',panturrilha:'Elevação de panturrilha',crucifixo:'Crucifixo / voador',abdutora:'Abertura de quadril',coice:'Extensão de quadril',soco:'Soco reto'};
const EQUIPMENT={
 supino:'<path d="M75 146H190M93 146V170M179 146V166" class="m-equipment"/>',
 puxada:'<path d="M113 41H250V193M113 41V88M152 146H206M169 145V181" class="m-equipment"/>',
 remada:'<path d="M150 147H227V155H150M277 103V171L300 180M288 102V161" class="m-equipment"/>',
 triceps:'<path d="M276 42V181M252 44H290M272 44L243 103" class="m-equipment"/>',
 legpress:'<path d="M60 105L139 169H192M259 63L295 123M251 86L281 101" class="m-equipment"/>',
 ponte:'<path d="M50 193H300M82 182H133" class="m-floor"/>',
 crucifixo:'<path d="M74 146H194M94 146V171M180 146V166" class="m-equipment"/>',
 extensora:'<path d="M129 139H206V153M168 142V190M122 137V98" class="m-equipment"/>',
 flexora:'<path d="M125 142H217M156 143V192M127 142V97" class="m-equipment"/>',
 abdutora:'<path d="M127 145H225M154 145V188M127 145V104" class="m-equipment"/>',
 coice:'<path d="M96 53V193M97 144L184 193" class="m-equipment"/>'
};
const CUES={
 supino:'Movimento de empurrar à frente do tórax. Banco e pegadas variam entre os tipos de supino.',
 puxada:'Padrão vertical de puxar. Pegada e trajetória dependem da variação utilizada.',
 remada:'Padrão horizontal de puxar. Equipamentos e apoio podem alterar a posição do tronco.',
 rosca:'Flexão de cotovelo para trabalhar os bíceps; o apoio e a pegada variam.',
 lateral:'Elevação dos braços para os lados. Ajuste a amplitude segundo a orientação recebida.',
 desenvolvimento:'Empurrar a carga acima da cabeça. A representação não mostra todos os detalhes de controle.',
 triceps:'Extensão de cotovelo. Tríceps testa e francês utilizam posições diferentes da polia.',
 agachamento:'Flexão e extensão de quadril e joelhos; amplitude não é personalizada.',
 legpress:'Empurrar o trenó com as pernas; a posição real depende do equipamento.',
 hinge:'Movimento com predominância de quadril; a postura é representada de modo simplificado.',
 ponte:'Elevar o quadril a partir do apoio; variações usam banco, solo ou carga.',
 afundo:'Flexão e extensão de pernas em posição assimétrica. Búlgaro, passada e step-up diferem.',
 extensora:'Extensão de joelho na máquina, representada esquematicamente.',
 flexora:'Flexão de joelho; máquina sentada e mesa flexora não têm a mesma posição.',
 panturrilha:'Flexão plantar do tornozelo. Versões sentadas e no leg press diferem.',
 crucifixo:'Aproximação dos braços; cabo, peck deck e halteres têm trajetórias diferentes.',
 abdutora:'Abertura de quadril. Para a cadeira adutora, o sentido é oposto (fechamento).',
 coice:'Extensão de quadril; polia e apoios variam.',
 soco:'Soco reto ilustrativo, sem substituir as orientações do treinador.'
};
// Per-exercise visual variants. Existing catalogue IDs and user data remain unchanged.
const VARIANT_FULL={"supino-inclinado":{"a":[89,68,121,96,158,100,165,91,175,147,216,163,236,189,117,102,119,88,123,86,168,152,219,169,243,191],"b":[89,68,121,96,160,65,165,44,175,147,216,163,236,189,117,102,119,65,123,44,168,152,219,169,243,191],"w":"wrist2"},"supino-canadense":{"a":[79,150,116,142,149,133,149,115,183,115,224,149,234,191,112,148,109,132,109,114,176,120,227,155,241,193],"b":[79,150,116,142,145,87,149,70,183,115,224,149,234,191,112,148,109,86,109,70,176,120,227,155,241,193],"w":"bar"},"supino-maquina":{"a":[167,52,174,80,209,104,225,98,170,132,214,148,216,189,163,80,197,108,215,104,163,132,199,149,198,190],"b":[167,52,174,80,236,94,265,94,170,132,214,148,216,189,163,80,223,101,252,99,163,132,199,149,198,190],"w":"none"},"flexora-c":{"a":[78,126,112,129,102,149,90,156,185,129,242,132,286,141,112,135,99,151,91,159,179,135,239,140,287,148],"b":[78,126,112,129,102,149,90,156,185,129,242,132,233,77,112,135,99,151,91,159,179,135,239,140,237,82],"w":"ankle"},"panturrilha-banco":{"a":[172,56,175,82,207,111,220,120,173,133,227,142,240,190,169,82,142,110,142,118,166,133,218,148,227,191],"b":[172,53,175,79,207,111,220,120,173,130,227,139,242,179,169,82,142,110,142,118,166,130,218,145,229,180],"w":"none"},"pullover-polia":{"a":[162,43,171,72,211,49,246,42,176,129,190,163,184,194,168,76,196,52,231,45,168,132,175,163,174,194],"b":[162,43,171,72,216,107,223,145,176,129,190,163,184,194,168,76,205,110,213,141,168,132,175,163,174,194],"w":"none"}};
const VARIANT_SPEC={"supino-inclinado":{"full":true},"supino-canadense":{"full":true},"supino-barra":{"w":"bar"},"supino-maquina":{"full":true},"flexora-c":{"full":true},"flexora-sentada":{},"flexora-d":{},"cadeira-adutora":{"reverse":true},"abdutora":{},"panturrilha-banco":{"full":true},"panturrilha-leg":{"base":"legpress","b":{"K":[227,112],"A":[262,84],"K2":[232,119],"A2":[264,91]}},"panturrilha-em-pe":{},"agachamento-hack":{},"bulgaro":{"a":{"K2":[149,165],"A2":[118,150]},"b":{"K2":[149,177],"A2":[118,150]},"w":"none"},"step-up-baixo":{"a":{"K":[216,140],"A":[235,160],"A2":[145,193]},"b":{"K":[226,147],"A":[235,160],"K2":[187,140],"A2":[201,160]},"w":"none"},"pulley-fechado":{"a":{"W":[161,55],"W2":[200,55]},"b":{"W":[160,105],"W2":[199,105]}},"puxada-neutra":{"a":{"W":[146,55],"W2":[216,55]},"b":{"W":[155,105],"W2":[207,105]}},"pullover-polia":{"full":true}};
const VARIANT_GEAR={"supino-inclinado":"M88 111L188 169M98 118L86 154M177 164L187 190","supino-canadense":"M75 176L193 120M84 172L89 194M186 124L195 166","supino-barra":"M76 150H199M91 150V175M181 150V175M100 52V85M132 52V85","supino-maquina":"M128 82V145H192V181M129 145L194 145M298 67V185M280 74V125M287 95H260","flexora-c":"M72 154H248M91 154V184M222 154V185M300 83V180M272 94H298","flexora-sentada":"M125 143H225M157 143V193M127 142V93M215 146V179M285 104V181","flexora-d":"M125 143H225M157 143V193M127 142V93M215 146V179M285 104V181","panturrilha-banco":"M128 94V148H206M153 148V190M209 138H259M259 165V196M223 186H273","panturrilha-leg":"M60 105L139 169H192M259 63L295 123M251 86L281 101","agachamento-hack":"M119 195L235 39M145 195L260 39M142 178H263M170 72H235","bulgaro":"M74 148H144M87 148V196M134 148V190","step-up-baixo":"M196 160H309V193H196Z","pullover-polia":"M279 38V184M251 39H298M277 41L248 43"};
const VARIANT_META={"supino-inclinado":["Banco inclinado","Cabeça acima da linha do quadril no banco inclinado. Ajuste do banco não é personalizado."],"supino-canadense":["Banco declinado · barra","Cabeça abaixo do quadril no banco declinado, com a barra sobre a região do tórax."],"supino-barra":["Banco reto · barra","Supino em banco horizontal com barra reta; amplitude e pegada variam."],"supino-maquina":["Máquina sentada","Empurrar sentado em máquina de peito; as alavancas variam conforme o equipamento."],"flexora-c":["Mesa · deitado","Flexão de joelho com o tronco deitado de barriga para baixo."],"flexora-sentada":["Cadeira · sentado","Flexão de joelho com o tronco sentado e apoiado."],"flexora-d":["Escolher aparelho","A ficha permite mesa ou cadeira flexora. Esta animação retrata a variação sentada; confirme a máquina escolhida."],"cadeira-adutora":["Fechar pernas","Na cadeira adutora, as pernas se aproximam contra a resistência."],"abdutora":["Abrir pernas","Na cadeira abdutora, as pernas se afastam contra a resistência."],"panturrilha-banco":["Sentado","Elevação de calcanhares em posição sentada, com joelhos flexionados."],"panturrilha-leg":["Leg press · tornozelo","Movimento mais concentrado no tornozelo do que na extensão do joelho."],"panturrilha-em-pe":["Em pé","Elevação de calcanhares em pé; o apoio varia entre máquinas."],"agachamento-hack":["Trilho inclinado","Agachamento hack com trilho e apoio do tronco; a amplitude é ilustrativa."],"bulgaro":["Pé posterior elevado","No búlgaro, o pé posterior fica apoiado em banco, ao contrário da passada comum."],"step-up-baixo":["Subida em degrau","Subida em plataforma baixa; a altura e o apoio variam conforme orientação."],"pulley-fechado":["Pegada fechada","As mãos ficam mais próximas do que na puxada aberta."],"puxada-neutra":["Pegada neutra","As palmas tendem a se enfrentar com um acessório apropriado."],"pullover-polia":["Braços quase estendidos","Movimento do ombro puxando os braços à frente do corpo, não uma puxada de cotovelos."]};
function profileFor(id,fam){
 const spec=VARIANT_SPEC[id]; if(!spec)return PROFILES[fam];
 if(spec.full)return VARIANT_FULL[id];
 const base=PROFILES[spec.base||fam];
 const p={a:[...base.a],b:[...base.b],w:spec.w||base.w};
 if(spec.reverse)[p.a,p.b]=[p.b,p.a];
 for(const phase of ['a','b']){
  for(const [joint,xy] of Object.entries(spec[phase]||{})){
   const index=JOINTS.indexOf(joint);
   if(index<0)continue;
   p[phase][index*2]=xy[0];p[phase][index*2+1]=xy[1];
  }
 }
 return p;
}
const variantLabel=id=>VARIANT_META[id]?.[0]||'';
const movementCue=(id,fam)=>VARIANT_META[id]?.[1]||CUES[fam];
function movementGear(id,fam){
 return Object.hasOwn(VARIANT_GEAR,id)?
  '<path d="'+VARIANT_GEAR[id]+'" class="m-equipment"/>':(EQUIPMENT[fam]||'');
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const point=(arr,key)=>{const i=JOINTS.indexOf(key)*2;return [arr[i],arr[i+1]];};
const xy=(arr,key)=>point(arr,key).join(',');
function ani(attr,a,b,enabled){
 return enabled&&a!==b?`<animate attributeName="${attr}" values="${a};${b};${a}" keyTimes="0;0.5;1" dur="2.8s" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" repeatCount="indefinite"/>`:'';
}
function segment(a,b,u,v,cls,width,animated){
 const s=`${xy(a,u)} ${xy(a,v)}`,t=`${xy(b,u)} ${xy(b,v)}`;
 return `<polyline class="${cls}" stroke-width="${width}" points="${s}">${ani('points',s,t,animated)}</polyline>`;
}
const MOVEMENT_FOCUS={"supino":{"mark":["S","E","W","E2","W2"],"trace":[["W","E"]],"label":"Ombros e cotovelos"},"puxada":{"mark":["S","E","W","E2","W2"],"trace":[["W","S"]],"label":"Ombros e cotovelos"},"remada":{"mark":["S","E","W"],"trace":[["W","E"]],"label":"Ombro e cotovelo"},"rosca":{"mark":["E","E2","W","W2"],"trace":[["W","E"]],"label":"Cotovelos"},"lateral":{"mark":["S","S2","W","W2"],"trace":[["W","S"]],"label":"Ombros"},"desenvolvimento":{"mark":["S","E","W","E2","W2"],"trace":[["W","S"]],"label":"Ombros e cotovelos"},"triceps":{"mark":["E","E2","W","W2"],"trace":[["W","E"]],"label":"Cotovelos"},"agachamento":{"mark":["P","K","K2"],"trace":[["P","S"]],"label":"Quadril e joelhos"},"legpress":{"mark":["P","K","A","K2","A2"],"trace":[["K","P"]],"label":"Joelhos e tornozelos"},"hinge":{"mark":["P","P2","K"],"trace":[["S","P"]],"label":"Quadril e tronco"},"ponte":{"mark":["P","P2"],"trace":[["P","S"]],"label":"Quadril"},"afundo":{"mark":["P","K","K2"],"trace":[["P","S"]],"label":"Quadril e joelhos"},"extensora":{"mark":["K","K2","A"],"trace":[["A","K"]],"label":"Joelhos"},"flexora":{"mark":["K","K2","A"],"trace":[["A","K"]],"label":"Joelhos"},"panturrilha":{"mark":["A","A2"],"trace":[["A","K"]],"label":"Tornozelos"},"crucifixo":{"mark":["S","S2","W","W2"],"trace":[["W","S"]],"label":"Ombros"},"abdutora":{"mark":["P","P2","K","K2"],"trace":[["K","P"],["K2","P2"]],"label":"Quadril"},"coice":{"mark":["P","K","A"],"trace":[["A","P"]],"label":"Quadril"},"soco":{"mark":["S","E","W"],"trace":[["W","S"]],"label":"Ombro e cotovelo"}};
function round1(n){return Math.round(n*10)/10;}
function arcBetween(start,end,pivot){
 const [sx,sy]=start,[ex,ey]=end,[px,py]=pivot;
 if(![sx,sy,ex,ey,px,py].every(Number.isFinite))return "";
 if(Math.hypot(ex-sx,ey-sy)<11)return "";
 const angle0=Math.atan2(sy-py,sx-px);
 let change=Math.atan2(ey-py,ex-px)-angle0;
 while(change>Math.PI)change-=Math.PI*2;
 while(change< -Math.PI)change+=Math.PI*2;
 const r=(Math.hypot(sx-px,sy-py)+Math.hypot(ex-px,ey-py))/2;
 const mid=angle0+change/2;
 const mx=px+r*Math.cos(mid),my=py+r*Math.sin(mid);
 const cx=Math.min(348,Math.max(12,2*mx-(sx+ex)/2));
 const cy=Math.min(207,Math.max(13,2*my-(sy+ey)/2));
 return `M ${round1(sx)} ${round1(sy)} Q ${round1(cx)} ${round1(cy)} ${round1(ex)} ${round1(ey)}`;
}
function detailLayers(id,fam,a,b,animated,phase='start'){
 const config=MOVEMENT_FOCUS[fam];
 if(!config)return {paths:"",joints:""};
 const active=new Set(config.mark);
 const markerId="m-arrow-"+id+"-"+phase;
 const original=profileFor(id,fam);
 const curves=config.trace.map(([end,pivot])=>arcBetween(point(original.a,end),point(original.b,end),point(original.a,pivot))).filter(Boolean);
 const paths=curves.length?`<defs><marker id="${markerId}" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto" viewBox="0 0 6 6"><path d="M0 0L6 3L0 6" fill="none" stroke="#80beff" stroke-width="1.5" stroke-linecap="round"/></marker></defs><g class="m-trajectory-layer" aria-hidden="true">${curves.map(d=>`<path class="m-motion-track" d="${d}" marker-end="url(#${markerId})"/>`).join("")}</g>`:"";
 const nodes=JOINTS.filter(j=>j!=="H").map(j=>{
  const [x,y]=point(a,j),[xx,yy]=point(b,j),selected=active.has(j);
  return `<circle data-joint="${j}" class="m-joint ${selected?"m-joint-active":"m-joint-neutral"}" cx="${x}" cy="${y}" r="${selected?4.5:2.2}">${ani("cx",x,xx,animated)}${ani("cy",y,yy,animated)}</circle>`;
 }).join("");
 return {paths,joints:`<g class="m-joints" aria-hidden="true">${nodes}</g>`};
}
function svg(id, animated=false, phase='start', detail=false){
 const fam=EXERCISES[id];if(!fam)return '';
 const p=profileFor(id,fam);if(!p)return '';
 const a=phase==='end'&&!animated?p.b:p.a,b=p.b, title=variantLabel(id)||TITLES[fam];
 const overlay=detail?detailLayers(id,fam,a,b,animated,phase):{paths:'',joints:''};
 const parts=[
  segment(a,b,'H','S','m-neck',7,animated),
  segment(a,b,'S','S2','m-shoulder-band',8,animated),
  segment(a,b,'P','P2','m-pelvis-band',11,animated),
  segment(a,b,'S','P','m-body',13,animated),
  segment(a,b,'S','E','m-arms',10,animated),
  segment(a,b,'E','W','m-arms',10,animated),
  segment(a,b,'P','K','m-legs',11,animated),
  segment(a,b,'K','A','m-legs',11,animated),
  segment(a,b,'S2','E2','m-muted',9,animated),
  segment(a,b,'E2','W2','m-muted',9,animated),
  segment(a,b,'P2','K2','m-muted',9,animated),
  segment(a,b,'K2','A2','m-muted',9,animated),
 ];
 const h=point(a,'H'),hh=point(b,'H');
 parts.push(`<circle class="m-head" cx="${h[0]}" cy="${h[1]}" r="15">${ani('cx',h[0],hh[0],animated)}${ani('cy',h[1],hh[1],animated)}</circle>`);
 const hands=p.w==='wrist2'?['W','W2']:p.w==='wrist'?['W']:[];
 for(const hand of hands){
  const [x,y]=point(a,hand),[xx,yy]=point(b,hand);
  parts.push(`<rect class="m-weight" x="${x-13}" y="${y-5}" width="26" height="10" rx="4">${ani('x',x-13,xx-13,animated)}${ani('y',y-5,yy-5,animated)}</rect>`);
 }
 if(p.w==='bar'){
  const [w1,w2]=['W','W2'].map(key=>point(a,key)),[v1,v2]=['W','W2'].map(key=>point(b,key));
  const y=Math.min(w1[1],w2[1]),yy=Math.min(v1[1],v2[1]);
  const x0=Math.min(w1[0],w2[0])-20,x1=Math.max(w1[0],w2[0])+20;
  const xx0=Math.min(v1[0],v2[0])-20,xx1=Math.max(v1[0],v2[0])+20;
  parts.push(`<line class="m-bar" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}">${ani('x1',x0,xx0,animated)}${ani('x2',x1,xx1,animated)}${ani('y1',y,yy,animated)}${ani('y2',y,yy,animated)}</line>`);
 }
 if(p.w==='ankle'){
  const [x,y]=point(a,'A'),[xx,yy]=point(b,'A');
  parts.push(`<rect class="m-weight" x="${x-11}" y="${y-6}" width="22" height="12" rx="5">${ani('x',x-11,xx-11,animated)}${ani('y',y-6,yy-6,animated)}</rect>`);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" class="motion-svg" data-motion-id="${esc(id)}" viewBox="0 0 360 220" role="img" aria-label="${esc(title)}: ilustração ${animated?'animada':'estática'} do movimento">
 <title>${esc(title)} — representação ilustrativa</title>
 <style>.m-equipment{fill:none;stroke:#84a0b2;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}.m-floor{fill:none;stroke:#324a59;stroke-width:3}.m-body{fill:none;stroke:#a8cbd4;stroke-linecap:round}.m-arms{fill:none;stroke:#c5f56b;stroke-linecap:round}.m-legs{fill:none;stroke:#d3e4e9;stroke-linecap:round}.m-muted{fill:none;stroke:#96b1c1;opacity:.68;stroke-linecap:round}.m-head{fill:#adced2;stroke:#d3e8e8;stroke-width:2}.m-weight{fill:#80beff}.m-bar{stroke:#80beff;stroke-width:7;stroke-linecap:round}.m-neck{fill:none;stroke:#abc8d2;stroke-linecap:round}.m-shoulder-band,.m-pelvis-band{fill:none;stroke:#92b3c6;stroke-linecap:round}.m-joint{stroke:#101b27;stroke-width:2}.m-joint-neutral{fill:#8eacb9;opacity:.85}.m-joint-active{fill:#c5f56b;stroke:#1a3326;stroke-width:2.2}.m-motion-track{fill:none;stroke:#80beff;stroke-width:2.5;stroke-dasharray:5 6;stroke-linecap:round;opacity:.93}</style>
 <rect width="360" height="220" fill="#101b27" rx="24"/><circle cx="182" cy="112" r="94" fill="#192a39"/><path d="M30 197H330" stroke="#324a59" stroke-width="2" stroke-dasharray="6 8"/>
 ${overlay.paths}${movementGear(id,fam)}${parts.join('')}${overlay.joints}
 <rect x="16" y="13" width="89" height="22" rx="11" fill="#253d45"/><text x="29" y="28" fill="#c5f56b" font-size="10" font-family="system-ui,sans-serif" font-weight="800">FORJA · MOVE</text>
 </svg>`;
}
function has(id){return Object.hasOwn(EXERCISES,id);}
function thumb(id){return has(id)?`<span class="motion-thumb" aria-hidden="true">${svg(id,false)}</span>`:'';}
function viewer(id,name,animated=true){
 if(!has(id))return "";
 const fam=EXERCISES[id];
 const stage=animated?svg(id,true,"start",true):`<div class="motion-static-pair"><figure>${svg(id,false,"start",true)}<figcaption>Início</figcaption></figure><figure>${svg(id,false,"end",true)}<figcaption>Fim</figcaption></figure></div>`;
 const controls=animated?`<div class="motion-phase-controls" role="group" aria-label="Escolher posição do movimento">
   <button type="button" class="secondary motion-phase-button" data-action="motion-phase" data-phase="start" aria-pressed="false">Início</button>
   <button type="button" class="secondary motion-phase-button" data-action="motion-phase" data-phase="end" aria-pressed="false">Fim</button>
   <button type="button" class="secondary motion-play-button" data-action="motion-pause" aria-pressed="false">Pausar animação</button>
   </div><output class="motion-state" id="motion-state" aria-live="polite">Movimento em repetição</output>`:`<span class="motion-reduced">Movimento reduzido: compare as posições estáticas de início e fim.</span>`;
 return `<div class="motion-sheet">
  <div class="motion-sheet-header"><div><p class="section-eyebrow">FORJA MOVE · DEMONSTRAÇÃO</p><h2 id="motion-dialog-title">${esc(name)}</h2></div><button type="button" class="secondary motion-close" data-action="motion-close">Fechar</button></div>
  <div class="motion-stage">${stage}</div>
  <div class="motion-legend"><span><i class="motion-dot" aria-hidden="true"></i>${esc(MOVEMENT_FOCUS[fam]?.label||"Articulações")}</span><span><i class="motion-dash" aria-hidden="true"></i>Trajetória ilustrativa</span></div>
  ${variantLabel(id)?`<span class="motion-variant-chip">${esc(variantLabel(id))}</span>`:""}
  <p class="motion-tip">${esc(movementCue(id,fam))}</p>
  <p class="motion-disclaimer">Ilustração para identificar o exercício. Não representa medidas corporais, amplitudes ou execução técnica individualizadas.</p>
  <div class="motion-controls">${controls}</div></div>`;
}
const api={has,thumb,viewer,svg,variantLabel,EXERCISES,CUES,TITLES,variantCount:Object.keys(VARIANT_SPEC).length};
root.ForjaExerciseMotion=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,{"supino":{"a":[84,130,115,126,148,116,147,103,171,130,204,153,215,191,112,135,110,116,110,103,165,134,204,158,224,191],"b":[84,130,115,126,145,87,147,58,171,130,204,153,215,191,112,135,111,88,111,58,165,134,204,158,224,191],"w":"wrist2"},"puxada":{"a":[180,56,181,83,150,104,131,55,181,139,211,147,213,184,172,83,211,104,234,55,176,139,157,148,160,184],"b":[180,56,181,83,150,117,151,105,181,139,211,147,213,184,172,83,211,117,213,105,176,139,157,148,160,184],"w":"bar"},"remada":{"a":[180,56,181,83,235,110,272,112,181,139,211,147,213,184,172,83,228,120,272,120,176,139,157,148,160,184],"b":[180,56,181,83,223,111,201,117,181,139,211,147,213,184,172,83,216,120,201,124,176,139,157,148,160,184],"w":"wrist"},"rosca":{"a":[182,47,181,76,210,120,223,148,181,130,186,162,181,193,177,76,147,120,136,147,177,130,172,163,169,193],"b":[182,47,181,76,213,119,208,90,181,130,186,162,181,193,177,76,145,119,152,90,177,130,172,163,169,193],"w":"wrist2"},"lateral":{"a":[182,47,181,76,213,108,221,151,181,130,186,162,181,193,177,76,145,108,136,151,177,130,172,163,169,193],"b":[182,47,181,76,232,80,266,81,181,130,186,162,181,193,177,76,128,80,96,81,177,130,172,163,169,193],"w":"wrist2"},"desenvolvimento":{"a":[182,47,181,76,207,76,220,90,181,130,186,162,181,193,177,76,152,76,141,90,177,130,172,163,169,193],"b":[182,47,181,76,198,53,200,22,181,130,186,162,181,193,177,76,162,53,160,22,177,130,172,163,169,193],"w":"wrist2"},"triceps":{"a":[182,47,181,76,218,108,241,103,181,130,186,162,181,193,177,76,145,105,150,104,177,130,172,163,169,193],"b":[182,47,181,76,218,108,225,159,181,130,186,162,181,193,177,76,145,105,145,159,177,130,172,163,169,193],"w":"wrist2"},"agachamento":{"a":[166,48,167,76,202,86,206,80,177,131,196,159,182,194,177,76,138,86,132,80,170,131,152,160,159,194],"b":[178,83,177,110,210,120,214,114,187,158,213,157,182,194,177,76,146,119,141,114,182,158,153,156,159,194],"w":"none"},"legpress":{"a":[107,112,123,130,131,163,144,164,154,151,227,112,251,89,118,132,130,164,146,166,159,155,232,119,252,98],"b":[107,112,123,130,131,163,144,164,154,151,198,134,246,93,118,132,130,164,146,166,159,155,202,138,251,103],"w":"none"},"hinge":{"a":[191,44,190,73,211,102,222,141,182,129,186,162,181,193,177,76,168,107,167,142,177,130,172,163,169,193],"b":[237,91,224,102,235,122,230,167,181,126,191,166,181,193,177,76,210,124,207,167,177,130,164,168,169,193],"w":"wrist2"},"ponte":{"a":[91,166,120,168,135,177,145,180,188,168,223,144,243,191,116,173,135,180,150,184,184,168,222,150,257,191],"b":[91,166,120,162,135,177,145,180,188,124,223,135,243,191,118,167,135,180,150,184,184,126,222,141,257,191],"w":"none"},"afundo":{"a":[182,47,181,76,210,111,215,144,172,130,196,159,211,192,177,76,148,111,146,142,172,133,149,162,128,192],"b":[178,76,178,102,210,111,215,144,180,149,215,167,229,192,177,76,148,111,146,142,175,150,147,168,128,192],"w":"wrist2"},"extensora":{"a":[180,56,181,83,207,109,218,117,176,134,218,148,215,188,172,83,148,109,143,118,170,134,208,152,205,188],"b":[180,56,181,83,207,109,218,117,176,134,218,148,281,155,172,83,148,109,143,118,170,134,208,152,273,159],"w":"ankle"},"flexora":{"a":[180,56,181,83,207,109,218,117,181,140,218,153,223,191,172,83,148,109,143,118,174,140,203,153,208,191],"b":[180,56,181,83,207,109,218,117,181,140,218,153,194,167,172,83,148,109,143,118,174,140,203,153,185,170],"w":"ankle"},"panturrilha":{"a":[182,47,181,76,210,111,215,144,181,130,186,162,181,193,177,76,148,111,146,142,177,130,172,163,169,193],"b":[182,40,181,69,210,104,215,137,181,123,186,155,184,186,177,69,148,104,146,135,177,123,172,157,170,186],"w":"none"},"crucifixo":{"a":[84,130,115,126,80,90,67,100,171,130,204,153,215,191,112,135,154,87,179,100,165,134,204,158,224,191],"b":[84,130,115,126,117,81,117,57,171,130,204,153,215,191,112,135,113,81,114,57,165,134,204,158,224,191],"w":"wrist2"},"abdutora":{"a":[180,56,181,83,207,109,218,117,181,139,214,158,232,190,172,83,148,109,143,118,176,139,150,158,131,190],"b":[180,56,181,83,207,109,218,117,181,139,259,163,272,190,172,83,148,109,143,118,176,139,112,163,98,190],"w":"none"},"coice":{"a":[182,47,181,76,210,111,215,144,177,129,184,164,185,194,177,76,148,111,146,142,169,132,162,166,160,194],"b":[182,47,181,76,210,111,215,144,177,129,216,165,239,157,177,76,148,111,146,142,169,132,162,166,160,194],"w":"none"},"soco":{"a":[182,47,181,82,218,98,210,77,181,130,186,162,181,193,177,76,148,103,154,81,177,130,172,163,169,193],"b":[182,47,181,82,232,79,267,79,181,130,186,162,181,193,177,76,149,102,151,81,177,130,172,163,169,193],"w":"none"}},{"puxada":["pulley-aberto","pulley-fechado","puxada-neutra","pullover-polia"],"remada":["remada-baixa","remada-cavalinho","remada-unilateral-halter","remada-articulada","face-pull","remada-alta"],"rosca":["rosca-w","rosca-martelo","rosca-inversa","rosca-scott"],"supino":["supino-halteres","supino-barra","supino-inclinado","supino-maquina","supino-canadense"],"crucifixo":["voador","crucifixo-cabo","crossover-polia"],"lateral":["elevacao-lateral"],"desenvolvimento":["desenvolvimento-halter"],"triceps":["triceps-testa","triceps-corda","triceps-maquina","triceps-frances"],"agachamento":["agachamento-hack","agachamento-livre","agachamento-goblet","sumo-maquina"],"legpress":["leg-press"],"afundo":["bulgaro","passada-reversa","step-up-baixo"],"extensora":["extensora","extensora-d"],"flexora":["flexora-c","flexora-d","flexora-sentada"],"panturrilha":["panturrilha-leg","panturrilha-banco","panturrilha-em-pe"],"hinge":["stiff","terra-romeno-halter"],"ponte":["elevacao-pelvica","ponte-gluteo"],"abdutora":["abdutora","cadeira-adutora"],"coice":["gluteo-cabo"],"soco":[]});
