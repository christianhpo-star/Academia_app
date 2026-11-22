/* FORJA transparent workout sticker; rendered entirely on device. */
(function installShareSticker(root) {
  'use strict';
  const BODY = root.ForjaMuscleBody || (typeof module !== 'undefined' && module.exports ? require('./muscle-body.js') : null);
  const WIDTH = 1080, HEIGHT = 880;
  const COLORS = Object.freeze({lime:'#C5F56B', blue:'#83BED8', white:'#F7FCFF', muted:'#D9E8F0'});
  function options(value={}) {
    return {style:['conquest','muscles','highlight'].includes(value.style) ? value.style : 'conquest',
      tone: value.tone === 'light' ? 'light' : 'dark',
      view: value.view === 'back' ? 'back' : 'front',
      phrase: String(value.phrase || 'HOJE EU FIZ A MINHA PARTE.').trim().slice(0, 66),
      showMuscles:value.showMuscles!==false, showWeek:value.showWeek!==false,
      showCardio:value.showCardio!==false, highlightMode:value.highlightMode || 'load',
      highlightKey:value.highlightKey || ''};
  }
  function choose(model,config) {
    const row = model.loadChoices?.find(item => item.key === config.highlightKey);
    if (config.highlightMode === 'load') {
      const candidate = row || model.largest;
      if (candidate) return {kicker:'MAIOR CARGA REGISTRADA',name:candidate.name,value:
        (candidate.bodyweight && candidate.load === 0 ? 'Peso do corpo' :
          Number(candidate.load).toLocaleString('pt-BR',{maximumFractionDigits:2})+' '+candidate.unit) +
        ' × '+candidate.reps+(candidate.repPerSide?' rep./lado':' rep.')};
    }
    if (config.highlightMode === 'cardio' && model.cardioTop)
      return {kicker:'CARDIO DO DIA', name:model.cardioTop.label,
        value:Number(model.cardioTop.minutes).toLocaleString('pt-BR',{maximumFractionDigits:1})+' min'+
          (model.cardioTop.pace ? ' · '+model.cardioTop.pace : '')};
    if (config.highlightMode === 'week' && model.weekDays > 0)
      return {kicker:'CONSTÂNCIA',name:'Nesta semana',value:model.weekDays+
        (model.weekDays===1?' dia com treino registrado':' dias com treino registrado')};
    return {kicker:'CONQUISTA',name:'Treino concluído',value:'Um treino de cada vez.'};
  }
  function rounded(ctx,x,y,w,h,r) {
    const t=Math.max(0,Math.min(r,w/2,h/2));
    ctx.beginPath();ctx.moveTo(x+t,y);ctx.arcTo(x+w,y,x+w,y+h,t);
    ctx.arcTo(x+w,y+h,x,y+h,t);ctx.arcTo(x,y+h,x,y,t);ctx.arcTo(x,y,x+w,y,t);ctx.closePath();
  }
  function text(ctx,str,x,y,size,color,weight='700',maxWidth=980) {
    ctx.save();ctx.font=weight+' '+size+'px system-ui, sans-serif';
    ctx.textBaseline='top';ctx.fillStyle=color;
    ctx.shadowColor='rgba(0,0,0,.60)';ctx.shadowBlur=10;ctx.shadowOffsetY=3;
    ctx.fillText(String(str),x,y,maxWidth);ctx.restore();
  }
  function wrap(ctx,str,maxWidth,size,weight='900',limit=3) {
    ctx.font=weight+' '+size+'px system-ui, sans-serif';
    const words=String(str).split(/\s+/).filter(Boolean), lines=[];
    for(const word of words) {
      let line=lines[lines.length-1]||'';
      if(line && ctx.measureText(line+' '+word).width<=maxWidth)lines[lines.length-1]=line+' '+word;
      else if(lines.length < limit) lines.push(word);
      else { lines[lines.length-1]+='…'; break; }
    }
    return lines;
  }
  function withFontSize(ctx,str,maxWidth,starting,min=29,weight='800') {
    let size=starting;
    while(size>min){ctx.font=weight+' '+size+'px system-ui, sans-serif';if(ctx.measureText(str).width<=maxWidth)break;size-=2;}
    return size;
  }
  function loadSVG(svg) {
    return new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
      img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    });
  }
  async function render(canvas,model,raw={}) {
    if(!canvas || !model)throw new Error('Prévia indisponível');
    const opt=options(raw),ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Canvas indisponível');
    canvas.width=WIDTH;canvas.height=HEIGHT;
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    const ink=opt.tone==='light'?'#12212A':COLORS.white;
    const muted=opt.tone==='light'?'#354B56':COLORS.muted;
    const panel=opt.tone==='light'?'rgba(247,251,253,.91)':'rgba(10,20,30,.86)';
    const border=opt.tone==='light'?'rgba(24,50,61,.22)':'rgba(205,230,248,.22)';
    // Outside the rounded translucent surfaces, pixels remain alpha=0.
    ctx.fillStyle=panel;rounded(ctx,32,40,1016,138,42);ctx.fill();
    ctx.strokeStyle=border;ctx.lineWidth=2;ctx.stroke();
    text(ctx,'F O R J A',80,77,43,opt.tone==='light'?'#336D43':COLORS.lime,'900');
    text(ctx,'TREINO CONCLUÍDO',722,95,23,muted,'700',290);
    ctx.fillStyle=panel;rounded(ctx,32,196,1016,652,43);ctx.fill();ctx.strokeStyle=border;ctx.stroke();
    const big=opt.style==='highlight'?55:opt.style==='muscles'?51:65;
    const lines=wrap(ctx,opt.phrase || 'MAIS UM TREINO FEITO.',925,big,'900',2);
    let y=244;for(const line of lines){text(ctx,line,80,y,big,ink,'900');y+=big+5;}
    const main=opt.showMuscles && model.hasMuscles;
    const highlight=choose(model,opt);
    if(main){
      const selected=opt.view;
      let image=null;
      try {image=await loadSVG(BODY.figure({view:selected,rows:model.regions,
        cardioRegions:opt.showCardio?model.stairRegions:[]}));} catch (_) { /* fallback */ }
      if(image){
        const h=opt.style==='muscles'?380:308;
        const w=Math.round(h*260/564),x=opt.style==='muscles'?76:80;
        const top=opt.style==='muscles'?390:408;
        ctx.drawImage(image,x,top,w,h);
      }
      const infoX=opt.style==='muscles'?308:300;
      text(ctx,'MÚSCULOS EM FOCO',infoX,414,26,opt.tone==='light'?'#336D43':COLORS.lime,'800',690);
      const names=model.mainRegions.slice(0,3).map(row=>row.label);
      let offset=0;
      for(const name of names){const s=withFontSize(ctx,name,675,40,23,'700');text(ctx,name,infoX,466+offset,s,ink,'700',680);offset+=53;}
      if(model.mapCoverageMissing?.length)text(ctx,'Mapa parcial: exercícios sem classificação.',infoX,633,20,muted,'500',665);
    } else {
      text(ctx,'TREINO DO DIA',80,420,30,opt.tone==='light'?'#336D43':COLORS.lime,'800');
      text(ctx,'Cada sessão conta.',80,468,49,ink,'800');
    }
    const blockY=696;
    ctx.fillStyle=opt.tone==='light'?'rgba(21,49,60,.10)':'rgba(44,65,80,.62)';
    rounded(ctx,60,blockY,960,132,26);ctx.fill();
    text(ctx,highlight.kicker,92,blockY+15,20,opt.tone==='light'?'#336D43':COLORS.lime,'800',820);
    text(ctx,highlight.name,92,blockY+42,withFontSize(ctx,highlight.name,890,37,22,'700'),ink,'700',890);
    text(ctx,highlight.value,92,blockY+84,withFontSize(ctx,highlight.value,890,32,22,'900'),ink,'900',890);
    if(opt.showWeek && model.weekDays>0 && opt.highlightMode!=='week') {
      text(ctx,model.weekDays+' dia'+(model.weekDays===1?'':'s')+' com treino registrado nesta semana',80,659,20,muted,'600',915);
    } else if(opt.showCardio && model.cardioTop && opt.highlightMode!=='cardio') {
      text(ctx,model.cardioTop.label+' · '+model.cardioTop.minutes+' min',80,659,20,muted,'600',915);
    }
    return canvas;
  }
  function blob(canvas) {
    return new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Falha ao gerar PNG')),'image/png'));
  }
  const filename=model=>'forja-conquista-'+(/^\d{4}-\d{2}-\d{2}$/.test(model?.day||'')?model.day:'treino')+'.png';
  const api=Object.freeze({WIDTH,HEIGHT,options,choose,render,blob,filename});
  root.ForjaShareSticker=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
