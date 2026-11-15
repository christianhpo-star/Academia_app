/* FORJA MOVE: optional local videos; user supplies media they are allowed to use.
 * The app NEVER uploads the user's videos. Files stay in this browser's IndexedDB.
 */
(function installExerciseVideo(root) {
  'use strict';
  const DB_NAME='forja.exercise.video.v1', STORE='clips', LIMIT=48*1024*1024;
  const idPattern=/^[a-z][a-z0-9-]{2,79}$/;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourcePattern=/^https:\/\/fitlapse\.com\/en\/exercise\/[a-z0-9-]+\/$/;
  let dialog=null,selected='',currentUrl=null,generation=0;
  function validateFile(file){
    if(!file||typeof file.name!=='string'||!Number.isFinite(file.size))return 'Selecione um arquivo MP4 ou WebM.';
    const ext=file.name.toLowerCase().match(/\.(mp4|webm)$/)?.[1]||'';
    if(!ext||!['','video/mp4','video/webm'].includes(file.type||'')||
      (file.type==='video/mp4'&&ext!=='mp4')||
      (file.type==='video/webm'&&ext!=='webm'))
      return 'Formato não aceito. Use MP4 ou WebM.';
    if(file.size<1024)return 'O arquivo parece vazio ou inválido.';
    if(file.size>LIMIT)return 'O vídeo excede o limite de 48 MB. Comprima-o antes de adicionar.';
    return null;
  }
  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!root.indexedDB){reject(new Error('Armazenamento offline indisponível neste contexto.'));return;}
      let request;
      try{request=root.indexedDB.open(DB_NAME,1)}catch(e){reject(e);return;}
      request.onupgradeneeded=()=>{
        if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'id'});
      };
      request.onerror=()=>reject(request.error||new Error('Erro ao abrir armazenamento.'));
      request.onsuccess=()=>resolve(request.result);
      request.onblocked=()=>reject(new Error('Feche outras abas do FORJA antes de continuar.'));
    });
  }
  async function transact(kind,id,record){
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      let tx,request;
      try{
        tx=db.transaction(STORE,kind==='read'?'readonly':'readwrite');
        const store=tx.objectStore(STORE);
        request=kind==='read'?store.get(id):kind==='delete'?store.delete(id):store.put(record);
        tx.oncomplete=()=>{db.close();resolve(kind==='read'?request.result:null);};
        tx.onerror=()=>{const e=tx.error||new Error('Erro ao salvar mídia.');db.close();reject(e);};
        tx.onabort=()=>{const e=tx.error||new Error('Armazenamento interrompido.');db.close();reject(e);};
      }catch(e){db.close();reject(e);}
    });
  }
  function resetPlayer(){
    if(!dialog)return;
    const video=dialog.querySelector('video');
    if(video){video.pause();video.removeAttribute('src');video.load();}
    if(currentUrl){root.URL.revokeObjectURL(currentUrl);currentUrl=null;}
  }
  function status(text,error=false){
    const el=dialog?.querySelector('#exercise-video-status');
    if(el){el.textContent=text;el.dataset.error=error?'true':'false';}
  }
  function renderPlayer(record){
    if(!dialog)return;
    const preview=dialog.querySelector('#exercise-video-preview');
    resetPlayer();
    if(!record?.blob){
      preview.innerHTML='<div class="exercise-video-empty"><strong>Nenhum vídeo salvo para este exercício.</strong><p>Você pode consultar a referência 3D externa ou usar um MP4/WebM autorizado, armazenado somente neste dispositivo.</p></div>';
      const remove=dialog.querySelector('[data-video-action="remove"]');
      if(remove)remove.hidden=true;
      return;
    }
    if(!root.URL?.createObjectURL){status('Este navegador não consegue reproduzir arquivos locais.',true);return;}
    currentUrl=root.URL.createObjectURL(record.blob);
    preview.innerHTML='<video controls loop playsinline preload="metadata" aria-label="Vídeo demonstrativo escolhido pelo usuário"></video>';
    const video=preview.querySelector('video');
    video.src=currentUrl;
    video.addEventListener('error',()=>status('Não foi possível reproduzir este arquivo. Confira o formato MP4/WebM.',true),{once:true});
    const remove=dialog.querySelector('[data-video-action="remove"]');
    if(remove)remove.hidden=false;
    status('Vídeo disponível neste dispositivo: '+(record.name||'demonstração pessoal'));
  }
  function close(){
    if(!dialog)return;
    generation++;
    resetPlayer();
    if(dialog.open&&typeof dialog.close==='function')dialog.close();
    else dialog.removeAttribute('open');
    selected='';
  }
  async function addFile(file){
    const error=validateFile(file);
    if(error){status(error,true);return false;}
    if(!idPattern.test(selected)){status('Exercício não identificado.',true);return false;}
    const token=generation,id=selected;
    status('Salvando vídeo somente neste dispositivo...');
    try{
      const record={id,blob:file,name:file.name,addedAt:Date.now(),mime:file.type||'video/mp4'};
      await transact('write',id,record);
      if(token!==generation||!dialog?.open)return true;
      renderPlayer(record);
      return true;
    }catch(e){if(token===generation)status('Não foi possível salvar: '+(e.message||'erro de armazenamento'),true);return false;}
  }
  async function removeFile(){
    if(!selected)return;
    const id=selected,token=generation;
    try{
      await transact('delete',id);
      if(token===generation){renderPlayer(null);status('Vídeo removido deste dispositivo.');}
    }catch(e){if(token===generation)status('Não foi possível remover o vídeo.',true);}
  }
  function setup(){
    if(!root.document)return null;
    const element=root.document.getElementById('exercise-video-dialog');
    if(!element)return null;
    if(dialog===element)return dialog;
    dialog=element;
    dialog.addEventListener('click',event=>{
      const button=event.target.closest('[data-video-action]');
      if(!button)return;
      const action=button.dataset.videoAction;
      if(action==='close')close();
      if(action==='choose')dialog.querySelector('#exercise-video-picker')?.click();
      if(action==='remove')removeFile();
    });
    dialog.addEventListener('change',event=>{
      if(event.target.id!=='exercise-video-picker')return;
      const file=event.target.files?.[0];
      if(file)addFile(file);
      event.target.value='';
    });
    dialog.addEventListener('close',()=>{if(dialog.open)return;generation++;resetPlayer();selected='';});
    return dialog;
  }
  async function open(id,name,ref){
    if(!idPattern.test(id))return false;
    const node=setup();
    if(!node)return false;
    close();
    selected=id;
    const token=++generation;
    const source=ref&&sourcePattern.test(ref.url)?ref.url:null;
    node.innerHTML='<div class="exercise-video-sheet">'+
      '<div class="exercise-video-header"><div><p class="section-eyebrow">FORJA MOVE · VÍDEOS 3D</p><h2 id="exercise-video-title">'+esc(name)+'</h2></div>'+
      '<button type="button" class="secondary" data-video-action="close" aria-label="Fechar demonstração">Fechar</button></div>'+
      '<p class="exercise-video-subtitle">Assista a um vídeo 3D que corresponda ao equipamento e à variação selecionados.</p>'+
      '<div id="exercise-video-preview"></div>'+
      '<p id="exercise-video-status" class="exercise-video-status" role="status" aria-live="polite">Verificando vídeos salvos...</p>'+
      '<div class="exercise-video-actions">'+
      (source?'<a class="forja-ref3d-link" href="'+source+'" target="_blank" rel="noopener noreferrer">Abrir referência 3D no Fitlapse ↗</a>':'')+
      '<button type="button" class="secondary" data-video-action="choose">Adicionar vídeo local MP4/WebM</button>'+
      '<button type="button" class="secondary" data-video-action="remove" hidden>Remover vídeo salvo</button>'+
      '</div>'+
      '<input id="exercise-video-picker" type="file" accept=".mp4,.webm,video/mp4,video/webm" hidden />'+
      '<p class="exercise-video-legal">Use somente arquivos que você tem autorização para utilizar. O vídeo fica neste navegador, não é enviado ao FORJA e pode ocupar armazenamento no celular. Esta demonstração não substitui orientação profissional.</p>'+
      '</div>';
    if(typeof node.showModal==='function')node.showModal();
    else node.setAttribute('open','');
    renderPlayer(null);
    status('Verificando vídeos salvos neste dispositivo...');
    try{
      const media=await transact('read',id);
      if(token!==generation||!node.open)return true;
      renderPlayer(media||null);
      if(!media)status(source?'Referência externa disponível. Para usar offline, adicione um vídeo autorizado.':'Ainda não há uma demonstração local verificada.');
    }catch(e){
      if(token===generation)status('Armazenamento de vídeos indisponível neste contexto. A referência externa continua acessível.',true);
    }
    return true;
  }
  const api=Object.freeze({open,close,validateFile,maximumBytes:LIMIT,storageName:DB_NAME});
  root.ForjaExerciseVideos=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
