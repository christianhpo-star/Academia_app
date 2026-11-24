const test=require('node:test');
const assert=require('node:assert/strict');
const BODY=require('../muscle-body.js');
const HISTORY=require('../muscle-history.js');
const MAP=require('../muscle-map.js');
const ANATOMY=require('../exercise-anatomy.js');
const DATA=require('../data.js');
const FLEX=require('../flex.js');
const TODAY='2026-11-22';
const exercise=(id,count=1)=>({id,sets:Array.from({length:count},()=>({load:20,reps:10,rir:2}))});
const session=(day,entries,id=day)=>({id,day,entries,timestamp:day+'T16:00:00Z'});
const ago=days=>new Date(Date.parse(TODAY+'T12:00:00Z')-days*86400000).toISOString().slice(0,10);
const attributes=tag=>Object.fromEntries([...tag.matchAll(/\b([\w-]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));
const regionGroups=svg=>[...svg.matchAll(/<g\b[^>]*data-muscle-region="[^"]+"[^>]*>/g)].map(match=>attributes(match[0]));
const svgFrom=html=>html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0]||'';

test('the full-body drawing covers exactly the 19 anatomical regions used by all 110 catalog exercises',()=>{
  const catalog=[...new Map([...FLEX.catalog,...DATA.exercises].map(ex=>[ex.id,ex])).values()];
  const expected=new Set(catalog.flatMap(ex=>{
    const item=ANATOMY.describe(ex.id);
    assert.ok(item,ex.id);
    return [...item.main,...item.assist];
  }));
  assert.equal(catalog.length,110);
  assert.equal(BODY.regions.length,19);
  assert.deepEqual(BODY.regions.map(r=>r.id).sort(),[...expected].sort());
  assert.deepEqual(BODY.regions.map(r=>r.id).sort(),HISTORY.REGIONS.map(r=>r.id).sort());
  for(const view of ['front','back']){
    const expectedViews=HISTORY.REGIONS.filter(region=>region.views.includes(view)).map(region=>region.id).sort();
    assert.deepEqual(BODY.visibleIds(view).sort(),expectedViews);
  }
});

test('front and back keep muscle locations on their actual view and bilateral pairs share one control',()=>{
  const output=MAP.model({sessions:[session(TODAY,[exercise('supino-halteres',4),exercise('stiff',3)])]},TODAY,7);
  const front=BODY.figure({view:'front',rows:output.regions,selected:'quadriceps'});
  const back=BODY.figure({view:'back',rows:output.regions,selected:'glutes'});
  for(const [svg,view,selected] of [[front,'front','quadriceps'],[back,'back','glutes']]){
    const controls=regionGroups(svg),ids=controls.map(row=>row['data-muscle-region']);
    assert.deepEqual(ids.sort(),BODY.visibleIds(view).sort());
    assert.equal(ids.length,new Set(ids).size,'left/right parts must not duplicate keyboard stops');
    assert.equal(controls.filter(row=>row['aria-pressed']==='true').length,1);
    for(const control of controls){
      assert.equal(control.role,'button');
      assert.equal(control.tabindex,'0');
      assert.equal(control['data-action'],'muscle-region');
      assert.equal(control['aria-controls'],'muscle-map-detail');
      assert.equal(control['data-muscle'],control['data-muscle-region']);
      assert.equal(control['aria-pressed'],String(control['data-muscle']===selected));
      assert.match(control['aria-label'],/séries equivalentes estimadas no período/);
    }
    for(const match of svg.matchAll(/<g\b[^>]*data-muscle-region="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)){
      assert.ok((match[2].match(/<path\b/g)||[]).length>=2,match[1]+' must include paired left/right shapes');
      assert.match(match[2],/translate\(260 0\) scale\(-1 1\)/,match[1]);
    }
  }
  assert.doesNotMatch(front,/data-muscle-region="(?:hamstrings|glutes|calves|rearDelts|lats)"/);
  assert.doesNotMatch(back,/data-muscle-region="(?:quadriceps|chest|frontDelts|biceps|adductors|abs|obliques)"/);
});

test('selection uses one shared detail panel and keeps the full distribution collapsed by default',()=>{
  const state={sessions:[session(TODAY,[exercise('supino-halteres',3),exercise('extensora',1)])]};
  for(const selected of ['chest','quadriceps']){
    const html=MAP.render(state,TODAY,{days:7,selected});
    assert.equal((html.match(/id="muscle-map-detail"/g)||[]).length,1);
    assert.equal((html.match(/id="muscle-map-select"/g)||[]).length,1);
    assert.match(html,new RegExp('<option value="'+selected+'" selected>'));
    assert.match(html,new RegExp('data-selected-muscle="'+selected+'"'));
    assert.match(html,/<select id="muscle-map-select" aria-controls="muscle-map-detail">/);
    assert.match(html,/data-action="muscle-map-return">Voltar ao corpo/);
    assert.match(html,/Toque no corpo para escolher um músculo/);
    const details=html.match(/<details class="muscle-map-breakdown">([\s\S]*?)<\/details>/)?.[1];
    assert.ok(details,'the full distribution starts closed');
    assert.match(details,/class="muscle-map-insights"/);
    assert.match(details,/class="muscle-map-region-list"/);
    assert.doesNotMatch(html.slice(0,html.indexOf('<details class="muscle-map-breakdown"')),/class="muscle-map-insights"|class="muscle-map-row"/);
  }
  const emptySelection=MAP.render(state,TODAY,{days:7});
  assert.doesNotMatch(emptySelection,/data-action="muscle-map-return"/);
});

test('view changes preserve one relative scale and SVG values agree with history totals',()=>{
  const sessions=[session(TODAY,[exercise('rosca-w',2),exercise('elevacao-lateral',6),exercise('extensora',9)])];
  const data=MAP.model({sessions},TODAY,7);
  const values={};
  for(const view of ['front','back']){
    const html=MAP.render({sessions},TODAY,{days:7,view});
    values[view]=Object.fromEntries(regionGroups(svgFrom(html)).map(row=>[row['data-muscle'],row]));
    for(const [id,row] of Object.entries(values[view])){
      assert.equal(Number(row['data-total']),data.byId[id].total,id);
      assert.equal(Number(row['data-level']),data.byId[id].level,id);
      assert.equal(row.fill,BODY.PALETTE[data.byId[id].level],id);
      assert.match(row['aria-label'],new RegExp(BODY.LABELS[data.byId[id].level]),id);
    }
  }
  for(const id of ['forearms','sideDelts','upperTraps']){
    assert.equal(values.front[id]['data-total'],values.back[id]['data-total'],id);
    assert.equal(values.front[id]['data-level'],values.back[id]['data-level'],id);
    assert.equal(values.front[id].fill,values.back[id].fill,id);
  }
});

test('each render creates unique accessible SVG definitions without hiding interactive regions in an image role',()=>{
  const renders=[BODY.figure(),BODY.figure({view:'back'}),MAP.render({},TODAY),MAP.render({},TODAY,{view:'back'})];
  const allIds=[];
  for(const rendered of renders){
    const svg=rendered.startsWith('<svg')?rendered:svgFrom(rendered);
    const tag=attributes(svg.match(/^<svg[^>]+>/)[0]);
    assert.equal(tag.role,'group');
    assert.equal(tag.viewBox,'0 0 260 564');
    assert.equal(tag.focusable,'false');
    const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    for(const id of tag['aria-labelledby'].split(' '))assert.ok(ids.includes(id),id);
    for(const match of svg.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.includes(match[1]),match[1]);
    allIds.push(...ids);
  }
  assert.equal(allIds.length,new Set(allIds).size,'gradients, patterns and description IDs cannot collide');
});

test('only the untracked lumbar region stays hatched; abdominals have selectable front regions',()=>{
  const rows=[...HISTORY.REGIONS.map(region=>({...region,total:5,level:3})),
    {id:'abs',total:200,level:3},{id:'obliques',total:200,level:3},{id:'lumbar',total:200,level:3}];
  for(const view of ['front','back']){
    const svg=BODY.figure({view,rows,selected:view==='front'?'abs':'lumbar'});
    assert.doesNotMatch(svg,/data-muscle-region="lumbar"/);
    if(view==='front'){
      const controls=regionGroups(svg);
      for(const id of ['abs','obliques']){
        const region=controls.find(row=>row['data-muscle-region']===id);
        assert.equal(region['data-total'],'200');
        assert.equal(region['data-level'],'3');
        assert.equal(region['aria-pressed'],String(id==='abs'));
      }
    }else{
      assert.doesNotMatch(svg,/data-muscle-region="(?:abs|obliques)"/);
      assert.doesNotMatch(svg,/aria-pressed="true"/);
    }
    const unmapped=[...svg.matchAll(/<g\b[^>]*data-muscle-unmapped="[^"]+"[^>]*>/g)].map(match=>attributes(match[0]));
    assert.deepEqual(unmapped.map(row=>row['data-muscle-unmapped']),view==='front'?[]:['lumbar']);
    for(const region of unmapped){
      assert.match(region.fill,/^url\(#forja-muscle-body-\d+-unmapped\)$/);
      assert.match(region['aria-label'],/não estimado pelo catálogo/);
      assert.equal(region['data-level'],undefined);
      assert.equal(region.role,undefined);
    }
  }
});

test('abdominal map colors, details and method use recorded bodyweight and anti-rotation sets',()=>{
  const state={sessions:[session(TODAY,[
    {id:'abdominal-solo',sets:[{load:0,reps:12},{load:0,reps:12}]},
    {id:'pallof-press',sets:[{load:5,reps:10},{load:5,reps:10}]}
  ])],exercises:[{id:'abdominal-solo',name:'Abdominal no solo'},{id:'pallof-press',name:'Pallof press'}]};
  const html=MAP.render(state,TODAY,{days:7,selected:'abs'});
  const controls=regionGroups(svgFrom(html));
  for(const id of ['abs','obliques']){
    const region=controls.find(row=>row['data-muscle-region']===id);
    assert.equal(region['data-total'],'3');
    assert.equal(region['data-level'],'3');
    assert.match(html,new RegExp('<option value="'+id+'"'));
  }
  assert.match(html,/data-selected-muscle="abs"/);
  assert.match(html,/3<\/b> séries equivalentes · 2 principais \+ 2 auxiliares × 0,5/);
  assert.match(html,/Abdominal no solo/);
  assert.match(html,/Pallof press/);
  assert.match(html,/0 kg significa peso do corpo e conta como série/);
  assert.match(html,/A participação estabilizadora em outros movimentos não é estimada automaticamente/);
  assert.doesNotMatch(html,/Abdômen, oblíquos e lombar ficam hachurados/);
});

test('the period controls use exact 7/30/90 windows and retain a valid selected muscle with no recent work',()=>{
  const state={sessions:[session(ago(12),[exercise('extensora',3)]),session(ago(50),[exercise('extensora',2)])]};
  for(const [days,total] of [[7,0],[30,3],[90,5]]){
    const html=MAP.render(state,TODAY,{days,view:'front',selected:'quadriceps'});
    const controls=[...html.matchAll(/<button\b[^>]*data-action="evo-volume-days"[^>]*>/g)].map(match=>attributes(match[0]));
    assert.deepEqual(controls.map(row=>Number(row['data-days'])),[7,30,90]);
    assert.equal(controls.filter(row=>row['aria-pressed']==='true').length,1);
    assert.equal(controls.find(row=>row['aria-pressed']==='true')['data-days'],String(days));
    const quads=regionGroups(svgFrom(html)).find(row=>row['data-muscle']==='quadriceps');
    assert.equal(Number(quads['data-total']),total);
    assert.match(html,/data-selected-muscle="quadriceps"/);
    if(!total)assert.match(html,/Nenhuma série classificada para esta região nos 7 dias selecionados/);
  }
  const invalid=MAP.render(state,TODAY,{days:365});
  assert.match(invalid,/data-muscle-days="30"/);
});

test('unknown-only and empty histories stay neutral and explain incomplete coverage without invented leaders',()=>{
  const payload='<img src=x onerror="alert(1)">';
  const unknown=MAP.render({sessions:[session(TODAY,[exercise(payload,2)])],exercises:[{id:payload,name:payload}]},TODAY,{days:7});
  assert.match(unknown,/ainda não têm classificação muscular/);
  assert.match(unknown,/1 registro de exercício sem classificação \(2 séries\) fora do mapa/);
  assert.doesNotMatch(unknown,/<img\b|onerror|<h3>Mais presentes/);
  for(const html of [unknown,MAP.render({},TODAY,{days:7})]){
    assert.match(html,/Sem séries de musculação neste período/);
    assert.ok(regionGroups(svgFrom(html)).every(row=>row['data-level']==='0'&&row['data-total']==='0'));
    assert.doesNotMatch(html,/NaN|Infinity/);
  }
});

test('exercise names in muscle details are escaped and invalid inherited selections cannot create empty details',()=>{
  const malicious='<img src=x onerror="alert(1)"> & \'quoted\'';
  const state={sessions:[session(TODAY,[exercise('supino-halteres',2),exercise('unknown-<script>',1)])],
    exercises:[{id:'supino-halteres',name:malicious}]};
  const before=structuredClone(state);
  const html=MAP.render(state,TODAY,{days:7,selected:'chest',listOpen:true,methodOpen:true});
  assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &#39;quoted&#39;/);
  assert.doesNotMatch(html,/<img\b|<script\b/);
  assert.match(html,/data-selected-muscle="chest"/);
  assert.match(html,/2<\/b> séries equivalentes/);
  assert.deepEqual(state,before,'viewing and describing a muscle must not write or normalize the user history');
  for(const selected of ['invalid-region','constructor','__proto__','toString','<script>alert(1)</script>']){
    const invalid=MAP.render(state,TODAY,{days:7,selected});
    assert.match(invalid,/Explore seu treino no corpo/,selected);
    assert.doesNotMatch(invalid,/data-selected-muscle=/,selected);
    assert.doesNotMatch(invalid,/<script\b/,selected);
  }
});

test('malformed figure totals cannot inject markup or expose nonfinite values as history',()=>{
  const svg=BODY.figure({rows:[
    {id:'chest',total:Infinity,level:3},
    {id:'quadriceps',total:NaN,level:3},
    {id:'forearms',total:-4,level:2},
    {id:'frontDelts',total:'<img src=x>',level:'<script>'},
    {id:'evil" onload="bad',label:'<script>',total:3,level:2}
  ]});
  assert.doesNotMatch(svg,/NaN|Infinity|<script|<img|onload=/);
  for(const row of regionGroups(svg)){
    assert.ok(Number.isFinite(Number(row['data-total'])));
    assert.ok([0,1,2,3].includes(Number(row['data-level'])));
    assert.equal(row['data-total'],'0');
  }
});

test('stair exposure outlines leg regions but never recolors or adds resistance sets',()=>{
  const saved=[{...session(TODAY,[exercise('supino-halteres',2)],'stair-map'),
    cardio:[{type:'escada',minutes:11,avgSpeed:62,speedUnit:'steps_min'}]}];
  const view=MAP.content({sessions:saved},TODAY,{days:7,view:'front',selected:'quadriceps'});
  const q=regionGroups(svgFrom(view)).find(row=>row['data-muscle-region']==='quadriceps');
  assert.equal(q['data-total'],'0');
  assert.equal(q['data-level'],'0');
  assert.equal(q['data-stair-cardio'],'true');
  assert.match(view,/Escada:.*11 min/);
  assert.match(view,/62 degraus\/min/);
  assert.match(view,/atividade complementar/);
  assert.match(view,/Não conta como séries/);
  const back=MAP.content({sessions:saved},TODAY,{days:7,view:'back',selected:'glutes'});
  const ids=regionGroups(svgFrom(back)).filter(row=>row['data-stair-cardio']==='true').map(row=>row['data-muscle-region']).sort();
  assert.deepEqual(ids,['calves','glutes']);
  assert.match(back,/11 min/);
  const plain=MAP.model({sessions:saved.map(x=>({...x,cardio:[]}))},TODAY,7);
  const withStairs=MAP.model({sessions:saved},TODAY,7);
  assert.equal(withStairs.byId.quadriceps.total,plain.byId.quadriceps.total);
  assert.equal(withStairs.byId.glutes.level,plain.byId.glutes.level);
  assert.equal(withStairs.maxTotal,plain.maxTotal);
});
