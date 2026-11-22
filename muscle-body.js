/* FORJA / full-body muscle map. Original vector regions derived from the
 * exercise guides. Shapes locate muscle groups schematically; colors are
 * supplied history categories, never a measure of activation or asymmetry. */
(function installMuscleBody(root){
  'use strict';
  const PALETTE=Object.freeze(['#263D50','#487AA4','#76D6E3','#C5F56B']);
  const LABELS=Object.freeze(['Sem registro','Menor volume relativo','Volume intermediário','Maior volume relativo']);
  const pair=d=>[{d},{d,mirror:true}];
  const abs=[
    ...pair('M112 158 Q121 155 128 158 L128 176 L112 175 Q109 168 112 158 Z'),
    ...pair('M112 180 L128 181 L128 200 L112 199 Q109 190 112 180 Z'),
    ...pair('M112 204 L128 205 L128 226 Q117 225 112 217 Z'),
    ...pair('M114 231 L128 232 L128 251 Q118 249 114 240 Z')
  ];
  const obliques=[
    ...pair('M91 155 L104 162 L107 181 L98 196 Q93 177 91 155 Z'),
    ...pair('M99 202 L108 188 L109 231 L119 249 L98 243 Q102 224 99 202 Z')
  ];
  const upperFront={
    chest:pair('M126 103 C117 99 106 98 97 101 L87 114 C87 124 84 132 87 141 C98 151 115 154 128 147 L128 108 Q128 104 126 103 Z'),
    frontDelts:pair('M78 98 C87 98 95 103 99 110 Q92 121 88 134 L78 144 C72 138 71 132 73 121 Q74 107 78 98 Z'),
    sideDelts:pair('M70 99 C59 102 53 114 54 130 Q54 143 60 151 C67 145 72 135 74 125 C77 114 77 105 70 99 Z'),
    upperTraps:pair('M115 75 C112 84 102 89 89 93 L104 98 L123 95 L121 89 Z'),
    biceps:pair('M60 151 Q69 149 74 143 C73 159 70 177 64 187 Q58 195 52 187 C48 180 50 168 54 159 Z'),
    forearms:pair('M46 196 C51 192 58 192 62 198 C63 213 54 232 46 249 L34 253 C35 239 40 214 46 196 Z'),
    abs,obliques
  };
  const upperBack={
    upperTraps:pair('M117 75 Q111 86 93 93 L85 99 L110 108 L128 101 L128 88 Z'),
    rearDelts:pair('M77 99 C87 99 96 104 101 113 L88 132 L77 144 Q65 133 68 117 C68 109 72 104 77 99 Z'),
    sideDelts:pair('M70 99 C59 102 53 114 54 130 Q54 143 60 151 C67 145 72 135 74 125 C77 114 77 105 70 99 Z'),
    // Middle trapezius and deeper rhomboids are adjacent schematic regions.
    // They are not literal layer boundaries or a cutaway anatomy plate.
    midTraps:pair('M91 104 Q106 110 128 105 L128 123 L112 127 L99 119 Z'),
    rhomboids:pair('M113 130 L128 127 L128 161 Q118 155 109 144 Z'),
    lats:pair('M86 141 Q98 148 109 147 L123 178 L121 231 L109 247 Q100 228 95 205 C90 187 87 164 86 141 Z'),
    triceps:pair('M59 151 Q69 150 75 141 C75 157 71 176 65 189 L58 194 Q48 189 49 179 C49 168 54 157 59 151 Z'),
    forearms:pair('M45 196 C51 193 58 195 62 199 C62 214 53 234 46 249 L34 253 C35 238 39 214 45 196 Z')
  };
  const lowerFront={
    quadriceps:[
      ...pair('M96 87 C88 103 84 122 83 144 Q82 170 88 190 L96 203 Q101 187 103 166 L108 121 L108 96 Z'),
      ...pair('M83 86 C71 94 66 117 65 139 Q66 163 76 187 L85 196 C80 170 79 145 83 121 L91 94 Z'),
      ...pair('M111 141 C108 159 108 174 102 186 L98 204 Q107 209 114 197 C119 183 116 162 111 141 Z')
    ],
    adductors:pair('M112 72 L126 98 L121 126 C118 145 116 158 114 176 L109 168 L110 133 L106 99 Z')
  };
  const lowerBack={
    hipAbductors:pair('M83 36 Q97 38 113 48 L123 58 L124 66 Q104 53 92 57 C81 65 76 77 72 91 L68 87 Q70 58 83 36 Z'),
    glutes:pair('M92 52 Q107 51 127 69 L127 104 Q120 121 103 122 C84 123 72 113 70 99 Q71 74 92 52 Z'),
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
  const regionNames={
    chest:'Peitoral maior',frontDelts:'Deltoide anterior',sideDelts:'Deltoide lateral',
    rearDelts:'Deltoide posterior',upperTraps:'Trapézio superior',midTraps:'Trapézio médio',
    rhomboids:'Romboides',lats:'Latíssimo do dorso',biceps:'Bíceps',
    triceps:'Tríceps',forearms:'Músculos do antebraço',abs:'Reto do abdômen',obliques:'Oblíquos',quadriceps:'Quadríceps',
    glutes:'Glúteo máximo',hamstrings:'Posteriores da coxa',
    hipAbductors:'Abdutores do quadril',adductors:'Adutores da coxa',
    calves:'Panturrilhas'
  };
  const visibleIds=view=>Object.keys(view==='back'
    ?{...upperBack,...lowerBack}:{...upperFront,...lowerFront});
  const regions=Object.freeze(Object.entries(regionNames).map(([id,label])=>Object.freeze({
    id,label,views:Object.freeze(['front','back'].filter(view=>visibleIds(view).includes(id)))
  })));
  const lumbar=pair('M125 169 L128 177 L128 252 L121 261 L113 250 Q120 237 121 224 Z');
  const upperOutline='M96 248 C97 234 98 226 94 209 Q87 183 85 153 L77 130 C71 115 72 98 80 94 L100 89 C111 85 119 80 116 63 L144 63 C141 80 149 85 160 89 L180 94 C188 98 189 115 183 130 L175 153 Q173 183 166 209 C162 226 163 234 164 248';
  // Lower coordinates scale around the body's center, joining the torso at the
  // waist. The shared outline has no artificial seam across the abdomen.
  const lowerOutline='M87 12 L83 34 C72 50 65 74 65 98 C64 125 65 155 72 179 L78 211 C75 225 65 240 65 261 C64 286 78 313 84 339 L84 356 C84 365 70 370 62 375 Q56 384 68 386 L107 386 Q116 385 114 376 L109 359 L109 340 C109 316 117 292 118 268 C118 248 113 232 117 214 L123 176 L126 139 Q130 124 134 139 L137 176 L143 214 C147 232 142 248 142 268 C143 292 151 316 151 340 L151 359 L146 376 Q144 385 153 386 L192 386 Q204 384 198 375 C190 370 179 365 176 356 L176 339 C182 313 196 286 195 261 C195 240 185 225 182 211 L188 179 C195 155 196 125 195 98 C195 74 188 50 177 34 L173 12';
  const arm='M81 94 C64 92 54 101 51 116 C48 131 48 147 44 164 L40 186 C37 194 35 203 35 212 L28 247 L23 262 C20 266 20 275 21 280 Q23 282 25 277 L28 269 L26 288 Q27 294 30 288 L33 274 L32 293 Q34 298 37 290 L40 275 L39 289 Q41 293 44 285 L48 268 Q50 262 47 255 L57 226 C63 212 66 204 64 193 C71 175 74 158 76 143 C84 131 89 118 85 105 Z';
  const head='M111 45 C106 38 108 19 115 12 Q130 4 145 12 C152 19 154 38 149 45 L146 59 Q140 72 130 73 Q120 72 114 59 Z';
  const lowerNeutralFront=[
    ...pair('M82 215 Q96 209 111 216 L110 229 Q96 238 83 229 Z'),
    ...pair('M88 241 L94 243 C94 269 98 305 98 338 L91 343 C87 321 80 290 80 268 Z'),
    ...pair('M108 243 Q115 256 111 278 L103 320 L100 333 L99 292 L101 257 Z')
  ];
  const lowerNeutralBack=[
    ...pair('M88 345 L101 345 L103 365 L99 376 L87 376 L90 361 Z'),
    ...pair('M83 215 L96 224 L111 215 L111 227 L97 233 L83 227 Z')
  ];
  const lowerTransform='translate(26 238) scale(.8)';
  const safe=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const path=(part,attrs='')=>'<path d="'+part.d+'"'+(part.mirror?' transform="translate(260 0) scale(-1 1)"':'')+attrs+'/>';
  const paths=parts=>parts.map(part=>path(part)).join('');
  const amount=value=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1});
  let sequence=0;
  function figure({view='front',rows=[],selected=null,cardioRegions=[]}={}){
    view=view==='back'?'back':'front';
    const uid='forja-muscle-body-'+(++sequence),viewLabel=view==='back'?'Costas':'Frente';
    const byId=new Map((Array.isArray(rows)?rows:[]).filter(row=>row&&regionNames[row.id]).map(row=>[row.id,row]));
    const cardioIds=new Set((Array.isArray(cardioRegions)?cardioRegions:[]).filter(id=>regionNames[id]));
    const renderRegions=area=>Object.entries(area).map(([id,parts])=>{
      const row=byId.get(id),rawTotal=Number(row?.total);
      const total=Number.isFinite(rawTotal)&&rawTotal>0?rawTotal:0;
      const rawLevel=Number(row?.level),level=total>0&&Number.isInteger(rawLevel)?Math.max(1,Math.min(3,rawLevel)):0;
      const label=regionNames[id],chosen=selected===id,stairCardio=cardioIds.has(id);
      const description=label+': '+LABELS[level]+'. '+amount(total)+' séries equivalentes estimadas no período.'+
        (stairCardio?' Escada registrada: participação provável, sem equivalência com séries.':'')+' Toque para ver detalhes.';
      return '<g class="muscle-body-region'+(chosen?' is-selected':'')+(stairCardio?' is-stair-cardio':'')+'" role="button" tabindex="0" focusable="true" '+
        'data-action="muscle-region" data-muscle="'+id+'" data-muscle-region="'+id+'" data-level="'+level+'" data-total="'+total+'" '+
        (stairCardio?'data-stair-cardio="true" ':'')+
        'aria-controls="muscle-map-detail" aria-pressed="'+chosen+'" aria-label="'+safe(description)+'" '+
        'fill="'+PALETTE[level]+'" stroke="'+(chosen?'#FFFFFF':level===0?'#67869B':'#D5EAF1')+'" stroke-width="'+(chosen?'2.2':'.8')+'" stroke-linejoin="round">'+
        '<title>'+safe(description)+'</title>'+paths(parts)+'</g>';
    }).join('');
    const unmapped=(id,label,parts)=>'<g class="muscle-body-unmapped" data-muscle-unmapped="'+id+'" aria-label="'+label+': não estimado pelo catálogo" '+
      'fill="url(#'+uid+'-unmapped)" stroke="#647F91" stroke-width=".65" stroke-linejoin="round">'+
      '<title>'+label+': não estimado pelo catálogo</title>'+paths(parts)+'</g>';
    const lowerContours=view==='back'
      ?'M130 44 L130 105 M73 113 Q93 128 117 119 M187 113 Q167 128 143 119 M85 218 L96 225 L109 218 M175 218 L164 225 L151 218 M94 344 L95 370 M166 344 L165 370'
      :'M81 51 Q101 60 124 98 M179 51 Q159 60 136 98 M130 40 L130 70 M89 217 Q97 213 105 218 M171 217 Q163 213 155 218 M96 242 L103 339 M164 242 L157 339';
    return '<svg xmlns="http://www.w3.org/2000/svg" class="muscle-body-svg" data-muscle-body-view="'+view+'" viewBox="0 0 260 564" '+
      'role="group" aria-labelledby="'+uid+'-title '+uid+'-desc" focusable="false">'+
      '<title id="'+uid+'-title">Mapa do corpo completo · '+viewLabel+'</title>'+
      '<desc id="'+uid+'-desc">Regiões musculares com volume relativo dos treinos registrados. Selecione uma região para consultar os detalhes. '+
      'Regiões hachuradas não são estimadas pelo catálogo. Os lados recebem a mesma cor porque os registros não distinguem direita e esquerda. '+
      'Localização esquemática; não mede ativação, hipertrofia ou necessidade individual de treino.</desc>'+
      '<defs><linearGradient id="'+uid+'-skin" x1="0" x2="1" y1="0" y2=".4">'+
      '<stop offset="0" stop-color="#273D50"/><stop offset=".47" stop-color="#41596C"/><stop offset="1" stop-color="#263D50"/>'+
      '</linearGradient><pattern id="'+uid+'-unmapped" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">'+
      '<rect width="7" height="7" fill="#263746"/><path d="M0 0 L0 7" stroke="#78909F" stroke-width="1" opacity=".48"/>'+
      '</pattern></defs>'+
      '<g class="muscle-body-outline" fill="url(#'+uid+'-skin)" stroke="#6D8799" stroke-width="1" stroke-linejoin="round" aria-hidden="true">'+
      path({d:arm})+path({d:arm,mirror:true})+
      '<path d="'+lowerOutline+' Z" transform="'+lowerTransform+'" stroke="none"/>'+
      '<path d="'+upperOutline+' Z" stroke="none"/>'+
      '<path d="'+lowerOutline+'" transform="'+lowerTransform+'" fill="none"/>'+
      '<path d="'+upperOutline+'" fill="none"/>'+path({d:head})+'</g>'+
      (view==='back'?unmapped('lumbar','Região lombar',lumbar):'')+
      '<g class="muscle-body-lower-neutral" transform="'+lowerTransform+'" fill="#2B4356" stroke="#627D90" stroke-width=".7" aria-hidden="true">'+
      paths(view==='back'?lowerNeutralBack:lowerNeutralFront)+'</g>'+
      renderRegions(view==='back'?upperBack:upperFront)+
      '<g transform="'+lowerTransform+'">'+renderRegions(view==='back'?lowerBack:lowerFront)+'</g>'+
      '<g class="muscle-body-contours" fill="none" stroke="#BDD1DD" stroke-width=".7" stroke-linecap="round" opacity=".32" pointer-events="none" aria-hidden="true">'+
      (view==='back'?'<path d="M116 61 Q130 66 144 61 M130 78 L130 252 M101 113 Q99 132 107 144 M159 113 Q161 132 153 144"/>':
        '<path d="M113 45 Q112 52 116 53 M147 45 Q148 52 144 53 M123 59 Q130 63 137 59 M115 77 L123 93 M145 77 L137 93 M104 98 Q119 96 127 102 M156 98 Q141 96 133 102 M130 108 L130 251"/>')+
      '<path d="M45 192 L58 196 M215 192 L202 196 M35 252 L45 255 M225 252 L215 255"/>'+
      '<g transform="'+lowerTransform+'"><path d="'+lowerContours+'"/><path d="M88 351 L104 351 M172 351 L156 351 M74 376 L103 378 M186 376 L157 378"/></g></g></svg>';
  }
  const api={VERSION:1,PALETTE,LABELS,regions,visibleIds,figure};
  root.ForjaMuscleBody=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
